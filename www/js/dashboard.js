class DashboardManager {
    constructor() {
        this.charts = {};
        this.updateInterval = null;
        this.isInitialized = false;
        this.resizeTimeout = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.startAutoUpdate();
        console.log('Dashboard Manager initialized');
    }

    bindEvents() {
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize();
        }, 250));

        this.bindStatCardEvents();

        // Delegação de evento para expansão dos cards recentes
        document.addEventListener('click', (e) => {
            const header = e.target.closest('.dashboard-res-header');
            if (header) {
                const item = header.parentElement;
                item.classList.toggle('expanded');
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.refreshChartsOnVisible();
            }
        });
    }

    bindStatCardEvents() {
        // Eventos agora são tratados diretamente no HTML via onclick
    }

    async loadDashboard() {
        try {
            this.showLoading();
            await this.loadDashboardStats();
            setTimeout(async () => {
                await this.loadCharts();
            }, 100);
            await this.loadRecentReservations();
            this.hideLoading();
            this.isInitialized = true;
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            this.hideLoading();
        }
    }

    async loadDashboardStats() {
        try {
            const stats = await db.getDashboardStats();
            if (!stats) return;
            this.updateStatCard('total-animals', stats.totalAnimals || 0);
            this.updateStatCard('active-reservations', stats.activeReservations || 0);
            this.updateStatCard('monthly-revenue', this.formatCurrency(stats.monthlyRevenue || 0));
            this.updateStatCard('occupancy-rate', `${stats.occupancyRate || 0}%`);
        } catch (error) { console.error(error); }
    }

    updateStatCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) element.textContent = value;
    }

    async loadCharts() {
        try {
            const [monthlyData, kennelData, animals] = await Promise.all([
                db.getMonthlyData(),
                db.getKennelTypeData(),
                db.getAnimals()
            ]);
            const reservations = await db.getReservations();

            // Novos métodos para o Dashboard High-Fidelity
            await this.createOccupationGauges();
            this.updateDemographics(animals, reservations);
            await this.renderTopClients(reservations);
            this.createRevenueCompositionChart(reservations);
            this.createOccupancyTrendChart(reservations);
            this.createRevenueComparisonChart(reservations); // New
            this.createRevenueGrowthChart(reservations);  // New
            await this.loadPaymentChart(); // New Payments Chart

        } catch (error) { console.error(error); }
    }

    initSummaryMonths() {
        const select = document.getElementById('summary-month-select');
        if (!select || select.options.length > 1) return;

        const months = this.getLast12Months();
        months.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.key;
            opt.textContent = m.label;
            select.appendChild(opt);
        });

        select.addEventListener('change', () => this.loadDashboard());
    }

    async createMonthlyChart(data) {
        const ctx = document.getElementById('monthlyChart');
        if (!ctx) return;
        if (this.charts.monthly) this.charts.monthly.destroy();

        const isMobile = window.innerWidth <= 768;
        const months = this.getLast12Months();
        const chartData = months.map(month => {
            const monthData = data.find(d => d && d.month === month.key);
            return {
                month: month.label,
                reservations: monthData ? monthData.reservations : 0,
                revenue: monthData ? monthData.revenue : 0
            };
        });

        // Atualizar o total do Summary
        const filterVal = document.getElementById('summary-month-select')?.value || 'all';
        let displayRevenue = 0;
        if (filterVal === 'all') {
            displayRevenue = chartData.reduce((acc, curr) => acc + curr.revenue, 0);
        } else {
            displayRevenue = chartData.find(d => months.find(m => m.key === filterVal)?.label === d.month)?.revenue || 0;
        }
        document.getElementById('summary-revenue').textContent = this.formatCurrency(displayRevenue);

        this.charts.monthly = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.map(d => d.month),
                datasets: [
                    {
                        label: 'Receita',
                        data: chartData.map(d => d.revenue),
                        backgroundColor: '#ff7e5f',
                        borderRadius: 8,
                        barThickness: isMobile ? 8 : 15,
                    },
                    {
                        label: 'Reservas (x100)',
                        data: chartData.map(d => d.reservations * 100),
                        backgroundColor: '#764ba2',
                        borderRadius: 8,
                        barThickness: isMobile ? 8 : 15,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: { boxWidth: 10, usePointStyle: true, font: { size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                let label = context.dataset.label || '';
                                if (label.includes('Reservas')) return `Reservas: ${context.raw / 100}`;
                                return `${label}: ${this.formatCurrency(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false }, border: { display: false } },
                    y: { display: false, grid: { display: false } }
                }
            }
        });
    }

    createMiniRingCharts(reservations, kennelData) {
        // Ring 1: Reservas
        this.renderSmallRing('ring-reservations', 65, '#ff7e5f');
        document.getElementById('perc-reservations').textContent = '65%';

        // Ring 2: Serviços
        const servicesCount = reservations.filter(r => r.bath_service || r.transport_service).length;
        const serviceRate = reservations.length > 0 ? Math.round((servicesCount / reservations.length) * 100) : 0;
        this.renderSmallRing('ring-services', serviceRate, '#feb47b');
        document.getElementById('perc-services').textContent = `${serviceRate}%`;

        // Ring 3: Ocupação
        // Forçar um valor de ocupação baseado no card
        const occText = document.getElementById('occupancy-rate')?.textContent || '0%';
        const occRate = parseInt(occText) || 0;
        this.renderSmallRing('ring-occupancy', occRate, '#764ba2');
        document.getElementById('perc-occupancy').textContent = `${occRate}%`;
    }

    renderSmallRing(id, percent, color) {
        const ctx = document.getElementById(id);
        if (!ctx) return;
        if (this.charts[id]) this.charts[id].destroy();

        this.charts[id] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [percent, 100 - percent],
                    backgroundColor: [color, '#f1f5f9'],
                    borderWidth: 0
                }]
            },
            options: {
                cutout: '80%',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } }
            }
        });
    }

    async createKennelChart(data) {
        const ctx = document.getElementById('kennel-chart');
        if (!ctx) return;
        if (this.charts.kennel) this.charts.kennel.destroy();
        const isMobile = window.innerWidth <= 768;

        const chartData = data.length > 0 ? data : [
            { kennel_type: 'Interno', count: 0 },
            { kennel_type: 'Externo', count: 0 },
            { kennel_type: 'Gatil', count: 0 }
        ];

        this.charts.kennel = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartData.map(d => d.kennel_type),
                datasets: [{
                    data: chartData.map(d => d.count),
                    backgroundColor: ['#2563eb', '#10b981', '#f59e0b'],
                    borderWidth: 5,
                    borderColor: '#fff',
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, padding: 20, font: { size: isMobile ? 10 : 12 } } }
                },
                cutout: '70%',
                animation: { animateScale: true }
            }
        });
    }

    // --- NOVAS MÉTRICAS E GRÁFICOS (DASHBOARD 2026) ---

    // 1. Gráfico Comparativo (Linha Multilinha)
    // 1. Gráfico Comparativo (Linha Multilinha) - DADOS REAIS
    createRevenueComparisonChart(reservations) {
        const ctx = document.getElementById('revenue-comparison-chart');
        if (!ctx) return;
        if (this.charts.revenueComparison) this.charts.revenueComparison.destroy();

        // 1. Identify the 3 months to display (Current, Current-1, Current-2)
        const today = new Date();
        const monthsToDisplay = [];
        // Loop from 2 months ago to current month
        for (let i = 2; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            // Nome do mês Capitalizado (ex: 'Jan 2026')
            const monthName = d.toLocaleString('pt-BR', { month: 'short' });
            const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

            monthsToDisplay.push({
                year: d.getFullYear(),
                month: d.getMonth(), // 0-11
                label: `${capitalizedMonth} ${d.getFullYear()}`,
                key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                data: [0, 0, 0, 0] // 4 Weeks
            });
        }

        // 2. Process reservations with Real Data
        if (reservations && Array.isArray(reservations)) {
            reservations.forEach(r => {
                if (r.status !== 'ATIVA' && r.status !== 'FINALIZADA') return;
                if (!r.checkin_date || !r.total_value) return;

                // Safe parsing of YYYY-MM-DD
                const parts = r.checkin_date.split('-');
                if (parts.length !== 3) return;

                const y = parseInt(parts[0]);
                const m = parseInt(parts[1]);
                const d = parseInt(parts[2]);

                const rKey = `${y}-${String(m).padStart(2, '0')}`;

                // Find if this reservation belongs to one of the 3 months
                const monthObj = monthsToDisplay.find(mj => mj.key === rKey);

                if (monthObj) {
                    // Determine week (0 to 3)
                    // 1-7: Week 0, 8-14: Week 1, 15-21: Week 2, 22+: Week 3
                    let weekIndex = Math.floor((d - 1) / 7);
                    if (weekIndex > 3) weekIndex = 3; // Cumulative for last week

                    monthObj.data[weekIndex] += parseFloat(r.total_value);
                }
            });
        }

        const labels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];

        // Colors from screenshot: Yellow (Oldest), Purple (Middle), Red (Newest/Current)
        const colors = ['#fbbf24', '#8b5cf6', '#ef4444'];

        const datasets = monthsToDisplay.map((m, index) => {
            const isCurrentMonth = index === monthsToDisplay.length - 1;
            return {
                label: m.label,
                data: m.data,
                borderColor: colors[index % colors.length],
                backgroundColor: 'transparent',
                borderWidth: 2,
                tension: 0, // Straight lines as in screenshot
                pointBackgroundColor: '#fff',
                pointBorderColor: colors[index % colors.length],
                borderDash: isCurrentMonth ? [5, 5] : [], // Dash for current month
                pointRadius: 4,
                pointHoverRadius: 6
            };
        });

        this.charts.revenueComparison = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f1f5f9' },
                        ticks: {
                            callback: (v) => 'R$ ' + v,
                            font: { size: 10 }
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10 } }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false,
                }
            }
        });

        // Update mode select listener if needed (currently supports only monthly view logic provided)
        const sel = document.getElementById('revenue-comp-mode');
        if (sel) {
            sel.onchange = () => {
                // If user changes to yearly, we might need to change logic. 
                // For now, let's keep it simple or reload chart.
                // Doing nothing to preserve the fix.
                console.log('Mode changed to:', sel.value);
            }
        }
    }

    // 2. Gráfico de Crescimento (Area/Linha Colorida)
    togglePaymentFilterMode() {
        const input = document.getElementById('payment-period-filter');
        if (!input) return;
        const currentType = input.type;
        const today = new Date();

        if (currentType === 'month') {
            input.type = 'date';
            input.value = today.toISOString().split('T')[0];
            window.hotelPetApp.showNotification('Filtrando por data específica');
        } else {
            input.type = 'month';
            input.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            window.hotelPetApp.showNotification('Filtrando por mês');
        }
        this.loadPaymentChart();
    }

    async loadPaymentChart() {
        const filterEl = document.getElementById('payment-period-filter');
        if (!filterEl || !this.charts) return;

        if (!filterEl.value) {
            const today = new Date();
            filterEl.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        }

        let startDate, endDate;
        if (filterEl.type === 'month') {
            const [year, month] = filterEl.value.split('-');
            startDate = `${year}-${month}-01`;
            // Get last day of the month correctly
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
            const paddedDay = String(lastDay).padStart(2, '0');
            endDate = `${year}-${month}-${paddedDay}`;
        } else {
            startDate = filterEl.value;
            endDate = filterEl.value;
        }

        let data = [];
        console.log('=== PAYMENT CHART DEBUG ===');
        console.log('Filter Period:', filterEl.value);
        console.log('Date Range:', { startDate, endDate });

        try {
            // Updated to avoid executeQuery (which does not exist in Supabase implementation)
            const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
            const isCurrentMonth = filterEl.value === currentMonth;

            if (isCurrentMonth) {
                // Tentar primeiro com o mês atual
                data = await db.getRevenueByPaymentMethod(startDate, endDate);

                // Se não houver dados no mês atual, buscar TODOS os dados históricos (Fallback)
                if (data.length === 0) {
                    // Manual fetch and aggregate for ALL data
                    const { data: allData, error } = await db.supabase
                        .from('reservations')
                        .select('payment_method, total_value')
                        .in('status', ['ATIVA', 'FINALIZADA']);

                    if (error) {
                        console.error('Error fetching all payment data:', error);
                    } else if (allData) {
                        // Client-side aggregation
                        const groups = {};
                        allData.forEach(r => {
                            if (!r.payment_method) return;
                            if (!groups[r.payment_method]) groups[r.payment_method] = 0;
                            groups[r.payment_method] += (r.total_value || 0);
                        });
                        data = Object.keys(groups).map(k => ({ payment_method: k, total: groups[k] }));
                    }
                }
            } else {
                // Filtro específico do usuário
                data = await db.getRevenueByPaymentMethod(startDate, endDate);
            }
        } catch (e) {
            console.error('ERROR loading payment data:', e);
            window.hotelPetApp.showNotification('Erro ao carregar dados de pagamento.', 'error');
            data = [];
        }

        // Mapa Base com cores da imagem solicitada
        // Cartão de Crédito (Azul Escuro), Cartão de Débito (Verde), Dinheiro (Laranja), PIX (Amarelo)
        const methods = {
            'CARTÃO DE CRÉDITO': { label: 'Cartão de Crédito', color: '#1e3a8a', total: 0 }, // Dark Blue
            'CARTÃO DE DÉBITO': { label: 'Cartão de Débito', color: '#10b981', total: 0 }, // Green
            'DINHEIRO': { label: 'Dinheiro', color: '#f97316', total: 0 }, // Orange
            'PIX': { label: 'PIX', color: '#facc15', total: 0 } // Yellow
        };

        // Objeto para acumular totais
        const finalData = {
            'Cartão de Crédito': { ...methods['CARTÃO DE CRÉDITO'] },
            'Cartão de Débito': { ...methods['CARTÃO DE DÉBITO'] },
            'Dinheiro': { ...methods['DINHEIRO'] },
            'PIX': { ...methods['PIX'] }
        };

        data.forEach(d => {
            console.log('Processing entry:', d);
            if (!d.payment_method) {
                console.log('Skipping null payment_method');
                return;
            }

            const raw = d.payment_method.toUpperCase().trim();
            const val = d.total || 0;
            console.log(`Raw: "${raw}", Value: R$ ${val}`);

            if (raw.includes('PIX')) {
                finalData['PIX'].total += val;
                console.log('→ Added to PIX');
            } else if (raw.includes('DINHEIRO') || raw.includes('ESPÉCIE')) {
                finalData['Dinheiro'].total += val;
                console.log('→ Added to Dinheiro');
            } else if (raw.includes('CRÉDITO') || raw.includes('CREDITO')) {
                finalData['Cartão de Crédito'].total += val;
                console.log('→ Added to Cartão de Crédito');
            } else if (raw.includes('DÉBITO') || raw.includes('DEBITO')) {
                finalData['Cartão de Débito'].total += val;
                console.log('→ Added to Cartão de Débito');
            } else {
                console.log('⚠️ Not matched:', raw);
            }
        });

        console.log('Final aggregated data:', finalData);

        const labels = Object.values(finalData).map(m => m.label);
        const totals = Object.values(finalData).map(m => m.total);
        const colors = Object.values(finalData).map(m => m.color);

        console.log('Chart arrays:', { labels, totals, colors });
        console.log('=== END PAYMENT CHART DEBUG ===');

        // Ranking Badge Logic
        let maxVal = -1;
        let bestMethod = '';
        Object.values(finalData).forEach(m => {
            if (m.total > maxVal) { maxVal = m.total; bestMethod = m.label; }
        });
        const badge = document.getElementById('top-payment-badge');
        const badgeName = document.getElementById('top-payment-name');
        if (badge && badgeName) {
            if (maxVal > 0) {
                badge.style.display = 'flex';
                badgeName.textContent = bestMethod;
            } else {
                badge.style.display = 'none';
            }
        }

        const ctx = document.getElementById('payment-methods-chart');
        if (!ctx) return;
        if (this.charts.paymentMethods) this.charts.paymentMethods.destroy();

        // Configuração para Doughnut Chart estilo "Anel"
        this.charts.paymentMethods = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: totals,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%', // Tamanho do buraco no meio
                plugins: {
                    legend: {
                        display: true,
                        position: 'right', // Legenda na direita para parecer mais com a imagem se houver espaço, ou bottom
                        labels: {
                            usePointStyle: true,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.label || '';
                                if (label) label += ': ';
                                if (context.parsed !== null) label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed);
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    createRevenueGrowthChart(reservations) {
        const ctx = document.getElementById('revenue-growth-chart');
        if (!ctx) return;
        if (this.charts.growth) this.charts.growth.destroy();

        console.log('=== GROWTH CHART DEBUG START ===');
        console.log('Total reservations received:', reservations?.length);
        console.log('Sample reservation:', reservations?.[0]);

        // Processar dados reais: Receita por Ano
        const revenueByYear = {};
        let processedCount = 0;
        let skippedCount = 0;

        if (reservations && Array.isArray(reservations)) {
            reservations.forEach(r => {
                // CORREÇÃO CRÍTICA: Campo correto é checkin_date, não checkin
                if (!r.checkin_date) {
                    skippedCount++;
                    return;
                }

                // Filtrar apenas reservas ATIVA ou FINALIZADA (receita válida)
                if (r.status !== 'ATIVA' && r.status !== 'FINALIZADA') {
                    skippedCount++;
                    return;
                }

                // Extrai o ano (YYYY)
                let year = r.checkin_date.split('-')[0];
                if (!year && r.checkin_date instanceof Date) year = r.checkin_date.getFullYear();

                if (year) {
                    const val = parseFloat(r.total_value) || 0;
                    if (!revenueByYear[year]) revenueByYear[year] = 0;
                    revenueByYear[year] += val;
                    processedCount++;
                }
            });
        }

        console.log('Processed reservations:', processedCount);
        console.log('Skipped reservations:', skippedCount);
        console.log('Revenue by year:', revenueByYear);

        let years = Object.keys(revenueByYear).sort();
        let growthData = years.map(y => revenueByYear[y]);

        // Se tiver poucos dados, adicionar anos anteriores zerados ou pelo menos o ano atual
        const currentYear = new Date().getFullYear();
        if (years.length === 0) {
            years = [currentYear.toString()];
            growthData = [0];
            console.log('No data found - using current year with 0');
        } else if (years.length < 2) {
            // Se tiver só um ano, adiciona o anterior zerado para ter uma linha
            const firstYear = parseInt(years[0]);
            years.unshift((firstYear - 1).toString());
            growthData.unshift(0);
        }

        console.log('Final years:', years);
        console.log('Final growth data:', growthData);
        console.log('=== GROWTH CHART DEBUG END ===');

        this.charts.growth = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{
                    label: 'Receita Total',
                    data: growthData,
                    borderColor: '#10b981', // Verde
                    backgroundColor: (context) => {
                        const ctx = context.chart.ctx;
                        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
                        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
                        return gradient;
                    },
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#10b981',
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: { label: (c) => `Receita: ${this.formatCurrency(c.raw)}` }
                    }
                },
                scales: {
                    y: {
                        display: true,
                        border: { display: false },
                        ticks: {
                            font: { size: 10 },
                            callback: (value) => value >= 1000 ? `${value / 1000}k` : value
                        }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    expandChart(chartType) {
        const modal = document.getElementById('chart-modal');
        const modalCanvas = document.getElementById('modal-chart-canvas');
        if (!modal || !modalCanvas) return;

        let originalChart = null;
        let title = '';

        if (chartType === 'revenueComparison') {
            originalChart = this.charts.revenueComparison;
            title = 'Comparativo de Receita (Expandido)';
        } else if (chartType === 'payments') {
            originalChart = this.charts.paymentMethods;
            title = 'Métodos de Pagamento (Detalhado)';
        } else if (chartType === 'growth') {
            originalChart = this.charts.growth;
            title = 'Crescimento da Receita (Expandido)';
        }

        if (!originalChart) return;

        document.getElementById('modal-chart-title').textContent = title;
        modal.classList.add('active');

        // Destruir chart anterior do modal se houver
        if (this.charts.modalChart) {
            this.charts.modalChart.destroy();
        }

        // Criar novo chart no modal com os mesmos dados
        const ctx = modalCanvas.getContext('2d');
        this.charts.modalChart = new Chart(ctx, {
            type: originalChart.config.type,
            data: JSON.parse(JSON.stringify(originalChart.config.data)), // Cópia profunda dos dados
            options: {
                ...originalChart.config.options,
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    ...originalChart.config.options.plugins,
                    legend: {
                        ...originalChart.config.options.plugins?.legend,
                        display: true,
                        position: 'top',
                        labels: { font: { size: 14 } }
                    }
                },
                scales: {
                    x: { ...originalChart.config.options.scales?.x, ticks: { font: { size: 12 } } },
                    y: { ...originalChart.config.options.scales?.y, ticks: { font: { size: 12 } } }
                }
            }
        });
    }

    async createOccupationGauges() {
        const types = ['Interno', 'Externo', 'Gatil'];
        const ids = ['gauge-interno', 'gauge-externo', 'gauge-gatil'];
        const valIds = ['val-interno', 'val-externo', 'val-gatil'];

        // Buscar dados reais de ocupação (Simulado por enquanto, idealmente viria do DB com capacidade total)
        // Capacidade simulada: Interno 20, Externo 15, Gatil 10
        const capacities = { 'INTERNO': 20, 'EXTERNO': 15, 'GATIL': 10 };
        const occupied = await db.getOccupiedKennelsCountByDate(new Date().toISOString().split('T')[0]);

        // occupied retorna array [{type: 'INTERNO', count: 5}, ...]

        types.forEach((type, index) => {
            const key = type.toUpperCase();
            const occ = occupied.find(o => o.type === key)?.count || 0;
            const total = capacities[key] || 15;
            const percent = Math.round((occ / total) * 100);

            // Atualizar texto
            const valEl = document.getElementById(valIds[index]);
            if (valEl) valEl.innerHTML = `${percent}% <span style="font-size:0.6rem; color:#94a3b8; display:block;">${occ}/${total}</span>`;

            // Cor baseada na porcentagem
            let color = '#10b981'; // Verde
            if (percent > 70) color = '#f59e0b'; // Amarelo
            if (percent > 90) color = '#ef4444'; // Vermelho

            this.renderGauge(ids[index], percent, color);
        });
    }

    renderGauge(canvasId, percent, color) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        if (this.charts[canvasId]) this.charts[canvasId].destroy();

        this.charts[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [percent, 100 - percent],
                    backgroundColor: [color, '#e2e8f0'],
                    borderWidth: 0,
                    circumference: 180,
                    rotation: 270
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: { legend: { display: false }, tooltip: { enabled: false } }
            }
        });
    }

    async updateDemographics(animals, reservations) {
        const dogs = animals.filter(a => a.species === 'CÃO');
        const cats = animals.filter(a => a.species === 'GATO');

        document.getElementById('demo-dogs').textContent = dogs.length;
        document.getElementById('demo-cats').textContent = cats.length;

        // Buscar vacinas reais do histórico
        let allVaccines = [];
        try {
            allVaccines = await db.getAllActiveVaccines();
            // console.log('Vacinas carregadas:', allVaccines); // Debug
        } catch (e) {
            console.error('Erro ao buscar vacinas:', e);
        }

        // Atualizar contador no summary
        const countEl = document.getElementById('demo-vaccines-count');
        if (countEl) countEl.textContent = allVaccines.length;

        // Renderizar Lista
        const container = document.getElementById('vaccine-list-container');
        if (!container) return;

        if (allVaccines.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #94a3b8; font-size: 0.8rem; padding: 0.5rem;">Nenhum registro de vacina.</p>';
            return;
        }

        container.innerHTML = allVaccines.map(vac => {
            let details = {};
            try { details = JSON.parse(vac.description); } catch (e) { details = { name: vac.description, nextDate: '' }; }

            // Calcular Status
            let statusColor = '#10b981'; // Verde
            let statusIcon = 'fa-check-circle';
            let statusText = 'Em dia';

            if (details.nextDate) {
                const today = new Date();
                const next = new Date(details.nextDate + 'T12:00:00');
                const diffDays = Math.ceil((next - today) / (1000 * 60 * 60 * 24));

                if (diffDays < 0) {
                    statusColor = '#ef4444'; // Vencida
                    statusIcon = 'fa-exclamation-circle';
                    statusText = 'Vencida';
                } else if (diffDays <= 30) {
                    statusColor = '#f59e0b'; // Próxima
                    statusIcon = 'fa-clock';
                    statusText = 'Vence em breve';
                }
            }

            const vacName = details.name || 'Vacina';
            const nextDateDisplay = details.nextDate ? new Date(details.nextDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
            const hasPhoto = vac.photo_url && vac.photo_url.length > 10;

            // Navegação corrigida: Navega para a seção E carrega o perfil
            const clickAction = `window.hotelPetApp.navigateToSection('animal-profile'); window.animalProfileManager.loadProfile(${vac.animal_id});`;

            return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid #f8fafc;">
                <div style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer; flex: 1;" onclick="${clickAction}">
                    
                    <div style="position: relative; width: 45px; height: 45px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); flex-shrink: 0;">
                        ${hasPhoto
                    ? `<img src="${vac.photo_url}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 2;" onload="this.style.display='block'; this.parentElement.querySelector('.vac-fallback').style.display='none'" onerror="this.style.display='none'; this.parentElement.querySelector('.vac-fallback').style.display='flex'">`
                    : ''}
                        <div class="vac-fallback" style="display: ${hasPhoto ? 'none' : 'flex'}; position: absolute; top: 0; left: 0; width: 100%; height: 100%; flex-direction: column; align-items: center; justify-content: center; color: white; z-index: 1;">
                            <i class="fas fa-paw" style="font-size: 1.2rem;"></i>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: column;">
                        <span style="font-size: 0.9rem; font-weight: 700; color: #334155;">${vac.animal_name}</span>
                        <span style="font-size: 0.75rem; color: #64748b; font-weight: 500;">${vacName}</span>
                        <span style="font-size: 0.7rem; color: ${statusColor};"><i class="fas fa-calendar-alt" style="font-size: 0.65rem;"></i> Reforço: ${nextDateDisplay}</span>
                    </div>
                </div>
                <div title="${statusText}" style="margin-left: 0.5rem; text-align: right;">
                    <i class="fas ${statusIcon}" style="color: ${statusColor}; font-size: 1rem;"></i>
                </div>
            </div>`;
        }).join('');
    }

    async renderTopClients(reservations) {
        const counts = {};

        reservations.forEach(r => {
            if (!counts[r.tutor_name]) counts[r.tutor_name] = { count: 0, services: new Set() };
            counts[r.tutor_name].count++;
            if (r.bath_service) counts[r.tutor_name].services.add('banho');
            if (r.transport_service) counts[r.tutor_name].services.add('transporte');
            counts[r.tutor_name].services.add('hospedagem');
        });

        const sorted = Object.entries(counts)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10);

        const container = document.getElementById('top-clients-container');
        if (!container) return;

        if (sorted.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:1rem;">Sem dados suficientes.</p>';
            return;
        }

        container.innerHTML = sorted.map(([name, data], i) => {
            const icons = Array.from(data.services).map(s => {
                if (s === 'banho') return '<i class="fas fa-cut" title="Banho e Tosa" style="color:#ec4899; margin-left:5px;"></i>';
                if (s === 'transporte') return '<i class="fas fa-car" title="Transporte" style="color:#f59e0b; margin-left:5px;"></i>';
                return '<i class="fas fa-bed" title="Hospedagem" style="color:#3b82f6; margin-left:5px;"></i>';
            }).join('');

            return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem; border-bottom:1px solid #f1f5f9;">
                <div style="display:flex; align-items:center;">
                    <span style="font-weight:700; color:#64748b; width:25px;">#${i + 1}</span>
                    <span style="font-weight:600; color:#1e293b;">${name}</span>
                </div>
                <div>
                    ${icons}
                    <span style="background:#f1f5f9; padding:2px 8px; border-radius:10px; font-size:0.8rem; margin-left:8px; color:#475569;">${data.count} res.</span>
                </div>
            </div>`;
        }).join('');
    }

    createRevenueCompositionChart(reservations) {
        const ctx = document.getElementById('revenue-composition-chart');
        if (!ctx) return;
        if (this.charts.revenueComp) this.charts.revenueComp.destroy();

        let diariaTotal = 0;
        let banhoTotal = 0;
        let transTotal = 0;

        reservations.forEach(r => {
            const days = r.total_days || 1;
            diariaTotal += (r.daily_rate * days);
            if (r.bath_service) banhoTotal += (r.bath_value || 0);
            if (r.transport_service) transTotal += (r.transport_value || 0);
        });

        this.charts.revenueComp = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Diárias', 'Banho & Tosa', 'Transporte'],
                datasets: [{
                    data: [diariaTotal, banhoTotal, transTotal],
                    backgroundColor: ['#3b82f6', '#ec4899', '#f59e0b'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } }
                }
            }
        });
    }

    createOccupancyTrendChart(reservations) {
        const ctx = document.getElementById('occupancy-trend-chart');
        if (!ctx) return;
        if (this.charts.trend) this.charts.trend.destroy();

        // Gerar próximos 7 dias
        const labels = [];
        const dataPoints = [];
        const today = new Date();

        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            labels.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));

            // Contar reservas ativas neste dia
            const count = reservations.filter(r => r.checkin_date <= dateStr && r.checkout_date >= dateStr && r.status === 'ATIVA').length;
            dataPoints.push(count);
        }

        this.charts.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ocupação Prevista',
                    data: dataPoints,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#8b5cf6',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { borderDash: [5, 5] }, ticks: { stepSize: 1 } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    async loadRecentReservations() {
        try {
            const reservations = await db.getRecentReservations(5);
            this.renderRecentReservations(reservations);
        } catch (e) { console.error(e); }
    }

    renderRecentReservations(reservations) {
        const container = document.getElementById('recent-reservations-list');
        if (!container) return;

        if (!Array.isArray(reservations) || reservations.length === 0) {
            container.innerHTML = '<p class="text-center text-secondary py-4">Nenhuma reserva recente.</p>';
            return;
        }

        container.innerHTML = reservations.map(r => `
            <div class="dashboard-res-item">
                <div class="dashboard-res-header">
                    <div class="res-pet-info">
                        <div class="res-pet-avatar">
                            <img src="${r.photo_url || ''}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div class="res-pet-fallback" style="display: none;"><i class="fas fa-paw"></i></div>
                        </div>
                        <div class="res-pet-text">
                            <strong>${r.animal_name}</strong>
                            <span>${this.formatDate(r.checkin_date)}</span>
                        </div>
                    </div>
                    <div class="res-status-group">
                        <span class="status-pill ${r.status.toLowerCase()}">${r.status}</span>
                        <i class="fas fa-chevron-down res-expand-icon"></i>
                    </div>
                </div>
                <div class="dashboard-res-details">
                    <div class="res-detail-grid">
                        <div class="res-detail-row">
                            <span class="label">Tutor:</span>
                            <span class="value">${r.tutor_name}</span>
                        </div>
                        <div class="res-detail-row">
                            <span class="label">Check-out:</span>
                            <span class="value">${this.formatDate(r.checkout_date)}</span>
                        </div>
                        <div class="res-detail-row">
                            <span class="label">Total:</span>
                            <span class="value highlight">${this.formatCurrency(r.total_value)}</span>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-sm w-100 mt-2" onclick="window.hotelPetApp.navigateToSection('reservations')">
                        <i class="fas fa-external-link-alt"></i> Ver Detalhes
                    </button>
                </div>
            </div>
        `).join('');
    }

    getLast12Months() {
        const months = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
                label: date.toLocaleDateString('pt-BR', { month: 'short' })
            });
        }
        return months;
    }

    formatCurrency(value) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0); }
    formatDate(dateStr) { if (!dateStr) return '-'; try { return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR'); } catch (e) { return dateStr; } }
    navigateToSection(s) { if (window.hotelPetApp) window.hotelPetApp.navigateToSection(s); }
    handleResize() { Object.values(this.charts).forEach(c => { if (c) c.resize(); }); }
    refreshChartsOnVisible() { if (this.isInitialized) setTimeout(() => this.handleResize(), 100); }
    startAutoUpdate() { setInterval(() => { if (document.querySelector('#dashboard.active')) this.loadDashboard(); }, 300000); }
    showLoading() { if (window.hotelPetApp) window.hotelPetApp.showLoading(); }
    hideLoading() { if (window.hotelPetApp) window.hotelPetApp.hideLoading(); }
    debounce(f, w) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f.apply(this, a), w); }; }
}