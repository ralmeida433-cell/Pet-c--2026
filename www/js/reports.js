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

    onFilterChange() {
        // Reservado para futuras atualizações automáticas na tela
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
                <h3 style="margin-bottom: 1rem; color: #334155;">Resumo Geral</h3>
                <div class="summary-grid-modern">
                    <div class="summary-card-modern blue">
                        <div class="summary-icon-box"><i class="fas fa-paw"></i></div>
                        <div class="summary-value">${animals.length}</div>
                        <div class="summary-label">Animais Cadastrados</div>
                    </div>
                    <div class="summary-card-modern orange">
                        <div class="summary-icon-box"><i class="fas fa-calendar-check"></i></div>
                        <div class="summary-value">${reservations.length}</div>
                        <div class="summary-label">Total de Reservas</div>
                    </div>
                    <div class="summary-card-modern purple">
                        <div class="summary-icon-box"><i class="fas fa-bed"></i></div>
                        <div class="summary-value">${stats.activeReservations}</div>
                        <div class="summary-label">Reservas Ativas</div>
                    </div>
                    <div class="summary-card-modern green">
                        <div class="summary-icon-box"><i class="fas fa-dollar-sign"></i></div>
                        <div class="summary-value">${this.formatCurrency(stats.monthlyRevenue)}</div>
                        <div class="summary-label">Receita Estimada</div>
                    </div>
                </div>
            </div>
        `;
    }

    async generateMonthlyReport() {
        const monthValue = document.getElementById('report-month').value;
        if (!monthValue) {
            this.showNotification('Selecione um mês', 'warning');
            return;
        }

        try {
            this.showLoading();
            const reservations = await db.getReservations('', '', monthValue);
            const animals = await db.getAnimals();
            const [year, month] = monthValue.split('-');
            const monthDate = new Date(year, month - 1);
            const monthName = monthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

            await this.createModernPDF(
                `Relatório Mensal - ${monthName}`,
                reservations,
                animals,
                `Performance de ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`
            );
            this.hideLoading();
            this.showNotification('Relatório mensal gerado com sucesso!');
        } catch (error) {
            console.error(error);
            this.showNotification('Erro ao gerar PDF', 'error');
            this.hideLoading();
        }
    }

    async generateYearlyReport() {
        const year = document.getElementById('report-year').value;
        if (!year) {
            this.showNotification('Selecione um ano', 'warning');
            return;
        }

        try {
            this.showLoading();
            // A API de reservations filtra por checkin_date LIKE '2025%' se passarmos o ano como string
            const reservations = await db.getReservations('', '', year);
            const animals = await db.getAnimals();

            await this.createModernPDF(
                `Relatório Anual - ${year}`,
                reservations,
                animals,
                `Análise Estratégica do Ano de ${year}`
            );
            this.hideLoading();
            this.showNotification('Relatório anual gerado com sucesso!');
        } catch (error) {
            console.error(error);
            this.showNotification('Erro ao gerar PDF', 'error');
            this.hideLoading();
        }
    }

    async createModernPDF(title, reservations, animals, subtitle) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Cores da Identidade Visual PetCá
        const PRIMARY_COLOR = [103, 58, 183]; // Roxo
        const SECONDARY_COLOR = [255, 193, 7]; // Amarelo
        const TEXT_COLOR = [51, 65, 85];

        // Função para carregar imagem como Base64
        const loadImage = (url) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png', 1.0));
                };
                img.onerror = reject;
                img.src = url;
            });
        };

        let logoBase64 = null;
        try {
            logoBase64 = await loadImage('css/logo.png');
        } catch (e) {
            console.warn('Logo não carregado, usando texto');
        }

        // --- PÁGINA 1: CAPA PREMIUM ---
        this.drawCoverPage(doc, title, subtitle, PRIMARY_COLOR, SECONDARY_COLOR, logoBase64);

        doc.addPage();

        // --- PÁGINA 2: DASHBOARD DE INDICADORES ---
        this.addHeader(doc, title, PRIMARY_COLOR, logoBase64);

        // Cálculos de KPI (Garantindo valores numéricos)
        const totalRevenue = reservations.reduce((acc, r) => acc + (Number(r.total_value) || 0), 0);
        const totalReservations = reservations.length;
        const avgTicket = totalReservations ? totalRevenue / totalReservations : 0;
        const totalDays = reservations.reduce((acc, r) => acc + (Number(r.total_days) || 0), 0);

        // Fileira 1 de KPIs
        this.drawKPICard(doc, 15, 40, "Faturamento Total", this.formatCurrency(totalRevenue), [10, 162, 72]); // Verde
        this.drawKPICard(doc, 78, 40, "Ticket Médio", this.formatCurrency(avgTicket), PRIMARY_COLOR);
        this.drawKPICard(doc, 141, 40, "Total Diárias", totalDays.toString(), [220, 38, 38]); // Vermelho

        // Análise de Serviços (Transporte e Banho)
        const transportCount = reservations.filter(r => r.transport_service == 1 || r.transport_service === true).length;
        const bathCount = reservations.filter(r => r.bath_service == 1 || r.bath_service === true).length;
        const serviceRevenue = reservations.reduce((acc, r) => acc + (Number(r.transport_value) || 0) + (Number(r.bath_value) || 0), 0);

        doc.setFontSize(14);
        doc.setTextColor(...TEXT_COLOR);
        doc.setFont('helvetica', 'bold');
        doc.text("Utilização de Serviços Extras", 15, 80);

        const servicesBody = [
            ["Serviço de Transporte Pet", transportCount, Math.round((transportCount / (totalReservations || 1)) * 100) + "%"],
            ["Serviço de Estética (Banho)", bathCount, Math.round((bathCount / (totalReservations || 1)) * 100) + "%"],
            ["Faturamento em Extras", "-", this.formatCurrency(serviceRevenue)]
        ];

        doc.autoTable({
            startY: 85,
            head: [['Serviço', 'Qtde', 'Adesão / Valor']],
            body: servicesBody,
            theme: 'striped',
            headStyles: { fillColor: PRIMARY_COLOR },
            styles: { fontSize: 10 },
            margin: { left: 15, right: 15 }
        });

        // Top Clientes
        const clients = {};
        reservations.forEach(r => {
            const name = r.tutor_name || 'Desconhecido';
            if (!clients[name]) clients[name] = 0;
            clients[name] += Number(r.total_value) || 0;
        });
        const sortedClients = Object.entries(clients).sort((a, b) => b[1] - a[1]).slice(0, 5);

        doc.setFontSize(14);
        doc.text("Top 5 Tutores (Faturamento)", 15, doc.lastAutoTable.finalY + 15);

        const clientBody = sortedClients.map(c => [c[0], this.formatCurrency(c[1])]);
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 20,
            head: [['Nome do Tutor', 'Total Investido']],
            body: clientBody,
            theme: 'grid',
            headStyles: { fillColor: [71, 85, 105] },
            styles: { fontSize: 10 },
            margin: { left: 15, right: 15 }
        });

        // Insights de Negócio
        doc.setFontSize(14);
        doc.text("Insights Inteligentes PetCá", 15, doc.lastAutoTable.finalY + 15);

        const insights = this.generateBusinessInsights(reservations, animals);
        let currentY = doc.lastAutoTable.finalY + 22;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        insights.forEach(insight => {
            const splitInsight = doc.splitTextToSize(`• ${insight}`, 180);
            doc.text(splitInsight, 15, currentY);
            currentY += (splitInsight.length * 6);
        });

        doc.addPage();

        // --- PÁGINA 3: ANÁLISE DE PERFIL E ALOJAMENTO ---
        this.addHeader(doc, "Análise de Perfil e Alojamento", PRIMARY_COLOR, logoBase64);

        // Distribuição de Espécies
        const dogs = animals.filter(a => (a.species || '').toUpperCase().includes('C')).length;
        const cats = animals.filter(a => (a.species || '').toUpperCase().includes('G')).length;
        const totalPets = dogs + cats || 1;

        doc.setFontSize(14);
        doc.text("Distribuição por Espécie", 15, 45);

        this.drawBarChart(doc, 50, "Cães", dogs, totalPets, [37, 99, 235]); // Azul
        this.drawBarChart(doc, 65, "Gatos", cats, totalPets, [249, 115, 22]); // Laranja

        // Ocupação por Tipo de Alojamento
        const kennelsCount = { 'INTERNO': 0, 'EXTERNO': 0, 'GATIL': 0 };
        reservations.forEach(r => {
            const type = (r.accommodation_type || '').toUpperCase();
            if (type.includes('GAT')) kennelsCount['GATIL']++;
            else if (type.includes('EXTERN')) kennelsCount['EXTERNO']++;
            else kennelsCount['INTERNO']++;
        });

        doc.setFontSize(14);
        doc.text("Demanda por Tipo de Alojamento", 15, 95);

        const totalK = Object.values(kennelsCount).reduce((a, b) => a + b, 0) || 1;
        this.drawBarChart(doc, 100, "Canil Interno", kennelsCount['INTERNO'], totalK, [139, 92, 246]);
        this.drawBarChart(doc, 115, "Canil Externo", kennelsCount['EXTERNO'], totalK, [16, 185, 129]);
        this.drawBarChart(doc, 130, "Gatil Premium", kennelsCount['GATIL'], totalK, [236, 72, 153]);

        // Lista de Reservas no Período
        doc.setFontSize(14);
        doc.text("Detalhamento de Movimentação", 15, 155);

        const resBody = reservations.map(r => [
            r.animal_name,
            r.accommodation_type + " " + r.kennel_number,
            new Date(r.checkin_date).toLocaleDateString('pt-BR'),
            r.total_days,
            this.formatCurrency(r.total_value)
        ]);

        doc.autoTable({
            startY: 160,
            head: [['Pet', 'Aloj.', 'Check-in', 'Dias', 'Total']],
            body: resBody,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [51, 65, 85] },
            margin: { left: 15, right: 15 }
        });

        // Rodapé em todas as páginas
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(9);
            doc.setTextColor(148, 163, 184);
            const footerText = `Página ${i} de ${totalPages} | PetCá Intelligence Report | Gerado em ${new Date().toLocaleString('pt-BR')}`;
            doc.text(footerText, 105, 287, { align: "center" });
        }

        this.showPDFOptions(doc, `${title.replace(/\s+/g, '_')}.pdf`);
    }

    async showPDFOptions(doc, filename) {
        if (window.PDFHelper) {
            await window.PDFHelper.showPDFOptions(doc, filename);
        } else {
            // Fallback se PDFHelper não carregar
            console.warn('PDFHelper not found, using basic save');
            doc.save(filename);
        }
    }

    drawCoverPage(doc, title, subtitle, primary, secondary, logo) {
        // Fundo
        doc.setFillColor(...primary);
        doc.rect(0, 0, 210, 297, 'F');

        // Detalhes Geométricos
        doc.setFillColor(...secondary);
        doc.path('M 210,0 L 210,100 C 150,80 80,120 0,60 L 0,0 Z').fill();

        // Logo
        if (logo) {
            doc.addImage(logo, 'PNG', 75, 80, 60, 60);
        } else {
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(48);
            doc.text("PetCá", 105, 120, { align: "center" });
        }

        // Texto da Capa com wrapping para evitar overflow
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(32);
        const splitTitle = doc.splitTextToSize(title.toUpperCase(), 180);
        const titleY = 160;
        doc.text(splitTitle, 105, titleY, { align: "center" });

        // Posiciona o subtítulo dinamicamente abaixo do título (considerando quebra de linha)
        const lineHeight = 12; // Aproximado para fonte 32
        const totalTitleHeight = splitTitle.length * lineHeight;
        const subtitleY = titleY + totalTitleHeight + 2;

        doc.setFontSize(16);
        doc.setFont('helvetica', 'normal');
        doc.text(subtitle, 105, subtitleY, { align: "center" });

        // Badge Amarelo (Paleta da Logo)
        doc.setFillColor(...secondary);
        doc.roundedRect(55, subtitleY + 20, 100, 12, 6, 6, 'F');
        doc.setTextColor(0, 0, 0); // Texto em Preto
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text("EXCLUSIVO PARA GESTÃO INTERNA", 105, subtitleY + 27.5, { align: "center" });

        doc.setFontSize(10);
        doc.text(`Sistema de Inteligência PetCá v2.0`, 105, 270, { align: "center" });
    }

    addHeader(doc, title, color, logo) {
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, 210, 30, 'F');
        doc.setFillColor(...color);
        doc.rect(0, 0, 210, 1, 'F');

        if (logo) {
            doc.addImage(logo, 'PNG', 15, 5, 20, 20);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...color);
        doc.text("PetCá Systems", logo ? 40 : 15, 15);

        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184);
        doc.text(title, 195, 15, { align: "right" });
    }

    drawKPICard(doc, x, y, label, value, color) {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, y, 55, 25, 4, 4, 'FD');
        doc.setFillColor(...color);
        doc.rect(x, y + 2, 2, 21, 'F');

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.text(label, x + 6, y + 8);
        doc.setFontSize(13);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text(value, x + 6, y + 18);
    }

    drawBarChart(doc, y, label, value, total, color) {
        const maxWidth = 120;
        const barWidth = Math.max(2, (value / total) * maxWidth);
        const percent = Math.round((value / total) * 100);

        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'normal');
        doc.text(label, 15, y + 6);
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(50, y, maxWidth, 8, 2, 2, 'F');
        doc.setFillColor(...color);
        doc.roundedRect(50, y, barWidth, 8, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text(`${value} (${percent}%)`, 50 + maxWidth + 5, y + 6);
    }

    generateBusinessInsights(reservations, animals) {
        const insights = [];
        const total = reservations.length;
        if (total === 0) return ["Inicie as reservas para gerar insights de mercado."];

        const revenue = reservations.reduce((a, b) => a + (Number(b.total_value) || 0), 0);
        const avg = revenue / total;

        if (avg > 300) insights.push("Desempenho de Elite: Seu ticket médio está em patamar premium.");
        else insights.push("Oportunidade: Oferecer serviços de Banho e Tosa pode elevar seu ticket médio atual de " + this.formatCurrency(avg));

        const dogs = animals.filter(a => (a.species || '').toUpperCase().includes('C')).length;
        const cats = animals.filter(a => (a.species || '').toUpperCase().includes('G')).length;
        if (cats > dogs * 0.4) insights.push("Expansão Felina: O público de gatos é expressivo. Invista em nichos e feliway.");

        const transport = reservations.filter(r => r.transport_service == 1).length;
        if (transport < total * 0.15) insights.push("Taxi-Pet: A adesão ao transporte é baixa. Tente oferecer a primeira corrida grátis.");

        const internal = reservations.filter(r => (r.accommodation_type || '').includes('INTERNO')).length;
        if (internal > total * 0.7) insights.push("Capacidade Interna: A demanda por canis internos está alta. Cogite ampliar esta área.");

        return insights;
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    }

    showLoading() { if (window.hotelPetApp) window.hotelPetApp.showLoading(); }
    hideLoading() { if (window.hotelPetApp) window.hotelPetApp.hideLoading(); }
    showNotification(msg, type = 'success') { if (window.hotelPetApp) window.hotelPetApp.showNotification(msg, type); else alert(msg); }
}
window.ReportsManager = ReportsManager;
