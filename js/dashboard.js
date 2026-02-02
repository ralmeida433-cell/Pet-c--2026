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
                    case 0: this.navigateToSection('animals'); break;
                    case 1: this.navigateToSection('reservations'); break;
                    case 2: this.navigateToSection('reports'); break;
                    case 3: this.navigateToSection('reservations'); break;
                }
            });
        });
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
            const [monthlyData, kennelData] = await Promise.all([
                db.getMonthlyData(),
                db.getKennelTypeData()
            ]);
            const reservations = await db.getReservations();
            await this.createMonthlyChart(Array.isArray(monthlyData) ? monthlyData : []);
            await this.createKennelChart(Array.isArray(kennelData) ? kennelData : []);
            await this.createPaymentChart(reservations);
        } catch (error) { console.error(error); }
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

        this.charts.monthly = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.map(d => d.month),
                datasets: [
                    {
                        label: 'Reservas',
                        data: chartData.map(d => d.reservations),
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Receita',
                        data: chartData.map(d => d.revenue),
                        borderColor: '#10b981',
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
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { boxWidth: 12, font: { size: isMobile ? 10 : 12 } }
                    },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { 
                            font: { size: isMobile ? 9 : 11 },
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: isMobile ? 6 : 12
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: !isMobile, text: 'Reservas' },
                        ticks: { font: { size: isMobile ? 9 : 11 }, stepSize: 1 },
                        grid: { color: 'rgba(0, 0, 0, 0.05)' }
                    },
                    y1: {
                        type: 'linear',
                        display: !isMobile, // Ocultar eixo de valores no mobile para ganhar espaço
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: { 
                            callback: value => 'R$ ' + value,
                            font: { size: 10 }
                        }
                    }
                }
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
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: isMobile ? 10 : 12 } } }
                },
                cutout: isMobile ? '70%' : '60%'
            }
        });
    }

    async createPaymentChart(reservations) {
        const ctx = document.getElementById('paymentChart');
        if (!ctx) return;
        if (this.charts.payment) this.charts.payment.destroy();
        
        const payments = {};
        reservations.forEach(r => {
            const method = r.payment_method || 'N/A';
            payments[method] = (payments[method] || 0) + parseFloat(r.total_value || 0);
        });

        this.charts.payment = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(payments),
                datasets: [{
                    label: 'Receita',
                    data: Object.values(payments),
                    backgroundColor: 'rgba(16, 185, 129, 0.6)',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } }
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
        const tbody = document.querySelector('#recent-reservations-table tbody');
        if (!tbody) return;
        if (!Array.isArray(reservations) || reservations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhuma reserva.</td></tr>';
            return;
        }
        tbody.innerHTML = reservations.map(r => `
            <tr>
                <td><strong>${r.animal_name}</strong></td>
                <td>${r.tutor_name}</td>
                <td>${this.formatDate(r.checkin_date)}</td>
                <td>${this.formatDate(r.checkout_date)}</td>
                <td>${this.formatCurrency(r.total_value)}</td>
                <td><span class="status-badge ${r.status.toLowerCase()}">${r.status}</span></td>
            </tr>
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