class AnimalProfileManager {
    constructor() {
        this.currentAnimal = null;
        this.init();
    }

    init() {
        this.bindEvents();
        console.log('Animal Profile Manager initialized');
    }

    bindEvents() {
        document.getElementById('add-history-btn')?.addEventListener('click', () => this.openHistoryModal());
        document.getElementById('history-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveHistoryEntry();
        });
        document.getElementById('cancel-history')?.addEventListener('click', () => this.closeHistoryModal());
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
            window.hotelPetApp.showNotification('Erro ao carregar perfil do animal.', 'error');
            window.hotelPetApp.hideLoading();
        }
    }

    renderProfile(animal, history) {
        const container = document.getElementById('animal-profile-content');
        if (!container) return;

        const cleanPhone = animal.tutor_phone ? animal.tutor_phone.replace(/\D/g, '') : '';
        const waUrl = cleanPhone ? `https://wa.me/55${cleanPhone}?text=Ol%C3%A1%20${animal.tutor_name},%20estamos%20entrando%20em%20contato%20sobre%20o%20pet%20${animal.name}.` : '#';

        container.innerHTML = `
            <div class="profile-header-card">
                <div class="profile-photo-area">
                    <img src="${animal.photo_url || 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 512 512\'><path fill=\'%23cbd5e0\' d=\'M256 160c12.9 0 24.7 3.9 34.2 10.5l5.8-14.8C311 118.6 285.2 96 256 96s-55 22.6-40 59.7l5.8 14.8c9.5-6.6 21.3-10.5 34.2-10.5zm-112 80c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zm224 0c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zM256 320c-44.2 0-80 35.8-80 80s35.8 80 80 80 80-35.8 80-80-35.8-80-80-80z\'/></svg>'}" 
                         alt="${animal.name}" class="profile-photo" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 512 512\'><path fill=\'%23cbd5e0\' d=\'M256 160c12.9 0 24.7 3.9 34.2 10.5l5.8-14.8C311 118.6 285.2 96 256 96s-55 22.6-40 59.7l5.8 14.8c9.5-6.6 21.3-10.5 34.2-10.5zm-112 80c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zm224 0c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zM256 320c-44.2 0-80 35.8-80 80s35.8 80 80 80 80-35.8 80-80-35.8-80-80-80z\'/></svg>'}">
                </div>
                <div class="profile-info-main">
                    <h2>${animal.name}</h2>
                    <span class="species-tag ${animal.species.toLowerCase()}">${animal.species}</span>
                    <div class="tutor-contact-info">
                        <p>Tutor: <strong>${animal.tutor_name}</strong></p>
                        <p>Telefone: ${animal.tutor_phone || 'Não informado'}</p>
                    </div>
                    <a href="${waUrl}" target="_blank" class="btn btn-success btn-sm mt-3 wa-contact-btn">
                        <i class="fab fa-whatsapp"></i> Contatar Tutor
                    </a>
                </div>
            </div>

            <div class="profile-section-grid">
                <div class="profile-section-card">
                    <h3><i class="fas fa-history"></i> Histórico de Serviços</h3>
                    <button class="btn btn-primary btn-sm" id="add-history-btn"><i class="fas fa-plus"></i> Adicionar Registro</button>
                    <div class="history-list">
                        ${this.renderHistoryList(history)}
                    </div>
                </div>
                
                <div class="profile-section-card">
                    <h3><i class="fas fa-notes-medical"></i> Observações e Dados</h3>
                    <div class="data-grid">
                        <div class="data-item"><span class="data-label">Peso:</span><span class="data-value">${animal.weight || 'N/A'}</span></div>
                        <div class="data-item"><span class="data-label">Vacinação:</span><span class="data-value">${animal.vaccination_status || 'N/A'}</span></div>
                        <div class="data-item"><span class="data-label">Alergias:</span><span class="data-value">${animal.allergies || 'N/A'}</span></div>
                        <div class="data-item"><span class="data-label">Medicação:</span><span class="data-value">${animal.medication || 'N/A'}</span></div>
                    </div>
                    <div class="data-item full-width mt-3">
                        <span class="data-label">Observações Veterinárias:</span>
                        <p class="data-value-long">${animal.vet_notes || 'Nenhuma observação registrada.'}</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderHistoryList(history) {
        if (!history || history.length === 0) {
            return '<p class="text-center text-secondary" style="padding: 1rem;">Nenhum registro de histórico encontrado.</p>';
        }

        // Ordenar por data (mais recente primeiro)
        const sortedHistory = history.sort((a, b) => new Date(b.date) - new Date(a.date));

        return sortedHistory.map(entry => `
            <div class="history-entry">
                <div class="history-icon ${entry.type.toLowerCase()}">
                    <i class="fas fa-${this.getHistoryIcon(entry.type)}"></i>
                </div>
                <div class="history-details">
                    <span class="history-type">${entry.type}</span>
                    <span class="history-date">${new Date(entry.date).toLocaleDateString('pt-BR')}</span>
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
        modal?.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeHistoryModal() {
        document.getElementById('history-modal')?.classList.remove('active');
        document.body.style.overflow = '';
    }

    async saveHistoryEntry() {
        const animalId = this.currentAnimal.id;
        const type = document.getElementById('history-type').value;
        const date = document.getElementById('history-date').value;
        const description = document.getElementById('history-description').value;

        if (!type || !date || !description) {
            window.hotelPetApp.showNotification('Preencha todos os campos do histórico.', 'warning');
            return;
        }

        const entry = {
            animal_id: animalId,
            type: type,
            date: date,
            description: description
        };

        try {
            await window.db.addAnimalHistory(entry);
            window.hotelPetApp.showNotification('Registro de histórico salvo!', 'success');
            this.closeHistoryModal();
            this.loadProfile(animalId); // Recarrega o perfil
        } catch (e) {
            window.hotelPetApp.showNotification('Erro ao salvar histórico.', 'error');
        }
    }

    async deleteHistoryEntry(historyId) {
        if (confirm('Deseja realmente excluir este registro de histórico?')) {
            try {
                await window.db.deleteAnimalHistory(historyId);
                window.hotelPetApp.showNotification('Registro excluído.', 'success');
                this.loadProfile(this.currentAnimal.id); // Recarrega o perfil
            } catch (e) {
                window.hotelPetApp.showNotification('Erro ao excluir registro.', 'error');
            }
        }
    }
}

window.animalProfileManager = new AnimalProfileManager();