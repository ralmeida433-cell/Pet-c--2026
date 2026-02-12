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
                            animal_id: reserva.animal_id,
                            photo_url: reserva.photo_url,
                            sexo: reserva.animal_sex
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
    }

    renderStats(stats) {
        return `
            <div class="kennels-stats">
                <div class="stat-item ocupados">
                    <div class="stat-icon"><i class="fas fa-bed"></i></div>
                    <div class="stat-info">
                        <h3>${stats.ocupados}</h3>
                        <p>OCUPADOS</p>
                    </div>
                </div>
                <div class="stat-item disponiveis">
                    <div class="stat-icon"><i class="fas fa-check"></i></div>
                    <div class="stat-info">
                        <h3>${stats.disponiveis}</h3>
                        <p>DISPONÍVEIS</p>
                    </div>
                </div>
                <div class="stat-item total">
                    <div class="stat-icon"><i class="fas fa-home"></i></div>
                    <div class="stat-info">
                        <h3>${stats.total}</h3>
                        <p>TOTAL</p>
                    </div>
                </div>
                <div class="stat-item taxa">
                    <div class="stat-icon"><i class="fas fa-percentage"></i></div>
                    <div class="stat-info">
                        <h3>${stats.taxaOcupacao}%</h3>
                        <p>TAXA</p>
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
            <div class="kennel-card expansion-card" onclick="kennelVisualization.openAddKennelModal('${tipo}')" title="Adicionar Novo Alojamento">
                <i class="fas fa-plus"></i>
            </div>
        `;

        return `
            <div class="kennel-section">
                <h3 class="section-title">
                    <i class="fas fa-${icon}"></i>
                    <span>${titulo} ${canis.length}</span>
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

        // Gender Icon Logic
        let genderIcon = '';
        if (isOcupado && ocupacao.sexo) {
            const sex = ocupacao.sexo.toUpperCase();
            if (sex === 'M' || sex === 'MACHO') genderIcon = '<i class="fas fa-mars" style="color:#3b82f6; font-size:12px;"></i>';
            else if (sex === 'F' || sex === 'FEMEA' || sex === 'FÊMEA') genderIcon = '<i class="fas fa-venus" style="color:#ec4899; font-size:12px;"></i>';
        }

        return `
            <div class="kennel-card ${statusClass} ${tipoClass}" data-kennel-id="${canilId}" onclick="${clickAction}">
                <div class="kennel-roof"></div>
                <div class="kennel-header">
                    <span class="kennel-number">${canil.number}</span>
                    <div class="status-indicator">
                        ${!isOcupado ? `
                            <i class="fas fa-times btn-delete-kennel" onclick="event.stopPropagation(); kennelVisualization.deleteKennel(${canil.id}, '${canil.type} ${canil.number}')" title="Excluir Alojamento"></i>
                            <i class="fas fa-check"></i>
                        ` : ''}
                    </div>
                </div>
                <div class="kennel-content">
                    ${isOcupado ? `
                         <div style="display:flex; flex-direction:column; align-items:center; justify-content:flex-start; width:100%; height:100%; padding-top:0;">
                            <div class="pet-photo-circle" style="width:55px; height:55px; margin:-12px auto 6px; box-shadow:0 4px 8px rgba(0,0,0,0.12); background:linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%); flex-shrink:0;">
                                ${ocupacao.photo_url
                    ? `<img src="${ocupacao.photo_url}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" onerror="this.style.display='none'; this.nextElementSibling.style.setProperty('display', 'flex', 'important');">
                                       <div class="photo-placeholder" style="display:none !important; width:100%; height:100%; align-items:center; justify-content:center; font-size:1.4rem; color:#6366f1;"><i class="fas fa-${ocupacao.tipo_animal === 'GATO' ? 'cat' : 'dog'}"></i></div>`
                    : `<div class="photo-placeholder" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:1.4rem; color:#6366f1;"><i class="fas fa-${ocupacao.tipo_animal === 'GATO' ? 'cat' : 'dog'}"></i></div>`
                }
                            </div>
                            <div class="animal-info" style="text-align:center; width:100%; padding:0 2px; box-sizing:border-box; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                                <div class="animal-name" style="font-weight:800; color:#1e293b; font-size:0.75rem; line-height:1.2; word-wrap:break-word; overflow-wrap:break-word; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; width:100%; text-align:center;">
                                    ${ocupacao.animal} <i class="fas fa-${ocupacao.sexo === 'M' ? 'mars' : 'venus'}" style="font-size:0.7rem; color:${ocupacao.sexo === 'M' ? '#3b82f6' : '#ec4899'}; margin-left:2px; vertical-align:middle;"></i>
                                </div>
                                <div class="tutor-info" style="font-size:0.65rem; color:#64748b; margin-top:3px; margin-bottom:6px; word-wrap:break-word; overflow-wrap:break-word; line-height:1.2; width:100%; text-align:center;">${ocupacao.tutor.split(' ')[0]}</div>
                            </div>
                        </div>
                    ` : `
                        <button class="btn-reservar-circle" onclick="event.stopPropagation(); kennelVisualization.reservarCanil('${canilId}')">
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

}
window.kennelVisualization = null;