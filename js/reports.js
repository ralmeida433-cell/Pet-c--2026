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
        // Botões de geração de relatórios
        document.getElementById('generate-monthly-report').addEventListener('click', () => {
            this.generateMonthlyReport();
        });

        document.getElementById('generate-yearly-report').addEventListener('click', () => {
            this.generateYearlyReport();
        });

        // Mudança nos filtros
        document.getElementById('report-month').addEventListener('change', () => {
            this.onFilterChange();
        });

        document.getElementById('report-year').addEventListener('change', () => {
            this.onFilterChange();
        });
    }

    populateMonthOptions() {
        const select = document.getElementById('report-month');
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        
        // Limpar opções existentes
        select.innerHTML = '<option value="">Selecione o mês</option>';
        
        // Adicionar últimos 24 meses
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
        const currentYear = new Date().getFullYear();
        
        // Limpar opções existentes
        select.innerHTML = '<option value="">Selecione o ano</option>';
        
        // Adicionar anos de 2024 até o ano atual + 1
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
            
            // Carregar dados gerais para relatórios
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
            this.showError('Erro ao carregar dados dos relatórios');
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
                        <div class="summary-icon">
                            <i class="fas fa-paw"></i>
                        </div>
                        <div class="summary-info">
                            <h4>${animals.length}</h4>
                            <p>Animais Cadastrados</p>
                        </div>
                    </div>
                    
                    <div class="summary-card">
                        <div class="summary-icon">
                            <i class="fas fa-calendar-check"></i>
                        </div>
                        <div class="summary-info">
                            <h4>${reservations.length}</h4>
                            <p>Total de Reservas</p>
                        </div>
                    </div>
                    
                    <div class="summary-card">
                        <div class="summary-icon">
                            <i class="fas fa-bed"></i>
                        </div>
                        <div class="summary-info">
                            <h4>${stats.activeReservations}</h4>
                            <p>Reservas Ativas</p>
                        </div>
                    </div>
                    
                    <div class="summary-card">
                        <div class="summary-icon">
                            <i class="fas fa-dollar-sign"></i>
                        </div>
                        <div class="summary-info">
                            <h4>${this.formatCurrency(stats.monthlyRevenue)}</h4>
                            <p>Receita do Mês</p>
                        </div>
                    </div>
                </div>
                
                <div class="quick-stats">
                    <h4>Estatísticas Rápidas</h4>
                    <div class="stats-list">
                        <div class="stat-item">
                            <span class="stat-label">Taxa de Ocupação:</span>
                            <span class="stat-value">${stats.occupancyRate}%</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Canis Internos:</span>
                            <span class="stat-value">${animals.filter(a => a.kennel_type === 'INTERNO').length}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Canis Externos:</span>
                            <span class="stat-value">${animals.filter(a => a.kennel_type === 'EXTERNO').length}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Reservas Finalizadas:</span>
                            <span class="stat-value">${reservations.filter(r => r.status === 'FINALIZADA').length}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async generateMonthlyReport() {
        const monthValue = document.getElementById('report-month').value;
        
        if (!monthValue) {
            this.showError('Selecione um mês para gerar o relatório');
            return;
        }
        
        try {
            this.showLoading();
            
            const [year, month] = monthValue.split('-');
            const monthName = new Date(year, month - 1).toLocaleDateString('pt-BR', { 
                month: 'long', 
                year: 'numeric' 
            });
            
            // Buscar dados do mês
            const reservations = await db.getReservations('', '', monthValue);
            const animals = await db.getAnimals();
            
            // Processar dados
            const reportData = this.processMonthlyData(reservations, animals, monthName);
            
            // Renderizar relatório
            this.renderMonthlyReport(reportData);
            
            this.hideLoading();
            
        } catch (error) {
            console.error('Erro ao gerar relatório mensal:', error);
            this.showError('Erro ao gerar relatório mensal');
            this.hideLoading();
        }
    }

    processMonthlyData(reservations, animals, monthName) {
        const totalReservations = reservations.length;
        const activeReservations = reservations.filter(r => r.status === 'ATIVA').length;
        const finishedReservations = reservations.filter(r => r.status === 'FINALIZADA').length;
        const cancelledReservations = reservations.filter(r => r.status === 'CANCELADA').length;
        
        const totalRevenue = reservations.reduce((sum, r) => sum + (parseFloat(r.total_value) || 0), 0);
        const averageStay = totalReservations > 0 ? 
            reservations.reduce((sum, r) => sum + r.total_days, 0) / totalReservations : 0;
        
        // Análise por tipo de canil
        const internalKennels = reservations.filter(r => r.kennel_type === 'INTERNO').length;
        const externalKennels = reservations.filter(r => r.kennel_type === 'EXTERNO').length;
        
        // Análise por forma de pagamento
        const paymentMethods = {};
        reservations.forEach(r => {
            const method = r.payment_method || 'NÃO INFORMADO';
            paymentMethods[method] = (paymentMethods[method] || 0) + 1;
        });
        
        // Serviços mais utilizados
        const transportServices = reservations.filter(r => r.transport_service).length;
        const bathServices = reservations.filter(r => r.bath_service).length;
        
        // Top 10 animais por valor
        const topAnimals = reservations
            .sort((a, b) => (parseFloat(b.total_value) || 0) - (parseFloat(a.total_value) || 0))
            .slice(0, 10);
        
        return {
            monthName,
            totalReservations,
            activeReservations,
            finishedReservations,
            cancelledReservations,
            totalRevenue,
            averageStay: Math.round(averageStay * 10) / 10,
            internalKennels,
            externalKennels,
            paymentMethods,
            transportServices,
            bathServices,
            topAnimals,
            reservations
        };
    }

    renderMonthlyReport(data) {
        const reportContent = document.getElementById('report-content');
        
        reportContent.innerHTML = `
            <div class="monthly-report">
                <div class="report-header">
                    <h3>Relatório Mensal - ${data.monthName}</h3>
                    <div class="report-actions">
                        <button class="btn btn-secondary" onclick="reportsManager.exportReport('monthly', '${data.monthName}')">
                            <i class="fas fa-download"></i>
                            Exportar PDF
                        </button>
                        <button class="btn btn-primary" onclick="reportsManager.printReport()">
                            <i class="fas fa-print"></i>
                            Imprimir
                        </button>
                    </div>
                </div>
                
                <div class="report-overview">
                    <div class="overview-grid">
                        <div class="overview-card primary">
                            <h4>${data.totalReservations}</h4>
                            <p>Total de Reservas</p>
                        </div>
                        <div class="overview-card success">
                            <h4>${this.formatCurrency(data.totalRevenue)}</h4>
                            <p>Receita Total</p>
                        </div>
                        <div class="overview-card info">
                            <h4>${data.averageStay}</h4>
                            <p>Média de Diárias</p>
                        </div>
                        <div class="overview-card warning">
                            <h4>${data.activeReservations}</h4>
                            <p>Reservas Ativas</p>
                        </div>
                    </div>
                </div>
                
                <div class="report-sections">
                    <div class="report-section">
                        <h4>Status das Reservas</h4>
                        <div class="status-breakdown">
                            <div class="status-item">
                                <span class="status-label">Ativas:</span>
                                <span class="status-value">${data.activeReservations}</span>
                                <span class="status-percentage">(${((data.activeReservations / data.totalReservations) * 100).toFixed(1)}%)</span>
                            </div>
                            <div class="status-item">
                                <span class="status-label">Finalizadas:</span>
                                <span class="status-value">${data.finishedReservations}</span>
                                <span class="status-percentage">(${((data.finishedReservations / data.totalReservations) * 100).toFixed(1)}%)</span>
                            </div>
                            <div class="status-item">
                                <span class="status-label">Canceladas:</span>
                                <span class="status-value">${data.cancelledReservations}</span>
                                <span class="status-percentage">(${((data.cancelledReservations / data.totalReservations) * 100).toFixed(1)}%)</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="report-section">
                        <h4>Formas de Pagamento</h4>
                        <div class="payment-breakdown">
                            ${Object.entries(data.paymentMethods).map(([method, count]) => `
                                <div class="payment-item">
                                    <span class="payment-label">${method}:</span>
                                    <span class="payment-value">${count}</span>
                                    <span class="payment-percentage">(${((count / data.totalReservations) * 100).toFixed(1)}%)</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="report-section">
                        <h4>Top 10 Reservas por Valor</h4>
                        <div class="top-reservations">
                            <table class="report-table">
                                <thead>
                                    <tr>
                                        <th>Animal</th>
                                        <th>Tutor</th>
                                        <th>Período</th>
                                        <th>Diárias</th>
                                        <th>Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${data.topAnimals.map(reservation => `
                                        <tr>
                                            <td>${reservation.animal_name}</td>
                                            <td>${reservation.tutor_name}</td>
                                            <td>${this.formatDate(reservation.checkin_date)} - ${this.formatDate(reservation.checkout_date)}</td>
                                            <td>${reservation.total_days}</td>
                                            <td>${this.formatCurrency(reservation.total_value)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <div class="report-footer">
                    <p>Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
                </div>
            </div>
        `;
    }

    async generateYearlyReport() {
        const year = document.getElementById('report-year').value;
        
        if (!year) {
            this.showError('Selecione um ano para gerar o relatório');
            return;
        }
        
        try {
            this.showLoading();
            
            // Buscar dados do ano
            const reservations = await db.getReservations();
            const yearReservations = reservations.filter(r => 
                r.checkin_date.startsWith(year)
            );
            
            const animals = await db.getAnimals();
            
            // Processar dados
            const reportData = this.processYearlyData(yearReservations, animals, year);
            
            // Renderizar relatório
            this.renderYearlyReport(reportData);
            
            this.hideLoading();
            
        } catch (error) {
            console.error('Erro ao gerar relatório anual:', error);
            this.showError('Erro ao gerar relatório anual');
            this.hideLoading();
        }
    }

    processYearlyData(reservations, animals, year) {
        // Agrupar por mês
        const monthlyData = {};
        for (let month = 1; month <= 12; month++) {
            const monthKey = `${year}-${String(month).padStart(2, '0')}`;
            const monthReservations = reservations.filter(r => 
                r.checkin_date.startsWith(monthKey)
            );
            
            monthlyData[month] = {
                name: new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long' }),
                reservations: monthReservations.length,
                revenue: monthReservations.reduce((sum, r) => sum + (parseFloat(r.total_value) || 0), 0)
            };
        }
        
        const totalReservations = reservations.length;
        const totalRevenue = reservations.reduce((sum, r) => sum + (parseFloat(r.total_value) || 0), 0);
        const averageMonthlyReservations = totalReservations / 12;
        const averageMonthlyRevenue = totalRevenue / 12;
        
        // Encontrar melhor e pior mês
        const monthsWithData = Object.values(monthlyData).filter(m => m.reservations > 0);
        const bestMonth = monthsWithData.reduce((best, current) => 
            current.revenue > best.revenue ? current : best, monthsWithData[0] || {});
        const worstMonth = monthsWithData.reduce((worst, current) => 
            current.revenue < worst.revenue ? current : worst, monthsWithData[0] || {});
        
        return {
            year,
            monthlyData,
            totalReservations,
            totalRevenue,
            averageMonthlyReservations: Math.round(averageMonthlyReservations * 10) / 10,
            averageMonthlyRevenue,
            bestMonth,
            worstMonth,
            reservations
        };
    }

    renderYearlyReport(data) {
        const reportContent = document.getElementById('report-content');
        
        reportContent.innerHTML = `
            <div class="yearly-report">
                <div class="report-header">
                    <h3>Relatório Anual - ${data.year}</h3>
                    <div class="report-actions">
                        <button class="btn btn-secondary" onclick="reportsManager.exportReport('yearly', '${data.year}')">
                            <i class="fas fa-download"></i>
                            Exportar Excel
                        </button>
                        <button class="btn btn-primary" onclick="reportsManager.printReport()">
                            <i class="fas fa-print"></i>
                            Imprimir
                        </button>
                    </div>
                </div>
                
                <div class="report-overview">
                    <div class="overview-grid">
                        <div class="overview-card primary">
                            <h4>${data.totalReservations}</h4>
                            <p>Total de Reservas</p>
                        </div>
                        <div class="overview-card success">
                            <h4>${this.formatCurrency(data.totalRevenue)}</h4>
                            <p>Receita Total</p>
                        </div>
                        <div class="overview-card info">
                            <h4>${data.averageMonthlyReservations}</h4>
                            <p>Média Mensal de Reservas</p>
                        </div>
                        <div class="overview-card warning">
                            <h4>${this.formatCurrency(data.averageMonthlyRevenue)}</h4>
                            <p>Receita Média Mensal</p>
                        </div>
                    </div>
                </div>
                
                <div class="report-sections">
                    <div class="report-section">
                        <h4>Performance Mensal</h4>
                        <div class="monthly-performance">
                            <div class="performance-item best">
                                <span class="performance-label">Melhor Mês:</span>
                                <span class="performance-value">${data.bestMonth.name || 'N/A'}</span>
                                <span class="performance-detail">${this.formatCurrency(data.bestMonth.revenue || 0)}</span>
                            </div>
                            <div class="performance-item worst">
                                <span class="performance-label">Pior Mês:</span>
                                <span class="performance-value">${data.worstMonth.name || 'N/A'}</span>
                                <span class="performance-detail">${this.formatCurrency(data.worstMonth.revenue || 0)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="report-section">
                        <h4>Dados Mensais Detalhados</h4>
                        <div class="monthly-details">
                            <table class="report-table">
                                <thead>
                                    <tr>
                                        <th>Mês</th>
                                        <th>Reservas</th>
                                        <th>Receita</th>
                                        <th>Média por Reserva</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${Object.values(data.monthlyData).map(month => `
                                        <tr>
                                            <td>${month.name}</td>
                                            <td>${month.reservations}</td>
                                            <td>${this.formatCurrency(month.revenue)}</td>
                                            <td>${month.reservations > 0 ? this.formatCurrency(month.revenue / month.reservations) : 'R$ 0,00'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <div class="report-footer">
                    <p>Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
                </div>
            </div>
        `;
    }

    async exportReport(type, period) {
        try {
            let filename = '';
            let data = {};
            
            if (type === 'monthly') {
                filename = `relatorio-mensal-${period.replace(' ', '-').toLowerCase()}.json`;
                data = {
                    type: 'monthly',
                    period: period,
                    generated: new Date().toISOString(),
                    content: document.querySelector('.monthly-report').innerHTML
                };
            } else if (type === 'yearly') {
                filename = `relatorio-anual-${period}.json`;
                data = {
                    type: 'yearly',
                    period: period,
                    generated: new Date().toISOString(),
                    content: document.querySelector('.yearly-report').innerHTML
                };
            }
            
            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification('Relatório exportado com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao exportar relatório:', error);
            this.showError('Erro ao exportar relatório');
        }
    }

    printReport() {
        const reportContent = document.getElementById('report-content');
        if (reportContent) {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Relatório - Hotel Pet CÁ</title>
                        <style>
                            body { font-family: Arial, sans-serif; margin: 20px; }
                            .report-header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                            .overview-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
                            .overview-card { border: 1px solid #ddd; padding: 15px; text-align: center; }
                            .report-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                            .report-table th, .report-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                            .report-table th { background-color: #f5f5f5; }
                            @media print { .report-actions { display: none; } }
                        </style>
                    </head>
                    <body>
                        ${reportContent.innerHTML}
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        }
    }

    onFilterChange() {
        const month = document.getElementById('report-month').value;
        const year = document.getElementById('report-year').value;
        
        if (month || year) {
            document.getElementById('generate-monthly-report').disabled = !month;
            document.getElementById('generate-yearly-report').disabled = !year;
        }
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value || 0);
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR');
        } catch (error) {
            return dateString;
        }
    }

    showLoading() {
        const section = document.getElementById('reports');
        let loader = section.querySelector('.section-loader');
        
        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'section-loader';
            loader.innerHTML = `
                <div class="loader-content">
                    <div class="spinner"></div>
                    <p>Carregando relatórios...</p>
                </div>
            `;
            section.appendChild(loader);
        }
        
        loader.style.display = 'flex';
    }

    hideLoading() {
        const loader = document.querySelector('#reports .section-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
        if (window.hotelPetApp) {
            window.hotelPetApp.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    destroy() {
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.destroy) {
                chart.destroy();
            }
        });
        
        this.charts = {};
        this.isInitialized = false;
        console.log('Reports Manager destroyed');
    }
}

// Disponibilizar globalmente
window.ReportsManager = ReportsManager;
