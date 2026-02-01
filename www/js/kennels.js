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
        // Extrair tipo e número do canil do ID (formato: TIPO-NUMERO)
        const [tipo, numeroStr] = canilId.split('-');
        const numero = parseInt(numeroStr, 10);

        // Integração com o sistema de reservas
        if (window.hotelPetApp) {
            window.hotelPetApp.navigateToSection('reservations');

            // Aguardar um pouco para a seção carregar
            setTimeout(() => {
                if (window.reservationsManager) {
                    // Abrir modal com contexto do alojamento pré-selecionado
                    window.reservationsManager.openReservationModal({ tipo, numero });
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
            /* Estilos para Visualização de Canis - Otimizado para APK Nativo */
            .kennels-overview {
                padding: 0;
                max-width: 100%;
                overflow-x: hidden;
            }

            .kennels-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                gap: 0.75rem;
                margin-bottom: 1.5rem;
                width: 100%;
            }

            .stat-item {
                background: white;
                padding: 1rem;
                border-radius: 0.75rem;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
                display: flex;
                align-items: center;
                gap: 0.75rem;
                min-width: 0; /* Permite encolher no grid */
            }

            .stat-icon {
                width: 40px;
                height: 40px;
                min-width: 40px;
                border-radius: 0.5rem;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1rem;
                color: white;
            }

            .stat-icon.ocupados { background: #ef4444; }
            .stat-icon.disponiveis { background: #10b981; }
            .stat-icon.total { background: #3b82f6; }
            .stat-icon.taxa { background: #8b5cf6; }

            .stat-info h3 {
                font-size: 1.25rem;
                font-weight: 700;
                color: #1e293b;
                line-height: 1;
                margin-bottom: 0.25rem;
            }

            .stat-info p {
                color: #64748b;
                font-size: 0.7rem;
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .kennel-section {
                margin-bottom: 2rem;
            }

            .section-title {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 1.1rem;
                font-weight: 600;
                color: #1e293b;
                margin-bottom: 1rem;
                padding-bottom: 0.5rem;
                border-bottom: 1px solid #e2e8f0;
            }

            .section-count {
                background: #e2e8f0;
                color: #64748b;
                padding: 0.15rem 0.5rem;
                border-radius: 9999px;
                font-size: 0.65rem;
                font-weight: 500;
                margin-left: auto;
            }

            .kennels-grid {
                display: grid;
                gap: 1rem;
                grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            }

            .kennel-card {
                background: white;
                border-radius: 0.75rem;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                overflow: hidden;
                transition: all 0.2s ease;
                border: 1px solid transparent;
                min-height: 140px;
                display: flex;
                flex-direction: column;
            }

            .kennel-card.ocupado { border-color: #fee2e2; }
            .kennel-card.disponivel { border-color: #dcfce7; }

            .kennel-header {
                padding: 0.75rem 1rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #f1f5f9;
            }

            .kennel-card.ocupado .kennel-header { background: #fef2f2; }
            .kennel-card.disponivel .kennel-header { background: #f0fdf4; }

            .kennel-number {
                font-size: 1.1rem;
                font-weight: 700;
                color: #1e293b;
            }

            .kennel-status {
                display: flex;
                align-items: center;
                gap: 0.35rem;
                font-size: 0.7rem;
                font-weight: 600;
                padding: 0.25rem 0.6rem;
                border-radius: 9999px;
            }

            .kennel-card.ocupado .kennel-status { background: #ef4444; color: white; }
            .kennel-card.disponivel .kennel-status { background: #10b981; color: white; }

            .kennel-content {
                padding: 1rem;
                display: flex;
                flex-direction: column;
                flex-grow: 1;
            }

            .animal-info {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .animal-name {
                display: flex;
                align-items: center;
                gap: 0.4rem;
                font-size: 0.9rem;
                font-weight: 600;
                color: #1e293b;
            }

            .tutor-info, .periodo-info {
                font-size: 0.75rem;
                color: #64748b;
                line-height: 1.4;
            }

            .disponivel-info {
                display: flex;
                flex-direction: column;
                height: 100%;
                text-align: center;
                justify-content: center;
            }

            .disponivel-info p {
                color: #94a3b8;
                font-size: 0.75rem;
                margin-bottom: 0.75rem;
            }

            .btn-reservar-small {
                background: #2563eb;
                color: white;
                border: none;
                padding: 0.4rem 0.75rem;
                border-radius: 0.375rem;
                font-weight: 600;
                font-size: 0.7rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 0.35rem;
                justify-content: center;
                margin: 0 auto;
            }

            /* Mobile Adjustments */
            @media (max-width: 480px) {
                .kennels-stats {
                    grid-template-columns: repeat(2, 1fr);
                }
                
                .stat-info h3 {
                    font-size: 1.1rem;
                }

                .kennels-grid {
                    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
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