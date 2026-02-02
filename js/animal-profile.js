class AnimalProfileManager {
    constructor() {
        this.currentAnimal = null;
        this.isInitialized = false;
        this.currentFilter = '';
    }

    init() {
        if (this.isInitialized) return;
        this.bindEvents();
        this.isInitialized = true;
        console.log('Animal Profile Manager initialized');
    }

    bindEvents() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('#add-history-btn')) {
                this.openHistoryModal();
            }

            const filterBtn = e.target.closest('.history-filter-pill');
            if (filterBtn) {
                this.handleFilterClick(filterBtn);
            }

            const header = e.target.closest('.accordion-header');
            if (header) {
                this.toggleAccordion(header.closest('.accordion-item'));
            }
        });

        document.getElementById('history-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveHistoryEntry();
        });

        document.getElementById('cancel-history')?.addEventListener('click', () => this.closeHistoryModal());
    }

    handleFilterClick(btn) {
        document.querySelectorAll('.history-filter-pill').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.type;
        this.loadHistory(this.currentAnimal.id);
    }

    async loadProfile(animalId) {
        if (!window.db) return;
        window.hotelPetApp.showLoading();
        
        try {
            const animal = await window.db.getAnimalById(animalId);
            if (!animal) {
                window.hotelPetApp.showNotification('Animal não encontrado.', 'error');
                return;
            }
            this.currentAnimal = animal;
            this.currentFilter = ''; // Reset filter
            
            await this.loadHistory(animalId);
            window.hotelPetApp.hideLoading();
        } catch (e) {
            console.error('Erro ao carregar perfil:', e);
            window.hotelPetApp.hideLoading();
        }
    }

    async loadHistory(animalId) {
        const history = await window.db.getAnimalHistory(animalId, this.currentFilter);
        this.renderProfile(this.currentAnimal, history);
    }

    renderProfile(animal, history) {
        const container = document.getElementById('animal-profile-content');
        if (!container) return;

        const cleanPhone = animal.tutor_phone ? animal.tutor_phone.replace(/\D/g, '') : '';
        const waUrl = cleanPhone ? `https://wa.me/55${cleanPhone}?text=Olá ${animal.tutor_name}, estamos entrando em contato sobre o pet ${animal.name}.` : '#';

        container.innerHTML = `
            <div class="profile-header-card">
                <div class="profile-photo-area">
                    <img src="${animal.photo_url || 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 512 512\'><path fill=\'%23cbd5e0\' d=\'M256 160c12.9 0 24.7 3.9 34.2 10.5l5.8-14.8C311 118.6 285.2 96 256 96s-55 22.6-40 59.7l5.8 14.8c9.5-6.6 21.3-10.5 34.2-10.5zm-112 80c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zm224 0c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zM256 320c-44.2 0-80 35.8-80 80s35.8 80 80 80 80-35.8 80-80-35.8-80-80-80z\'/></svg>'}" 
                         alt="${animal.name}" class="profile-photo" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 512 512\'><path fill=\'%23cbd5e0\' d=\'M256 160c12.9 0 24.7 3.9 34.2 10.5l5.8-14.8C311 118.6 285.2 96 256 96s-55 22.6-40 59.7l5.8 14.8c9.5-6.6 21.3-10.5 34.2-10.5zm-112 80c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zm224 0c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zM256 320c-44.2 0-80 35.8-80 80s35.8 80 80 80 80-35.8 80-80-35.8-80-80-80z\'/></svg>'}">
                </div>
                <div class="profile-info-main">
                    <h2>${animal.name}</h2>
                    <span class="species-tag ${animal.species.toLowerCase()}">${animal.species}</span>
                    <div class="tutor-contact-info">
                        <p>Tutor: <strong>${animal.tutor_name}</strong></p>
                        <p>Telefone: ${animal.tutor_phone || 'Não informado'}</p>
                    </div>
                    <a href="${waUrl}" target="_blank" class="btn btn-success btn-sm mt-3 wa-contact-btn">
                        <i class="fab fa-whatsapp"></i> Contatar via WhatsApp
                    </a>
                </div>
            </div>

            <div class="profile-accordion-container">
                <div class="accordion-item expanded">
                    <div class="accordion-header">
                        <h3><i class="fas fa-history"></i> Linha do Tempo de Serviços</h3>
                        <i class="fas fa-chevron-up accordion-icon"></i>
                    </div>
                    <div class="accordion-content">
                        <div class="history-controls-modern">
                            <button class="btn btn-primary btn-sm" id="add-history-btn">
                                <i class="fas fa-plus"></i> Novo Registro
                            </button>
                            <div class="history-filters-scroll">
                                <div class="history-filter-pill ${this.currentFilter === '' ? 'active' : ''}" data-type="">Todos</div>
                                <div class="history-filter-pill ${this.currentFilter === 'BANHO' ? 'active' : ''}" data-type="BANHO">Banho</div>
                                <div class="history-filter-pill ${this.currentFilter === 'TOSA' ? 'active' : ''}" data-type="TOSA">Tosa</div>
                                <div class="history-filter-pill ${this.currentFilter === 'VETERINÁRIO' ? 'active' : ''}" data-type="VETERINÁRIO">Vet</div>
                                <div class="history-filter-pill ${this.currentFilter === 'MEDICAÇÃO' ? 'active' : ''}" data-type="MEDICAÇÃO">Med</div>
                            </div>
                        </div>
                        <div class="timeline-container">
                            ${this.renderTimeline(history)}
                        </div>
                    </div>
                </div>
                
                <div class="accordion-item">
                    <div class="accordion-header">
                        <h3><i class="fas fa-notes-medical"></i> Informações Médicas Fixas</h3>
                        <i class="fas fa-chevron-down accordion-icon"></i>
                    </div>
                    <div class="accordion-content">
                        <div class="data-grid">
                            <div class="data-item"><span class="data-label">Vacinas:</span><span class="data-value">${animal.vaccination_status || 'N/A'}</span></div>
                            <div class="data-item"><span class="data-label">Alergias:</span><span class="data-value">${animal.allergies || 'Nenhum registro'}</span></div>
                            <div class="data-item"><span class="data-label">Remédios Fixos:</span><span class="data-value">${animal.medication || 'Nenhum'}</span></div>
                        </div>
                        <div class="data-item full-width mt-3">
                            <span class="data-label">Observações Técnicas:</span>
                            <p class="data-value-long">${animal.vet_notes || 'Sem observações extras.'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const firstContent = container.querySelector('.accordion-item.expanded .accordion-content');
        if (firstContent) {
            setTimeout(() => { firstContent.style.maxHeight = "none"; }, 100);
        }
    }

    renderTimeline(history) {
        if (!history || history.length === 0) {
            return '<p class="text-center text-secondary" style="padding: 2rem; font-size: 0.9rem;">Nenhum registro de serviço encontrado para este pet.</p>';
        }

        return history.map(entry => `
            <div class="timeline-item">
                <div class="timeline-marker ${entry.type.toLowerCase()}">
                    <i class="fas fa-${this.getHistoryIcon(entry.type)}"></i>
                </div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <div class="type-date">
                            <span class="service-type-badge ${entry.type.toLowerCase()}">${entry.type}</span>
                            <span class="service-date">${new Date(entry.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                        </div>
                        ${entry.value ? `<span class="service-price">R$ ${parseFloat(entry.value).toFixed(2)}</span>` : ''}
                    </div>
                    
                    <p class="service-desc">${entry.description}</p>
                    
                    <div class="service-meta-grid">
                        ${entry.professional ? `<span><i class="fas fa-user"></i> ${entry.professional}</span>` : ''}
                        ${entry.weight ? `<span><i class="fas fa-weight"></i> ${entry.weight}</span>` : ''}
                        ${entry.behavior ? `<span><i class="fas fa-smile"></i> ${entry.behavior}</span>` : ''}
                    </div>

                    <button class="timeline-delete" onclick="window.animalProfileManager.deleteHistoryEntry(${entry.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    getHistoryIcon(type) {
        switch (type) {
            case 'BANHO': return 'shower';
            case 'TOSA': return 'cut';
            case 'VETERINÁRIO': return 'stethoscope';
            case 'MEDICAÇÃO': return 'pills';
            case 'HOSPEDAGEM': return 'bed';
            default: return 'clipboard-list';
        }
    }

    toggleAccordion(item) {
        if (!item) return;
        const content = item.querySelector('.accordion-content');
        const icon = item.querySelector('.accordion-icon');

        if (item.classList.contains('expanded')) {
            item.classList.remove('expanded');
            content.style.maxHeight = null;
            icon.classList.remove('fa-chevron-up');
            icon.classList.add('fa-chevron-down');
        } else {
            item.classList.add('expanded');
            content.style.maxHeight = "none";
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-chevron-up');
        }
    }

    openHistoryModal() {
        const modal = document.getElementById('history-modal');
        document.getElementById('history-form')?.reset();
        document.getElementById('history-animal-name').value = this.currentAnimal.name;
        document.getElementById('history-date').valueAsDate = new Date();
        modal?.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeHistoryModal() {
        document.getElementById('history-modal')?.classList.remove('active');
        document.body.style.overflow = '';
    }

    async saveHistoryEntry() {
        const h = {
            animal_id: this.currentAnimal.id,
            type: document.getElementById('history-type').value,
            date: document.getElementById('history-date').value,
            description: document.getElementById('history-description').value,
            professional: document.getElementById('history-professional').value,
            value: document.getElementById('history-value').value,
            weight: document.getElementById('history-weight').value,
            behavior: document.getElementById('history-behavior').value,
            status: 'CONCLUÍDO'
        };

        if (!h.type || !h.date || !h.description) {
            window.hotelPetApp.showNotification('Preencha os campos obrigatórios (*).', 'warning');
            return;
        }

        try {
            await window.db.addAnimalHistory(h);
            window.hotelPetApp.showNotification('Serviço registrado com sucesso!', 'success');
            this.closeHistoryModal();
            this.loadHistory(this.currentAnimal.id);
        } catch (e) {
            window.hotelPetApp.showNotification('Erro ao salvar.', 'error');
        }
    }

    async deleteHistoryEntry(id) {
        if (confirm('Excluir este registro permanentemente?')) {
            try {
                await window.db.deleteAnimalHistory(id);
                window.hotelPetApp.showNotification('Registro removido.', 'success');
                this.loadHistory(this.currentAnimal.id);
            } catch (e) {
                window.hotelPetApp.showNotification('Erro ao excluir.', 'error');
            }
        }
    }
}

window.animalProfileManager = new AnimalProfileManager();