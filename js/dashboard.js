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
        // Eventos de redimensionamento com debounce melhorado
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize();
        }, 250));

        // Clique nos cards de estatísticas para navegação rápida
        this.bindStatCardEvents();

        // Detectar mudança de visibilidade da página
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.refreshChartsOnVisible();
            }
        });
    }

    bindStatCardEvents() {
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach((card, index) => {
            card.addEventListener('click', () => {
                switch (index) {
                    case 0: // Total de Animais
                        this.navigateToSection('animals');
                        break;
                    case 1: // Reservas Ativas
                        this.navigateToSection('reservations');
                        break;
                    case 2: // Receita do Mês
                        this.navigateToSection('reports');
                        break;
                    case 3: // Taxa de Ocupação
                        this.navigateToSection('reservations');
                        break;
                }
            });
        });
    }

    async loadDashboard() {
        try {
            this.showLoading();

            // Carregar estatísticas principais
            await this.loadDashboardStats();

            // Carregar gráficos com delay para evitar problemas de renderização
            setTimeout(async () => {
                await this.loadCharts();
            }, 100);

            // Carregar reservas recentes
            await this.loadRecentReservations();

            this.hideLoading();
            this.isInitialized = true;
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            this.showError('Erro ao carregar dados do dashboard');
            this.hideLoading();
        }
    }

    async loadDashboardStats() {
        try {
            const stats = await db.getDashboardStats();

            // CORREÇÃO: Verificar se stats existe e tem as propriedades necessárias
            if (!stats) {
                console.warn('Estatísticas não disponíveis, usando valores padrão');
                this.updateStatCard('total-animals', 0);
                this.updateStatCard('active-reservations', 0);
                this.updateStatCard('monthly-revenue', 'R$ 0,00');
                this.updateStatCard('occupancy-rate', '0%');
                return;
            }

            // Atualizar cards de estatísticas com verificação de propriedades
            this.updateStatCard('total-animals', stats.totalAnimals || 0);
            this.updateStatCard('active-reservations', stats.activeReservations || 0);
            this.updateStatCard('monthly-revenue', this.formatCurrency(stats.monthlyRevenue || 0));
            this.updateStatCard('occupancy-rate', `${stats.occupancyRate || 0}%`);

            // Animação nos números
            this.animateNumbers();
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
            // Definir valores padrão em caso de erro
            this.updateStatCard('total-animals', 0);
            this.updateStatCard('active-reservations', 0);
            this.updateStatCard('monthly-revenue', 'R$ 0,00');
            this.updateStatCard('occupancy-rate', '0%');
        }
    }

    updateStatCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            // Animar mudança de valor
            element.style.transform = 'scale(1.05)';
            setTimeout(() => {
                element.textContent = value;
                element.style.transform = 'scale(1)';
            }, 150);
        }
    }

    animateNumbers() {
        const numberElements = document.querySelectorAll('.stat-info h3');
        numberElements.forEach(element => {
            const finalValue = element.textContent;
            const isNumber = !isNaN(parseFloat(finalValue));

            if (isNumber) {
                const startValue = 0;
                const endValue = parseFloat(finalValue);
                const duration = 1000;
                const startTime = performance.now();

                const animate = (currentTime) => {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const currentValue = Math.floor(startValue + (endValue - startValue) * this.easeOutCubic(progress));

                    element.textContent = currentValue;

                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        element.textContent = finalValue;
                    }
                };

                requestAnimationFrame(animate);
            }
        });
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    async loadCharts() {
        try {
            // Carregar dados para gráficos
            const [monthlyData, kennelData] = await Promise.all([
                db.getMonthlyData(),
                db.getKennelTypeData()
            ]);

            const reservations = await db.getReservations();

            // CORREÇÃO: Verificar se os dados existem e são arrays
            const safeMonthlyData = Array.isArray(monthlyData) ? monthlyData : [];
            const safeKennelData = Array.isArray(kennelData) ? kennelData : [];

            // Criar gráficos
            await this.createMonthlyChart(safeMonthlyData);
            await this.createKennelChart(safeKennelData);
            await this.createPaymentChart(reservations);
        } catch (error) {
            console.error('Erro ao carregar gráficos:', error);
            await this.createMonthlyChart([]);
            await this.createKennelChart([]);
            await this.createPaymentChart([]);
        }
    }

    async createPaymentChart(reservations) {
        const ctx = document.getElementById('paymentChart');
        if (!ctx) return;

        if (this.charts.payment) this.charts.payment.destroy();

        const payments = {};
        reservations.forEach(r => {
            const method = r.payment_method || 'NÃO INF.';
            payments[method] = (payments[method] || 0) + parseFloat(r.total_value || 0);
        });

        this.charts.payment = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(payments),
                datasets: [{
                    label: 'Receita por Método',
                    data: Object.values(payments),
                    backgroundColor: 'rgba(16, 185, 129, 0.6)',
                    borderColor: 'rgb(16, 185, 129)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    async createMonthlyChart(data) {
        const ctx = document.getElementById('monthlyChart');
        if (!ctx) return;

        // Destruir gráfico existente se houver
        if (this.charts.monthly) {
            this.charts.monthly.destroy();
        }

        // Preparar dados dos últimos 12 meses
        const months = this.getLast12Months();
        const chartData = months.map(month => {
            // CORREÇÃO: Verificar se data é array antes de usar find
            const monthData = Array.isArray(data) ? data.find(d => d && d.month === month.key) : null;
            return {
                month: month.label,
                reservations: monthData ? (monthData.reservations || 0) : 0,
                revenue: monthData ? (monthData.revenue || 0) : 0
            };
        });

        this.charts.monthly = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.map(d => d.month),
                datasets: [
                    {
                        label: 'Reservas',
                        data: chartData.map(d => d.reservations),
                        borderColor: 'rgb(37, 99, 235)',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Receita (R$)',
                        data: chartData.map(d => d.revenue),
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 750,
                    easing: 'easeOutQuart'
                },
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    title: {
                        display: false
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                if (context.datasetIndex === 1) {
                                    return `Receita: ${new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                    }).format(context.parsed.y)}`;
                                }
                                return `Reservas: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Número de Reservas'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        beginAtZero: true
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Receita (R$)'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                    minimumFractionDigits: 0
                                }).format(value);
                            }
                        }
                    }
                }
            }
        });
    }

    async createKennelChart(data) {
        const ctx = document.getElementById('kennel-chart');
        if (!ctx) return;

        // Destruir gráfico existente se houver
        if (this.charts.kennel) {
            this.charts.kennel.destroy();
        }

        // CORREÇÃO: Preparar dados com fallback
        const chartData = Array.isArray(data) && data.length > 0 ? data : [
            { kennel_type: 'INTERNO', count: 0 },
            { kennel_type: 'EXTERNO', count: 0 },
            { kennel_type: 'GATIL', count: 0 }
        ];

        this.charts.kennel = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartData.map(d => d.kennel_type || d.accommodation_type || 'N/A'),
                datasets: [{
                    data: chartData.map(d => d.count || 0),
                    backgroundColor: [
                        'rgba(37, 99, 235, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)'
                    ],
                    borderColor: [
                        'rgb(37, 99, 235)',
                        'rgb(16, 185, 129)',
                        'rgb(245, 158, 11)'
                    ],
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 750,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    async loadRecentReservations() {
        try {
            const reservations = await db.getRecentReservations(5);
            this.renderRecentReservations(reservations);
        } catch (error) {
            console.error('Erro ao carregar reservas recentes:', error);
            this.renderRecentReservations([]);
        }
    }

    renderRecentReservations(reservations) {
        const tbody = document.querySelector('#recent-reservations-table tbody');
        if (!tbody) return;

        // CORREÇÃO: Verificar se reservations é um array
        const safeReservations = Array.isArray(reservations) ? reservations : [];

        if (safeReservations.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div style="padding: 2rem; color: var(--text-secondary);">
                            <i class="fas fa-calendar-alt" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                            Nenhuma reserva encontrada
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = safeReservations.map(reservation => `
            <tr class="recent-res-row">
                <td data-label="Animal">
                    <div style="display: flex; align-items: center; gap: 1rem; justify-content: flex-start;">
                        <div class="animal-avatar-mini">
                            ${reservation.photo_url ? 
                                `<img src="${reservation.photo_url}" alt="${reservation.animal_name}" class="avatar-img">` :
                                `<div class="avatar-fallback"><i class="fas fa-${(reservation.animal_species === 'GATO') ? 'cat' : 'dog'}"></i></div>`
                            }
                        </div>
                        <div style="text-align: left;">
                            <strong style="color: var(--primary-color); font-size: 1rem; display: block;">${reservation.animal_name || 'N/A'}</strong>
                            <span style="font-size: 0.75rem; color: var(--text-secondary);">
                                <i class="fas fa-home"></i> ${reservation.accommodation_type || 'N/A'} ${reservation.kennel_number || ''}
                            </span>
                        </div>
                    </div>
                </td>
                <td data-label="Tutor">
                    <div style="font-weight: 600; color: var(--text-primary);">${reservation.tutor_name || 'N/A'}</div>
                </td>
                <td data-label="Check-in">
                    <div>
                        <div style="font-weight: 500;">${this.formatDate(reservation.checkin_date)}</div>
                        <small style="color: var(--text-secondary);">${reservation.checkin_time || '14:00'}</small>
                    </div>
                </td>
                <td data-label="Check-out">
                    <div>
                        <div style="font-weight: 500;">${this.formatDate(reservation.checkout_date)}</div>
                        <small style="color: var(--text-secondary);">${reservation.checkout_time || '12:00'}</small>
                    </div>
                </td>
                <td data-label="Valor">
                    <div style="color: var(--success-color); font-weight: 700;">${this.formatCurrency(reservation.total_value)}</div>
                </td>
                <td data-label="Status">
                    <span class="status-badge ${this.getStatusClass(reservation.status)}">
                        ${reservation.status || 'N/A'}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    // Métodos auxiliares
    getLast12Months() {
        const months = [];
        const now = new Date();

        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
                label: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
            });
        }

        return months;
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value || 0);
    }

    formatDate(dateStr) {
        if (!dateStr) return '-';

        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('pt-BR');
        } catch (error) {
            return dateStr;
        }
    }

    getStatusClass(status) {
        const statusClasses = {
            'ATIVA': 'status-active',
            'FINALIZADA': 'status-finished',
            'CANCELADA': 'status-cancelled'
        };
        return statusClasses[status] || 'status-active';
    }

    navigateToSection(sectionName) {
        if (window.hotelPetApp) {
            window.hotelPetApp.navigateToSection(sectionName);
        }
    }

    handleResize() {
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.resize) {
                chart.resize();
            }
        });
    }

    refreshChartsOnVisible() {
        if (this.isInitialized) {
            setTimeout(() => {
                this.handleResize();
            }, 100);
        }
    }

    startAutoUpdate() {
        this.updateInterval = setInterval(() => {
            if (document.querySelector('#dashboard.active')) {
                this.loadDashboard();
            }
        }, 300000); // 5 minutos
    }

    showLoading() {
        const section = document.getElementById('dashboard');
        if (!section) return;

        let loader = section.querySelector('.section-loader');

        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'section-loader';
            loader.innerHTML = `
                <div class="loader-content">
                    <div class="spinner"></div>
                    <p>Carregando dados...</p>
                </div>
            `;
            section.appendChild(loader);
        }

        loader.style.display = 'flex';
    }

    hideLoading() {
        const loader = document.querySelector('#dashboard .section-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    showError(message) {
        if (window.hotelPetApp) {
            window.hotelPetApp.showNotification(message, 'error');
        } else {
            console.error(message);
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}