class AnimalProfileManager {
    constructor() {
        this.currentAnimal = null;
        this.isInitialized = false;
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
            document.querySelectorAll('#animal-profile-content .accordion-item.expanded').forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('expanded');
                    otherItem.querySelector('.accordion-content').style.maxHeight = null;
                    otherItem.querySelector('.accordion-icon').classList.remove('fa-chevron-up');
                    otherItem.querySelector('.accordion-icon').classList.add('fa-chevron-down');
                }
            });
            item.classList.add('expanded');
            content.style.maxHeight = content.scrollHeight + "px";
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-chevron-up');
        }
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
            const history = await window.db.getAnimalHistory(animalId);
            this.renderProfile(animal, history);
            window.hotelPetApp.hideLoading();
        } catch (e) {
            console.error('Erro ao carregar perfil:', e);
            window.hotelPetApp.hideLoading();
        }
    }

    renderProfile(animal, history) {
        const container = document.getElementById('animal-profile-content');
        if (!container) return;
        const cleanPhone = animal.tutor_phone ? animal.tutor_phone.replace(/\D/g, '') : '';
        const waUrl = cleanPhone ? `https://wa.me/55${cleanPhone}?text=Olá ${animal.tutor_name}, estamos em contato sobre o pet ${animal.name}.` : '#';
        container.innerHTML = `
            <div class="profile-header-card">
                <div class="profile-photo-area"><img src="${animal.photo_url || ''}" class="profile-photo" onerror="this.style.display='none'"></div>
                <div class="profile-info-main">
                    <h2>${animal.name}</h2>
                    <span class="species-tag ${animal.species.toLowerCase()}">${animal.species}</span>
                    <div class="tutor-contact-info"><p>Tutor: <strong>${animal.tutor_name}</strong></p></div>
                    <a href="${waUrl}" target="_blank" class="btn btn-success btn-sm mt-2 wa-contact-btn"><i class="fab fa-whatsapp"></i> Contatar</a>
                </div>
            </div>
            <div class="profile-accordion-container">
                <div class="accordion-item expanded">
                    <div class="accordion-header"><h3><i class="fas fa-history"></i> Histórico</h3><i class="fas fa-chevron-up accordion-icon"></i></div>
                    <div class="accordion-content">
                        <button class="btn btn-primary btn-sm mb-3" id="add-history-btn"><i class="fas fa-plus"></i> Adicionar Registro</button>
                        <div class="history-list">${this.renderHistoryList(history)}</div>
                    </div>
                </div>
                <div class="accordion-item">
                    <div class="accordion-header"><h3><i class="fas fa-notes-medical"></i> Saúde</h3><i class="fas fa-chevron-down accordion-icon"></i></div>
                    <div class="accordion-content">
                        <div class="data-grid">
                            <div class="data-item"><span class="data-label">Peso:</span><span class="data-value">${animal.weight || 'N/A'}</span></div>
                            <div class="data-item"><span class="data-label">Vacinas:</span><span class="data-value">${animal.vaccination_status || 'N/A'}</span></div>
                        </div>
                        <div class="data-item full-width mt-2"><span class="data-label">Observações:</span><p class="data-value-long">${animal.vet_notes || 'Sem registro.'}</p></div>
                    </div>
                </div>
            </div>
        `;
        const firstContent = container.querySelector('.accordion-item.expanded .accordion-content');
        if (firstContent) { setTimeout(() => { firstContent.style.maxHeight = firstContent.scrollHeight + "px"; }, 100); }
    }

    renderHistoryList(history) {
        if (!history || history.length === 0) return '<p class="text-center text-secondary" style="padding:1rem; font-size:0.8rem;">Nenhum registro.</p>';
        return history.sort((a, b) => new Date(b.date) - new Date(a.date)).map(entry => `
            <div class="history-entry">
                <div class="history-icon ${entry.type.toLowerCase()}"><i class="fas fa-${this.getHistoryIcon(entry.type)}"></i></div>
                <div class="history-details">
                    <span class="history-type">${entry.type}</span>
                    <span class="history-date">${new Date(entry.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                    <p class="history-description">${entry.description}</p>
                </div>
                <button class="action-btn delete-btn" onclick="window.animalProfileManager.deleteHistoryEntry(${entry.id})"><i class="fas fa-trash"></i></button>
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

    openHistoryModal() {
        const modal = document.getElementById('history-modal');
        document.getElementById('history-form')?.reset();
        document.getElementById('history-animal-name').value = this.currentAnimal.name;
        document.getElementById('history-date').valueAsDate = new Date();
        modal?.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeHistoryModal() { document.getElementById('history-modal')?.classList.remove('active'); document.body.style.overflow = ''; }

    async saveHistoryEntry() {
        const animalId = this.currentAnimal.id;
        const type = document.getElementById('history-type').value;
        const date = document.getElementById('history-date').value;
        const description = document.getElementById('history-description').value;
        if (!type || !date || !description) { window.hotelPetApp.showNotification('Preencha os campos.', 'warning'); return; }
        try {
            await window.db.addAnimalHistory({ animal_id: animalId, type, date, description });
            window.hotelPetApp.showNotification('Salvo!', 'success');
            this.closeHistoryModal();
            this.loadProfile(animalId);
        } catch (e) { console.error(e); }
    }

    async deleteHistoryEntry(historyId) {
        if (confirm('Excluir?')) {
            try {
                await window.db.deleteAnimalHistory(historyId);
                window.hotelPetApp.showNotification('Excluído.', 'success');
                this.loadProfile(this.currentAnimal.id);
            } catch (e) { console.error(e); }
        }
    }
}
window.animalProfileManager = new AnimalProfileManager();