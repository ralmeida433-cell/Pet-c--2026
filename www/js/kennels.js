/* ============================================================
   SISTEMA DE VISUALIZAÇÃO DE CANIS - HOTEL PET CÁ
   Versão: 2.3 - DESIGN PERSONALIZADO (CASINHAS)
============================================================ */

class KennelVisualization {
    constructor() {
        this.canis = [];
        this.ocupacao = new Map();
        this.isInitialized = false;
        this.init();
    }

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
                        const canilId = `${reserva.accommodation_type}-${reserva.kennel_number}`;
                        this.ocupacao.set(canilId, {
                            animal: reserva.animal_name,
                            tutor: reserva.tutor_name,
                            entrada: reserva.checkin_date,
                            saida: reserva.checkout_date,
                            tipo_animal: reserva.animal_species || 'CÃO',
                            animal_id: reserva.animal_id // Adicionando ID do animal
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
        if (!container) return;

        const canisInternos = this.canis.filter(c => c.type === 'INTERNO');
        const canisExternos = this.canis.filter(c => c.type === 'EXTERNO');
        const gatils = this.canis.filter(c => c.type === 'GATIL');

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
        return `
            <div class="kennels-stats">
                <div class="stat-item ocupados">
                    <div class="stat-icon"><i class="fas fa-bed"></i></div>
                    <div class="stat-info">
                        <h3>${stats.ocupados}</h3>
                        <p>Ocupados</p>
                    </div>
                </div>
                <div class="stat-item disponiveis">
                    <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
                    <div class="stat-info">
                        <h3>${stats.disponiveis}</h3>
                        <p>Disponíveis</p>
                    </div>
                </div>
                <div class="stat-item total">
                    <div class="stat-icon"><i class="fas fa-home"></i></div>
                    <div class="stat-info">
                        <h3>${stats.total}</h3>
                        <p>Total</p>
                    </div>
                </div>
                <div class="stat-item taxa">
                    <div class="stat-icon"><i class="fas fa-percentage"></i></div>
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
        const kennelCards = canis.map(canil => this.renderKennel(canil)).join('');

        const expansionButton = `
            <div class="kennel-card expansion-card sutil" onclick="kennelVisualization.openAddKennelModal('${tipo}')" title="Adicionar Novo">
                <div class="expansion-content">
                    <i class="fas fa-plus"></i>
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
        
        const clickAction = isOcupado 
            ? `kennelVisualization.viewAnimalProfile(${ocupacao.animal_id})` 
            : `kennelVisualization.reservarCanil('${canilId}')`;

        return `
            <div class="kennel-card ${statusClass} ${tipoClass}" data-kennel-id="${canilId}" onclick="${clickAction}">
                <div class="kennel-roof"></div>
                <div class="kennel-header">
                    <span class="kennel-number">${canil.number}</span>
                    <div class="kennel-actions">
                        ${!isOcupado ? `
                            <button class="action-btn delete-kennel-btn" onclick="event.stopPropagation(); kennelVisualization.deleteKennel(${canil.id}, '${canil.type} ${canil.number}')">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
                        <i class="fas fa-${isOcupado ? 'paw' : 'check'} status-icon"></i>
                    </div>
                </div>
                <div class="kennel-content">
                    ${isOcupado ? `
                        <div class="animal-info">
                            <div class="animal-name">${ocupacao.animal}</div>
                            <div class="tutor-info">${ocupacao.tutor}</div>
                        </div>
                    ` : `
                        <button class="btn-reservar-icon" onclick="event.stopPropagation(); kennelVisualization.reservarCanil('${canilId}')">
                            <i class="fas fa-plus"></i>
                        </button>
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
        this.refreshInterval = setInterval(() => this.refresh(), 30000);
        this.createAddKennelModal();
        document.getElementById('add-kennel-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addNewKennel();
        });
        document.getElementById('cancel-add-kennel')?.addEventListener('click', () => this.closeAddKennelModal());
    }

    startAutoRefresh() {
        setTimeout(() => this.refresh(), 5000);
    }

    async refresh() {
        try {
            await this.initializeKennels();
            await this.carregarOcupacao();
            this.render();
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
    
    viewAnimalProfile(animalId) {
        if (window.hotelPetApp && window.animalProfileManager) {
            window.hotelPetApp.navigateToSection('animal-profile');
            window.animalProfileManager.loadProfile(animalId);
        }
    }

    async deleteKennel(id, name) {
        if (confirm(`Excluir o alojamento ${name}?`)) {
            try {
                await window.db.deleteKennel(id);
                window.hotelPetApp.showNotification(`🗑️ ${name} excluído.`, 'success');
                await this.refresh();
                if (window.reservationsManager) window.reservationsManager.updateAccommodationList();
            } catch (e) {
                window.hotelPetApp.showNotification('Erro ao excluir.', 'error');
            }
        }
    }

    createAddKennelModal() {
        if (document.getElementById('add-kennel-modal')) return;
        const modalHTML = `
            <div id="add-kennel-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="add-kennel-modal-title">Novo Alojamento</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <form id="add-kennel-form">
                        <input type="hidden" id="new-kennel-type">
                        <div class="form-group">
                            <label>Tipo</label>
                            <input type="text" id="new-kennel-type-display" readonly disabled>
                        </div>
                        <div class="form-group">
                            <label>Número</label>
                            <input type="number" id="new-kennel-number" readonly disabled>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" id="cancel-add-kennel">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Adicionar</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    async openAddKennelModal(type) {
        const modal = document.getElementById('add-kennel-modal');
        try {
            const nextNumber = await window.db.getNextKennelNumber(type);
            document.getElementById('new-kennel-type').value = type;
            document.getElementById('new-kennel-type-display').value = type === 'GATIL' ? 'Gatil' : `Canil ${type.toLowerCase()}`;
            document.getElementById('new-kennel-number').value = nextNumber;
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        } catch (e) { console.error(e); }
    }

    closeAddKennelModal() {
        document.getElementById('add-kennel-modal')?.classList.remove('active');
        document.body.style.overflow = '';
    }

    async addNewKennel() {
        const type = document.getElementById('new-kennel-type').value;
        const number = parseInt(document.getElementById('new-kennel-number').value);
        try {
            await window.db.addKennel(type, number, '');
            window.hotelPetApp.showNotification(`✅ Adicionado!`, 'success');
            this.closeAddKennelModal();
            await this.refresh();
            if (window.reservationsManager) window.reservationsManager.updateAccommodationList();
        } catch (e) { window.hotelPetApp.showNotification('Erro ao adicionar.', 'error'); }
    }

    injectStyles() {
        if (document.getElementById('kennels-personalized-styles')) return;
        const styles = document.createElement('style');
        styles.id = 'kennels-personalized-styles';
        styles.textContent = `
            /* Estatísticas com melhor espaçamento */
            .kennels-stats {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 1rem;
                margin-bottom: 2rem;
            }
            @media (min-width: 600px) {
                .kennels-stats { grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
            }

            .stat-item {
                background: white;
                padding: 1.25rem;
                border-radius: 1.25rem;
                display: flex;
                align-items: center;
                gap: 1rem;
                box-shadow: 0 4px 15px rgba(0,0,0,0.05);
                border: 1px solid #f1f5f9;
            }

            .stat-item .stat-icon {
                width: 44px; height: 44px;
                border-radius: 12px;
                display: flex; align-items: center; justify-content: center;
                font-size: 1.2rem; color: white;
            }

            .stat-item.ocupados .stat-icon { background: #ef4444; }
            .stat-item.disponiveis .stat-icon { background: #10b981; }
            .stat-item.total .stat-icon { background: #3b82f6; }
            .stat-item.taxa .stat-icon { background: #8b5cf6; }

            .stat-info h3 { font-size: 1.5rem; margin: 0; line-height: 1; }
            .stat-info p { font-size: 0.75rem; margin: 0; color: #64748b; text-transform: uppercase; font-weight: 600; }

            /* Grid de Casinhas */
            .kennels-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
                gap: 1.5rem 1rem;
                padding-top: 1rem;
            }

            /* Card Formato Casinha */
            .kennel-card {
                position: relative;
                background: white;
                border-radius: 0 0 1rem 1rem;
                border: 2px solid #e2e8f0;
                min-height: 100px;
                display: flex;
                flex-direction: column;
                margin-top: 25px; /* Espaço para o telhado */
                transition: all 0.3s ease;
                cursor: pointer;
            }

            /* Telhado da Casinha */
            .kennel-roof {
                position: absolute;
                top: -26px; left: -2px; right: -2px;
                height: 26px;
                background: inherit;
                clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
                border: 2px solid #e2e8f0;
                border-bottom: none;
                background: #f8fafc;
                z-index: 1;
            }

            .kennel-card.ocupado { border-color: #fecaca; background: #fff1f2; }
            .kennel-card.ocupado .kennel-roof { background: #fff1f2; border-color: #fecaca; }
            
            .kennel-card.disponivel { border-color: #bbf7d0; background: #f0fdf4; }
            .kennel-card.disponivel .kennel-roof { background: #f0fdf4; border-color: #bbf7d0; }

            .kennel-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }

            .kennel-header {
                padding: 0.5rem;
                display: flex; justify-content: space-between; align-items: center;
                z-index: 2;
            }

            .kennel-number { font-weight: 800; font-size: 1rem; color: #1e293b; }
            
            .status-icon { font-size: 0.8rem; }
            .ocupado .status-icon { color: #ef4444; }
            .disponivel .status-icon { color: #10b981; }

            .kennel-content {
                padding: 0.5rem;
                flex-grow: 1;
                display: flex; flex-direction: column; justify-content: center;
                text-align: center;
            }

            .animal-name { font-weight: 700; font-size: 0.85rem; color: #1e293b; line-height: 1.2; }
            .tutor-info { font-size: 0.65rem; color: #64748b; margin-top: 2px; }

            .btn-reservar-icon {
                background: #2563eb; color: white; border: none;
                width: 32px; height: 32px; border-radius: 50%;
                margin: 0 auto; display: flex; align-items: center; justify-content: center;
                cursor: pointer; transition: all 0.2s;
            }
            .btn-reservar-icon:hover { transform: scale(1.1); background: #1d4ed8; }

            /* Botão de Adicionar Sutil */
            .expansion-card.sutil {
                background: transparent; border: 2px dashed #cbd5e1;
                margin-top: 25px; min-height: 100px;
                display: flex; align-items: center; justify-content: center;
            }
            .expansion-card.sutil .kennel-roof { display: none; }
            .expansion-card.sutil:hover { border-color: #3b82f6; background: rgba(59,130,246,0.05); }
            
            .expansion-content i { font-size: 1.5rem; color: #94a3b8; transition: color 0.2s; }
            .expansion-card.sutil:hover i { color: #3b82f6; }

            .delete-kennel-btn {
                background: none; border: none; color: #94a3b8; 
                padding: 4px; cursor: pointer; font-size: 0.8rem;
            }
            .delete-kennel-btn:hover { color: #ef4444; transform: scale(1.2); }
        `;
        document.head.appendChild(styles);
    }
}
window.kennelVisualization = null;