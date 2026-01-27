/* ============================================================
   SISTEMA DE VISUALIZAÇÃO DE CANIS - HOTEL PET CÁ
   Versão: 2025-06-27 - UX/UI MODERNA E ELEGANTE
   Adaptado para integração com o sistema existente
============================================================ */

class KennelVisualization {
    constructor() {
        this.canis = this.initializeKennels();
        this.ocupacao = new Map();
        this.isInitialized = false;
        this.init();
    }

    initializeKennels() {
        return [
            // 5 Canis Internos
            { id: 'INTERNO-01', tipo: 'INTERNO', numero: 1, descricao: 'Área coberta climatizada', capacidade: 1 },
            { id: 'INTERNO-02', tipo: 'INTERNO', numero: 2, descricao: 'Área coberta climatizada', capacidade: 1 },
            { id: 'INTERNO-03', tipo: 'INTERNO', numero: 3, descricao: 'Área coberta climatizada', capacidade: 1 },
            { id: 'INTERNO-04', tipo: 'INTERNO', numero: 4, descricao: 'Área coberta climatizada', capacidade: 1 },
            { id: 'INTERNO-05', tipo: 'INTERNO', numero: 5, descricao: 'Área coberta climatizada', capacidade: 1 },
            
            // 6 Canis Externos
            { id: 'EXTERNO-01', tipo: 'EXTERNO', numero: 1, descricao: 'Área externa com jardim', capacidade: 1 },
            { id: 'EXTERNO-02', tipo: 'EXTERNO', numero: 2, descricao: 'Área externa com jardim', capacidade: 1 },
            { id: 'EXTERNO-03', tipo: 'EXTERNO', numero: 3, descricao: 'Área externa com jardim', capacidade: 1 },
            { id: 'EXTERNO-04', tipo: 'EXTERNO', numero: 4, descricao: 'Área externa com jardim', capacidade: 1 },
            { id: 'EXTERNO-05', tipo: 'EXTERNO', numero: 5, descricao: 'Área externa com jardim', capacidade: 1 },
            { id: 'EXTERNO-06', tipo: 'EXTERNO', numero: 6, descricao: 'Área externa com jardim', capacidade: 1 },
            
            // 4 Gatils
            { id: 'GATIL-01', tipo: 'GATIL', numero: 1, descricao: 'Área especializada para felinos', capacidade: 1 },
            { id: 'GATIL-02', tipo: 'GATIL', numero: 2, descricao: 'Área especializada para felinos', capacidade: 1 },
            { id: 'GATIL-03', tipo: 'GATIL', numero: 3, descricao: 'Área especializada para felinos', capacidade: 1 },
            { id: 'GATIL-04', tipo: 'GATIL', numero: 4, descricao: 'Área especializada para felinos', capacidade: 1 }
        ];
    }

    async init() {
        try {
            await this.carregarOcupacao();
            this.render();
            this.setupEventListeners();
            this.startAutoRefresh();
            this.isInitialized = true;
            console.log('Kennel Visualization initialized');
        } catch (error) {
            console.error('Erro ao inicializar visualização de canis:', error);
        }
    }

    async carregarOcupacao() {
        try {
            // Integração com o banco de dados existente
            if (window.db && window.db.isInitialized) {
                const reservasAtivas = await window.db.getReservations('', 'ATIVA', '');
                this.ocupacao.clear();
                
                if (Array.isArray(reservasAtivas)) {
                    reservasAtivas.forEach(reserva => {
                        const canilId = `${reserva.accommodation_type}-${String(reserva.kennel_number).padStart(2, '0')}`;
                        this.ocupacao.set(canilId, {
                            animal: reserva.animal_name,
                            tutor: reserva.tutor_name,
                            telefone: '',
                            entrada: reserva.checkin_date,
                            saida: reserva.checkout_date,
                            valor: reserva.total_value,
                            tipo_animal: reserva.animal_species || 'CÃO',
                            observacoes: ''
                        });
                    });
                }
            }
        } catch (error) {
            console.error('Erro ao carregar ocupação:', error);
        }
    }

    render() {
        const container = document.getElementById('kennels-visualization');
        if (!container) {
            console.warn('Container de visualização de canis não encontrado.');
            return;
        }

        // Agrupar canis por tipo
        const canisInternos = this.canis.filter(c => c.tipo === 'INTERNO');
        const canisExternos = this.canis.filter(c => c.tipo === 'EXTERNO');
        const gatils = this.canis.filter(c => c.tipo === 'GATIL');

        // Calcular estatísticas
        const stats = this.calcularEstatisticas();

        container.innerHTML = `
            <div class="kennels-overview">
                ${this.renderStats(stats)}
                ${this.renderKennelSection('Canis Internos', canisInternos, 'interno')}
                ${this.renderKennelSection('Canis Externos', canisExternos, 'externo')}
                ${this.renderKennelSection('Gatil', gatils, 'gatil')}
            </div>
        `;

        this.injectStyles();
    }

    renderStats(stats) {
        return `
            <div class="kennels-stats">
                <div class="stat-item">
                    <div class="stat-icon ocupados">
                        <i class="fas fa-bed"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${stats.ocupados}</h3>
                        <p>Ocupados</p>
                    </div>
                </div>
                <div class="stat-item">
                    <div class="stat-icon disponiveis">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${stats.disponiveis}</h3>
                        <p>Disponíveis</p>
                    </div>
                </div>
                <div class="stat-item">
                    <div class="stat-icon total">
                        <i class="fas fa-home"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${stats.total}</h3>
                        <p>Total</p>
                    </div>
                </div>
                <div class="stat-item">
                    <div class="stat-icon taxa">
                        <i class="fas fa-percentage"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${stats.taxaOcupacao}%</h3>
                        <p>Taxa de Ocupação</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderKennelSection(titulo, canis, tipo) {
        return `
            <div class="kennel-section">
                <h3 class="section-title">
                    <i class="fas fa-${tipo === 'gatil' ? 'cat' : 'dog'}"></i>
                    ${titulo}
                    <span class="section-count">${canis.length} unidades</span>
                </h3>
                <div class="kennels-grid ${tipo}">
                    ${canis.map(canil => this.renderKennel(canil)).join('')}
                </div>
            </div>
        `;
    }

    renderKennel(canil) {
        const ocupacao = this.ocupacao.get(canil.id);
        const isOcupado = !!ocupacao;
        const statusClass = isOcupado ? 'ocupado' : 'disponivel';
        const tipoClass = canil.tipo.toLowerCase();

        return `
            <div class="kennel-card ${statusClass} ${tipoClass}" data-kennel-id="${canil.id}">
                <div class="kennel-header">
                    <div class="kennel-number">${canil.numero}</div>
                    <div class="kennel-status">
                        <i class="fas fa-${isOcupado ? 'paw' : 'check'}"></i>
                        ${isOcupado ? 'Ocupado' : 'Disponível'}
                    </div>
                </div>
                
                <div class="kennel-content">
                    ${isOcupado ? `
                        <div class="animal-info">
                            <div class="animal-name">
                                <i class="fas fa-${ocupacao.tipo_animal === 'GATO' ? 'cat' : 'dog'}"></i>
                                ${ocupacao.animal}
                            </div>
                            <div class="tutor-info">
                                <strong>Tutor:</strong> ${ocupacao.tutor}
                            </div>
                            <div class="periodo-info">
                                <strong>Período:</strong><br>
                                ${this.formatDate(ocupacao.entrada)} até ${this.formatDate(ocupacao.saida)}
                            </div>
                        </div>
                    ` : `
                        <div class="disponivel-info">
                            <p>${canil.descricao}</p>
                            <div class="button-container">
                                <button class="btn-reservar-small" onclick="kennelVisualization.reservarCanil('${canil.id}')">
                                    <i class="fas fa-plus"></i>
                                    Reservar
                                </button>
                            </div>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    calcularEstatisticas() {
        const total = this.canis.length;
        const ocupados = this.ocupacao.size;
        const disponiveis = total - ocupados;
        const taxaOcupacao = total > 0 ? Math.round((ocupados / total) * 100) : 0;

        return { total, ocupados, disponiveis, taxaOcupacao };
    }

    setupEventListeners() {
        // Auto-refresh a cada 30 segundos
        this.refreshInterval = setInterval(() => {
            this.refresh();
        }, 30000);
    }

    startAutoRefresh() {
        // Refresh inicial após 5 segundos
        setTimeout(() => {
            this.refresh();
        }, 5000);
    }

    async refresh() {
        try {
            await this.carregarOcupacao();
            this.render();
        } catch (error) {
            console.error('Erro ao atualizar visualização:', error);
        }
    }

    reservarCanil(canilId) {
        // Integração com o sistema de reservas
        if (window.hotelPetApp) {
            window.hotelPetApp.navigateToSection('reservations');
            
            // Aguardar um pouco para a seção carregar
            setTimeout(() => {
                if (window.reservationsManager) {
                    window.reservationsManager.openReservationModal();
                }
            }, 500);
        }
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

    injectStyles() {
        if (document.getElementById('kennels-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'kennels-styles';
        styles.textContent = `
            /* Estilos para Visualização de Canis - Otimizado para Zoom 67% */
            .kennels-overview {
                padding: 0;
                max-width: 100%;
            }

            .kennels-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 1.25rem;
                margin-bottom: 2rem;
            }

            .stat-item {
                background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                padding: 1.25rem;
                border-radius: 0.875rem;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
                display: flex;
                align-items: center;
                gap: 1rem;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }

            .stat-item:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
            }

            .stat-icon {
                width: 50px;
                height: 50px;
                border-radius: 0.875rem;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.25rem;
                color: white;
            }

            .stat-icon.ocupados { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
            .stat-icon.disponiveis { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
            .stat-icon.total { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
            .stat-icon.taxa { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); }

            .stat-info h3 {
                font-size: 1.75rem;
                font-weight: 700;
                color: #1e293b;
                margin-bottom: 0.25rem;
            }

            .stat-info p {
                color: #64748b;
                font-size: 0.8rem;
                font-weight: 500;
            }

            .kennel-section {
                margin-bottom: 2.5rem;
            }

            .section-title {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                font-size: 1.25rem;
                font-weight: 600;
                color: #1e293b;
                margin-bottom: 1.25rem;
                padding-bottom: 0.75rem;
                border-bottom: 2px solid #e2e8f0;
            }

            .section-count {
                background: #e2e8f0;
                color: #64748b;
                padding: 0.25rem 0.75rem;
                border-radius: 9999px;
                font-size: 0.7rem;
                font-weight: 500;
                margin-left: auto;
            }

            .kennels-grid {
                display: grid;
                gap: 1.25rem;
                grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            }

            .kennel-card {
                background: white;
                border-radius: 0.875rem;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
                overflow: hidden;
                transition: all 0.3s ease;
                border: 2px solid transparent;
                min-height: 160px;
                display: flex;
                flex-direction: column;
            }

            .kennel-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
            }

            .kennel-card.ocupado {
                border-color: #ef4444;
            }

            .kennel-card.disponivel {
                border-color: #10b981;
            }

            .kennel-header {
                padding: 1rem 1.25rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #e2e8f0;
                min-height: 50px;
            }

            .kennel-card.ocupado .kennel-header {
                background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
            }

            .kennel-card.disponivel .kennel-header {
                background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            }

            .kennel-number {
                font-size: 1.3rem;
                font-weight: 700;
                color: #1e293b;
            }

            .kennel-status {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.8rem;
                font-weight: 600;
                padding: 0.4rem 0.8rem;
                border-radius: 9999px;
            }

            .kennel-card.ocupado .kennel-status {
                background: #ef4444;
                color: white;
            }

            .kennel-card.disponivel .kennel-status {
                background: #10b981;
                color: white;
            }

            .kennel-content {
                padding: 1.25rem;
                display: flex;
                flex-direction: column;
                flex-grow: 1;
            }

            .animal-info {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }

            .animal-name {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 1rem;
                font-weight: 600;
                color: #1e293b;
            }

            .tutor-info, .periodo-info {
                font-size: 0.8rem;
                color: #64748b;
                line-height: 1.5;
            }

            .disponivel-info {
                display: flex;
                flex-direction: column;
                height: 100%;
                text-align: center;
            }

            .disponivel-info p {
                color: #64748b;
                margin-bottom: 0.75rem;
                font-size: 0.8rem;
                line-height: 1.4;
                flex-grow: 1;
            }

            /* Botão Reservar Pequeno e Centralizado */
            .btn-reservar-small {
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                color: white;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 0.375rem;
                font-weight: 500;
                font-size: 0.75rem;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 0.375rem;
                justify-content: center;
                min-width: 80px;
                box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
            }

            .btn-reservar-small:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            }

            .btn-reservar-small:active {
                transform: translateY(0);
                box-shadow: 0 2px 6px rgba(59, 130, 246, 0.2);
            }

            .btn-reservar-small i {
                font-size: 0.625rem;
            }

            /* Container do botão para centralização */
            .button-container {
                display: flex;
                justify-content: center;
                align-items: flex-end;
                margin-top: auto;
                padding-top: 0.75rem;
            }

            /* Responsividade */
            @media (max-width: 768px) {
                .kennels-stats {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1rem;
                }

                .stat-item {
                    padding: 1rem;
                }

                .stat-icon {
                    width: 45px;
                    height: 45px;
                    font-size: 1.125rem;
                }

                .stat-info h3 {
                    font-size: 1.5rem;
                }

                .kennels-grid {
                    grid-template-columns: 1fr;
                    gap: 1rem;
                }

                .section-title {
                    font-size: 1.125rem;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 0.5rem;
                }

                .section-count {
                    margin-left: 0;
                }

                .btn-reservar-small {
                    padding: 0.4rem 0.8rem;
                    font-size: 0.7rem;
                    min-width: 70px;
                }
                
                .btn-reservar-small i {
                    font-size: 0.6rem;
                }
                
                .button-container {
                    padding-top: 0.5rem;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}

// Inicializar quando a seção de overview for carregada
window.kennelVisualization = null;
