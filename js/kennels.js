/* ============================================================
   SISTEMA DE VISUALIZAÇÃO DE CANIS - HOTEL PET CÁ
   Versão: 2025-06-27 - UX/UI MODERNA E ELEGANTE
   Adaptado para integração com o sistema existente
============================================================ */

class KennelVisualization {
    constructor() {
        this.canis = [];
        this.ocupacao = new Map();
        this.isInitialized = false;
        this.init();
    }

    // Removemos a inicialização estática e passamos a carregar do DB
    async initializeKennels() {
        if (window.db && window.db.isInitialized) {
            this.canis = await window.db.getAllKennels();
        }
    }

    async init() {
        try {
            await this.initializeKennels();
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
            if (window.db && window.db.isInitialized) {
                const reservasAtivas = await window.db.getReservations('', 'ATIVA', '');
                this.ocupacao.clear();

                if (Array.isArray(reservasAtivas)) {
                    reservasAtivas.forEach(reserva => {
                        // O ID do canil agora é baseado no tipo e número
                        const canilId = `${reserva.accommodation_type}-${reserva.kennel_number}`;
                        this.ocupacao.set(canilId, {
                            animal: reserva.animal_name,
                            tutor: reserva.tutor_name,
                            entrada: reserva.checkin_date,
                            saida: reserva.checkout_date,
                            tipo_animal: reserva.animal_species || 'CÃO',
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
        const canisInternos = this.canis.filter(c => c.type === 'INTERNO');
        const canisExternos = this.canis.filter(c => c.type === 'EXTERNO');
        const gatils = this.canis.filter(c => c.type === 'GATIL');

        // Calcular estatísticas
        const stats = this.calcularEstatisticas();

        container.innerHTML = `
            <div class="kennels-overview">
                ${this.renderStats(stats)}
                ${this.renderKennelSection('Canis Internos', canisInternos, 'INTERNO')}
                ${this.renderKennelSection('Canis Externos', canisExternos, 'EXTERNO')}
                ${this.renderKennelSection('Gatil', gatils, 'GATIL')}
            </div>
        `;

        this.injectStyles();
    }

    renderStats(stats) {
        // ... (mantido o mesmo)
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
                        <p>Taxa</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderKennelSection(titulo, canis, tipo) {
        const tipoClass = tipo.toLowerCase();
        const icon = tipo === 'GATIL' ? 'cat' : 'dog';
        
        // Renderiza todos os canis existentes
        const kennelCards = canis.map(canil => this.renderKennel(canil)).join('');

        // Adiciona o botão de expansão no final
        const expansionButton = `
            <div class="kennel-card expansion-card" onclick="kennelVisualization.openAddKennelModal('${tipo}')">
                <div class="kennel-content">
                    <button class="btn-reservar-small expansion-btn">
                        <i class="fas fa-plus"></i>
                    </button>
                    <div class="expansion-text">Adicionar ${tipo === 'GATIL' ? 'Gatil' : 'Canil'}</div>
                </div>
            </div>
        `;

        return `
            <div class="kennel-section">
                <h3 class="section-title">
                    <i class="fas fa-${icon}"></i>
                    ${titulo}
                    <span class="section-count">${canis.length}</span>
                </h3>
                <div class="kennels-grid ${tipoClass}">
                    ${kennelCards}
                    ${expansionButton}
                </div>
            </div>
        `;
    }

    renderKennel(canil) {
        const canilId = `${canil.type}-${canil.number}`;
        const ocupacao = this.ocupacao.get(canilId);
        const isOcupado = !!ocupacao;
        const statusClass = isOcupado ? 'ocupado' : 'disponivel';
        const tipoClass = canil.type.toLowerCase();

        return `
            <div class="kennel-card ${statusClass} ${tipoClass}" data-kennel-id="${canilId}">
                <div class="kennel-header">
                    <div class="kennel-number">${canil.number}</div>
                    <div class="kennel-status">
                        <i class="fas fa-${isOcupado ? 'paw' : 'check'}"></i>
                    </div>
                </div>
                
                <div class="kennel-content">
                    ${isOcupado ? `
                        <div class="animal-info">
                            <div class="animal-name">
                                ${ocupacao.animal}
                            </div>
                            <div class="tutor-info">
                                ${ocupacao.tutor}
                            </div>
                        </div>
                    ` : `
                        <div class="disponivel-info">
                            <button class="btn-reservar-small" onclick="kennelVisualization.reservarCanil('${canilId}')">
                                <i class="fas fa-plus"></i>
                            </button>
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
        
        // Adicionar listener para o modal de adição de canil
        this.createAddKennelModal();
        document.getElementById('add-kennel-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addNewKennel();
        });
        document.getElementById('cancel-add-kennel')?.addEventListener('click', () => this.closeAddKennelModal());
    }

    startAutoRefresh() {
        setTimeout(() => {
            this.refresh();
        }, 5000);
    }

    async refresh() {
        try {
            await this.initializeKennels(); // Recarrega a lista de canis
            await this.carregarOcupacao();
            this.render();
            // Atualiza o Dashboard se estiver ativo
            if (window.dashboardManager && window.dashboardManager.isInitialized) {
                window.dashboardManager.loadDashboardStats();
            }
        } catch (error) {
            console.error('Erro ao atualizar visualização:', error);
        }
    }

    reservarCanil(canilId) {
        const [tipo, numeroStr] = canilId.split('-');
        const numero = parseInt(numeroStr, 10);

        if (window.hotelPetApp) {
            window.hotelPetApp.navigateToSection('reservations');

            setTimeout(() => {
                if (window.reservationsManager) {
                    window.reservationsManager.openReservationModal({ tipo, numero });
                }
            }, 500);
        }
    }

    // --- NOVOS MÉTODOS PARA ADICIONAR CANIL ---

    createAddKennelModal() {
        if (document.getElementById('add-kennel-modal')) return;

        const modalHTML = `
            <div id="add-kennel-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="add-kennel-modal-title">Adicionar Novo Alojamento</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <form id="add-kennel-form">
                        <input type="hidden" id="new-kennel-type">
                        <div class="form-group">
                            <label for="new-kennel-type-display">Tipo de Alojamento</label>
                            <input type="text" id="new-kennel-type-display" readonly disabled>
                        </div>
                        <div class="form-group">
                            <label for="new-kennel-number">Próximo Número</label>
                            <input type="number" id="new-kennel-number" readonly disabled>
                        </div>
                        <div class="form-group">
                            <label for="new-kennel-description">Descrição (Opcional)</label>
                            <textarea id="new-kennel-description" rows="2"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" id="cancel-add-kennel">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Adicionar Canil</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    async openAddKennelModal(type) {
        const modal = document.getElementById('add-kennel-modal');
        const title = document.getElementById('add-kennel-modal-title');
        const typeDisplay = document.getElementById('new-kennel-type-display');
        const typeInput = document.getElementById('new-kennel-type');
        const numberInput = document.getElementById('new-kennel-number');
        
        if (!modal || !typeDisplay || !typeInput || !numberInput) return;

        const nextNumber = await window.db.getNextKennelNumber(type);
        
        typeInput.value = type;
        typeDisplay.value = type === 'GATIL' ? 'Gatil' : `Canil ${type.toLowerCase()}`;
        numberInput.value = nextNumber;
        
        title.textContent = `Adicionar ${typeDisplay.value}`;
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeAddKennelModal() {
        document.getElementById('add-kennel-modal')?.classList.remove('active');
        document.body.style.overflow = '';
        document.getElementById('add-kennel-form')?.reset();
    }

    async addNewKennel() {
        const type = document.getElementById('new-kennel-type').value;
        const number = parseInt(document.getElementById('new-kennel-number').value);
        const description = document.getElementById('new-kennel-description').value || '';

        if (!type || isNaN(number)) {
            window.hotelPetApp.showNotification('Erro nos dados do canil.', 'error');
            return;
        }

        try {
            await window.db.addKennel(type, number, description);
            window.hotelPetApp.showNotification(`✅ ${type} ${number} adicionado com sucesso!`, 'success');
            this.closeAddKennelModal();
            await this.refresh(); // Recarrega a visualização e o dashboard
            
            // Atualiza o ReservationsManager para incluir o novo canil no dropdown
            if (window.reservationsManager) {
                window.reservationsManager.updateAccommodationList();
            }

        } catch (e) {
            window.hotelPetApp.showNotification('Erro ao adicionar canil. Verifique se o número já existe.', 'error');
            console.error(e);
        }
    }

    injectStyles() {
        if (document.getElementById('kennels-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'kennels-styles';
        styles.textContent = `
            /* Estilos Ultra Compactos para Mobile - Hotel Pet CÁ */
            .kennels-overview {
                padding: 0;
                max-width: 100%;
                overflow-x: hidden;
            }

            .kennels-stats {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 0.4rem;
                margin-bottom: 1rem;
                width: 100%;
            }

            .stat-item {
                background: white;
                padding: 0.5rem;
                border-radius: 0.6rem;
                box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.2rem;
                text-align: center;
            }

            .stat-icon {
                width: 28px;
                height: 28px;
                min-width: 28px;
                border-radius: 0.4rem;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.8rem;
                color: white;
            }

            .stat-icon.ocupados { background: #ef4444; }
            .stat-icon.disponiveis { background: #10b981; }
            .stat-icon.total { background: #3b82f6; }
            .stat-icon.taxa { background: #8b5cf6; }

            .stat-info h3 {
                font-size: 0.9rem;
                font-weight: 700;
                color: #1e293b;
                line-height: 1;
                margin-bottom: 0.1rem;
            }

            .stat-info p {
                color: #64748b;
                font-size: 0.6rem;
                font-weight: 500;
                text-transform: uppercase;
            }

            .kennel-section {
                margin-bottom: 1.5rem;
            }

            .section-title {
                display: flex;
                align-items: center;
                gap: 0.4rem;
                font-size: 0.9rem;
                font-weight: 600;
                color: #1e293b;
                margin-bottom: 0.75rem;
                padding-bottom: 0.4rem;
                border-bottom: 1px solid #e2e8f0;
            }

            .section-count {
                background: #e2e8f0;
                color: #64748b;
                padding: 0.1rem 0.4rem;
                border-radius: 9999px;
                font-size: 0.6rem;
                margin-left: auto;
            }

            .kennels-grid {
                display: grid;
                gap: 0.5rem;
                grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            }

            .kennel-card {
                background: white;
                border-radius: 0.6rem;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                overflow: hidden;
                border: 1px solid #f1f5f9;
                min-height: 80px;
                display: flex;
                flex-direction: column;
                transition: all 0.2s ease;
            }
            
            .kennel-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            }

            .kennel-header {
                padding: 0.4rem 0.6rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #f1f5f9;
                background: #f8fafc;
            }

            .kennel-number {
                font-size: 0.85rem;
                font-weight: 700;
                color: #1e293b;
            }

            .kennel-status i {
                font-size: 0.7rem;
            }

            .kennel-card.ocupado .kennel-status i { color: #ef4444; }
            .kennel-card.disponivel .kennel-status i { color: #10b981; }

            .kennel-content {
                padding: 0.5rem;
                display: flex;
                flex-direction: column;
                justify-content: center;
                flex-grow: 1;
                text-align: center;
            }

            .animal-name {
                font-size: 0.75rem;
                font-weight: 700;
                color: #1e293b;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .tutor-info {
                font-size: 0.65rem;
                color: #64748b;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .btn-reservar-small {
                background: #2563eb;
                color: white;
                border: none;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                font-size: 0.7rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto;
            }
            
            /* Estilos para o botão de expansão */
            .kennel-card.expansion-card {
                background: #e0e7ff;
                border: 2px dashed #a5b4fc;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .kennel-card.expansion-card:hover {
                background: #c7d2fe;
            }
            
            .expansion-btn {
                background: #2563eb !important;
                width: 40px !important;
                height: 40px !important;
                font-size: 1rem !important;
                margin: 0 auto 0.2rem !important;
            }
            
            .expansion-text {
                font-size: 0.65rem;
                font-weight: 600;
                color: #3730a3;
                margin-top: 0.2rem;
            }

            /* Ultra Mobile Adjustments */
            @media (max-width: 360px) {
                .kennels-stats { gap: 0.2rem; }
                .stat-item { padding: 0.3rem; }
                .stat-info h3 { font-size: 0.8rem; }
                .kennels-grid { grid-template-columns: repeat(2, 1fr); }
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