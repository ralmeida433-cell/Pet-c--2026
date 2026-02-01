class ReportsManager {
    constructor() {
        this.isInitialized = false;
        this.currentReport = null;
        this.charts = {};
        this.init();
    }

    init() {
        this.bindEvents();
        this.populateYearOptions();
        this.populateMonthOptions();
        console.log('Reports Manager initialized');
    }

    bindEvents() {
        // Botões de geração de relatórios - Com verificação de segurança
        const btnMonthly = document.getElementById('generate-monthly-report');
        if (btnMonthly) {
            btnMonthly.addEventListener('click', () => this.generateMonthlyReport());
        }

        const btnYearly = document.getElementById('generate-yearly-report');
        if (btnYearly) {
            btnYearly.addEventListener('click', () => this.generateYearlyReport());
        }

        // Mudança nos filtros
        const selMonth = document.getElementById('report-month');
        if (selMonth) {
            selMonth.addEventListener('change', () => this.onFilterChange());
        }

        const selYear = document.getElementById('report-year');
        if (selYear) {
            selYear.addEventListener('change', () => this.onFilterChange());
        }
    }

    populateMonthOptions() {
        const select = document.getElementById('report-month');
        if (!select) return;

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();

        select.innerHTML = '<option value="">Selecione o mês</option>';

        for (let i = 0; i < 24; i++) {
            const date = new Date(currentYear, currentMonth - i, 1);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const monthName = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            const value = `${year}-${String(month).padStart(2, '0')}`;

            const option = document.createElement('option');
            option.value = value;
            option.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
            select.appendChild(option);
        }
    }

    populateYearOptions() {
        const select = document.getElementById('report-year');
        if (!select) return;

        const currentYear = new Date().getFullYear();
        select.innerHTML = '<option value="">Selecione o ano</option>';

        for (let year = 2024; year <= currentYear + 1; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            select.appendChild(option);
        }
    }

    async loadReports() {
        try {
            this.showLoading();
            const [animals, reservations, stats] = await Promise.all([
                db.getAnimals(),
                db.getReservations(),
                db.getDashboardStats()
            ]);
            this.renderReportsSummary(animals, reservations, stats);
            this.hideLoading();
            this.isInitialized = true;
        } catch (error) {
            console.error('Erro ao carregar relatórios:', error);
            this.hideLoading();
        }
    }

    renderReportsSummary(animals, reservations, stats) {
        const reportContent = document.getElementById('report-content');
        if (!reportContent) return;

        reportContent.innerHTML = `
            <div class="reports-summary">
                <h3>Resumo Geral</h3>
                <div class="summary-grid">
                    <div class="summary-card">
                        <div class="summary-icon"><i class="fas fa-paw"></i></div>
                        <div class="summary-info"><h4>${animals.length}</h4><p>Animais Cadastrados</p></div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-icon"><i class="fas fa-calendar-check"></i></div>
                        <div class="summary-info"><h4>${reservations.length}</h4><p>Total de Reservas</p></div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-icon"><i class="fas fa-bed"></i></div>
                        <div class="summary-info"><h4>${stats.activeReservations}</h4><p>Reservas Ativas</p></div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-icon"><i class="fas fa-dollar-sign"></i></div>
                        <div class="summary-info"><h4>${this.formatCurrency(stats.monthlyRevenue)}</h4><p>Receita do Mês</p></div>
                    </div>
                </div>
            </div>
        `;
    }

    async generateMonthlyReport() {
        const monthValue = document.getElementById('report-month').value;
        if (!monthValue) return;

        try {
            this.showLoading();
            const reservations = await db.getReservations('', '', monthValue);
            const [year, month] = monthValue.split('-');
            const monthName = new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            
            const reportData = this.processMonthlyData(reservations, monthName);
            this.renderMonthlyReport(reportData);
            this.hideLoading();
        } catch (error) {
            console.error('Erro ao gerar relatório mensal:', error);
            this.hideLoading();
        }
    }

    processMonthlyData(reservations, monthName) {
        const totalRevenue = reservations.reduce((sum, r) => sum + (parseFloat(r.total_value) || 0), 0);
        return { monthName, totalReservations: reservations.length, totalRevenue, reservations };
    }

    renderMonthlyReport(data) {
        const reportContent = document.getElementById('report-content');
        reportContent.innerHTML = `
            <div class="monthly-report">
                <button class="btn btn-sm btn-secondary mb-3" onclick="reportsManager.loadReports()">Voltar</button>
                <h3>Relatório - ${data.monthName}</h3>
                <div class="overview-grid mt-4">
                    <div class="overview-card primary"><h4>${data.totalReservations}</h4><p>Reservas</p></div>
                    <div class="overview-card success"><h4>${this.formatCurrency(data.totalRevenue)}</h4><p>Receita</p></div>
                </div>
            </div>
        `;
    }

    async generateYearlyReport() {
        const year = document.getElementById('report-year').value;
        if (!year) return;
        this.showNotification('Relatório anual em processamento...', 'info');
    }

    onFilterChange() {
        const month = document.getElementById('report-month')?.value;
        const year = document.getElementById('report-year')?.value;
        if (document.getElementById('generate-monthly-report')) {
            document.getElementById('generate-monthly-report').disabled = !month;
        }
        if (document.getElementById('generate-yearly-report')) {
            document.getElementById('generate-yearly-report').disabled = !year;
        }
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    }

    showLoading() {
        const section = document.getElementById('reports');
        if (!section) return;
        let loader = section.querySelector('.section-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'section-loader';
            loader.innerHTML = '<div class="loader-content"><div class="spinner"></div><p>Carregando...</p></div>';
            section.appendChild(loader);
        }
        loader.style.display = 'flex';
    }

    hideLoading() {
        const loader = document.querySelector('#reports .section-loader');
        if (loader) loader.style.display = 'none';
    }

    showNotification(message, type) {
        if (window.hotelPetApp) window.hotelPetApp.showNotification(message, type);
    }
}
window.ReportsManager = ReportsManager;