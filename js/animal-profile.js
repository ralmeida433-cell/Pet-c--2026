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

    toggleVaccineFields(type) {
        const fields = document.getElementById('vaccination-fields');
        if (fields) fields.style.display = type === 'VACINAÇÃO' ? 'block' : 'none';
        if (type === 'VACINAÇÃO') this.autoCalculateBooster();
    }

    autoCalculateBooster() {
        const vacName = document.getElementById('vac-name').value;
        const dose = document.getElementById('vac-dose').value;
        const appDateVal = document.getElementById('history-date').value;
        const nextDateInput = document.getElementById('vac-next-date');

        if (!appDateVal || !vacName) return;

        let appDate = new Date(appDateVal + 'T12:00:00');
        let daysToAdd = 365; // Padrão anual

        if (dose !== 'Reforço Anual') {
            if (vacName === 'V8' || vacName === 'V10') daysToAdd = 21;
            if (vacName === 'GRIPE') daysToAdd = 21;
            if (vacName === 'GIÁRDIA') daysToAdd = 21;
        }

        appDate.setDate(appDate.getDate() + daysToAdd);
        nextDateInput.value = appDate.toISOString().split('T')[0];
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
            if (!animal) return;
            this.currentAnimal = animal;
            const history = await window.db.getAnimalHistory(animalId);
            this.renderProfile(animal, history);
            window.hotelPetApp.hideLoading();
        } catch (e) { console.error(e); window.hotelPetApp.hideLoading(); }
    }

    renderProfile(animal, history) {
        const container = document.getElementById('animal-profile-content');
        if (!container) return;
        
        container.innerHTML = `
            <div class="profile-header-card">
                <div class="profile-photo-area"><img src="${animal.photo_url || ''}" class="profile-photo" onerror="this.style.display='none'"></div>
                <div class="profile-info-main">
                    <h2>${animal.name}</h2>
                    <span class="species-tag ${animal.species.toLowerCase()}">${animal.species}</span>
                    <div class="tutor-contact-info"><p>Tutor: <strong>${animal.tutor_name}</strong></p></div>
                </div>
            </div>
            <div class="profile-accordion-container">
                <div class="accordion-item expanded">
                    <div class="accordion-header"><h3><i class="fas fa-syringe"></i> Vacinação & Reforços</h3><i class="fas fa-chevron-up accordion-icon"></i></div>
                    <div class="accordion-content">
                        <button class="btn btn-primary btn-sm mb-3" id="add-history-btn"><i class="fas fa-plus"></i> Novo Registro</button>
                        <div class="history-list">${this.renderHistoryList(history, true)}</div>
                    </div>
                </div>
                <div class="accordion-item">
                    <div class="accordion-header"><h3><i class="fas fa-history"></i> Outros Serviços</h3><i class="fas fa-chevron-down accordion-icon"></i></div>
                    <div class="accordion-content">
                        <div class="history-list">${this.renderHistoryList(history, false)}</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderHistoryList(history, isVaccineOnly) {
        const items = history.filter(h => isVaccineOnly ? h.type === 'VACINAÇÃO' : h.type !== 'VACINAÇÃO');
        if (items.length === 0) return '<p class="text-center text-secondary py-3">Nenhum registro.</p>';

        return items.sort((a, b) => new Date(b.date) - new Date(a.date)).map(entry => {
            if (entry.type === 'VACINAÇÃO') return this.renderVaccineCard(entry);
            
            return `
            <div class="history-entry">
                <div class="history-icon ${entry.type.toLowerCase()}"><i class="fas fa-${this.getHistoryIcon(entry.type)}"></i></div>
                <div class="history-details">
                    <span class="history-type">${entry.type}</span>
                    <span class="history-date">${new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    <p class="history-description">${entry.description}</p>
                </div>
                <button class="action-btn delete-btn" onclick="window.animalProfileManager.deleteHistoryEntry(${entry.id})"><i class="fas fa-trash"></i></button>
            </div>`;
        }).join('');
    }

    renderVaccineCard(entry) {
        let meta = {};
        try { meta = JSON.parse(entry.description); } catch(e) { meta = { name: 'Vacina', dose: 'N/A' }; }

        const nextDate = new Date(meta.nextDate + 'T12:00:00');
        const today = new Date();
        const diffDays = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
        
        let statusClass = 'status-ok';
        let statusText = 'Em dia';
        if (diffDays < 0) { statusClass = 'status-expired'; statusText = 'Atrasada'; }
        else if (diffDays <= 7) { statusClass = 'status-warning'; statusText = 'Vence em breve'; }

        return `
        <div class="vaccine-card ${statusClass}">
            <div class="vac-header">
                <div class="vac-title">
                    <strong>${meta.name}</strong>
                    <span>${meta.dose}</span>
                </div>
                <span class="vac-status-badge">${statusText}</span>
            </div>
            <div class="vac-body">
                <div class="vac-info-row">
                    <span><i class="fas fa-calendar-check"></i> Aplicada: ${new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    <span><i class="fas fa-redo"></i> Reforço: ${nextDate.toLocaleDateString('pt-BR')}</span>
                </div>
                <div class="vac-info-row secondary">
                    <span>Lote: ${meta.lote || '-'}</span>
                    <span>Vet: ${meta.vet || '-'}</span>
                </div>
            </div>
            <div class="vac-actions">
                <button class="btn-apply-next" onclick="window.animalProfileManager.quickApplyNext('${meta.name}', '${meta.dose}')">
                    <i class="fas fa-syringe"></i> Aplicar Próxima Dose
                </button>
                <button class="vac-del-btn" onclick="window.animalProfileManager.deleteHistoryEntry(${entry.id})"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }

    quickApplyNext(name, lastDose) {
        this.openHistoryModal();
        document.getElementById('history-type').value = 'VACINAÇÃO';
        this.toggleVaccineFields('VACINAÇÃO');
        document.getElementById('vac-name').value = name;
        
        const nextDoseMap = { '1ª Dose': '2ª Dose', '2ª Dose': '3ª Dose', '3ª Dose': 'Reforço Anual', 'Reforço Anual': 'Reforço Anual' };
        document.getElementById('vac-dose').value = nextDoseMap[lastDose] || 'Reforço Anual';
        this.autoCalculateBooster();
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
        this.toggleVaccineFields('BANHO');
        modal?.classList.add('active');
    }

    closeHistoryModal() { document.getElementById('history-modal')?.classList.remove('active'); }

    async saveHistoryEntry() {
        const type = document.getElementById('history-type').value;
        const date = document.getElementById('history-date').value;
        let description = document.getElementById('history-description').value;

        if (type === 'VACINAÇÃO') {
            const meta = {
                name: document.getElementById('vac-name').value,
                dose: document.getElementById('vac-dose').value,
                nextDate: document.getElementById('vac-next-date').value,
                lote: document.getElementById('vac-lote').value,
                lab: document.getElementById('vac-lab').value,
                vet: document.getElementById('vac-vet').value,
                price: document.getElementById('vac-price').value
            };
            description = JSON.stringify(meta);
        }

        try {
            await window.db.addAnimalHistory({ animal_id: this.currentAnimal.id, type, date, description });
            window.hotelPetApp.showNotification('Registro salvo!', 'success');
            this.closeHistoryModal();
            this.loadProfile(this.currentAnimal.id);
        } catch (e) { console.error(e); }
    }

    async deleteHistoryEntry(id) {
        if (confirm('Excluir este registro?')) {
            await window.db.deleteAnimalHistory(id);
            this.loadProfile(this.currentAnimal.id);
        }
    }
}
window.animalProfileManager = new AnimalProfileManager();