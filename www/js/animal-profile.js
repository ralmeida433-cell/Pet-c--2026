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
            if (e.target.closest('#add-history-btn')) this.openHistoryModal();
            const header = e.target.closest('.accordion-header');
            if (header) this.toggleAccordion(header.closest('.accordion-item'));
        });
        document.getElementById('history-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveHistoryEntry();
        });
        document.getElementById('cancel-history')?.addEventListener('click', () => this.closeHistoryModal());
    }

    onHistoryTypeChange(type) {
        const vFields = document.getElementById('vaccine-fields');
        if (vFields) {
            vFields.style.display = type === 'VACINAÇÃO' ? 'block' : 'none';
            if (type === 'VACINAÇÃO') this.calculateBooster();
        }
    }

    calculateBooster() {
        const vacName = document.getElementById('vac-name').value;
        const dose = document.getElementById('vac-dose').value;
        const appDateVal = document.getElementById('history-date').value;
        if (!appDateVal) return;

        let appDate = new Date(appDateVal + 'T12:00:00');
        let daysToAdd = 365; // Padrão anual

        if (dose !== 'Reforço Anual') {
            if (vacName.includes('V8') || vacName.includes('V10') || vacName.includes('V11')) daysToAdd = 25;
            else if (vacName.includes('Gripe')) daysToAdd = 21;
            else if (vacName.includes('Giárdia')) daysToAdd = 21;
            else if (vacName.includes('Leishmaniose')) daysToAdd = 21;
            else if (vacName.includes('V3') || vacName.includes('V4') || vacName.includes('V5')) daysToAdd = 21;
        }

        appDate.setDate(appDate.getDate() + daysToAdd);
        document.getElementById('vac-next-date').value = appDate.toISOString().split('T')[0];
    }

    toggleAccordion(item) {
        if (!item) return;
        const content = item.querySelector('.accordion-content');
        const icon = item.querySelector('.accordion-icon');
        if (item.classList.contains('expanded')) {
            item.classList.remove('expanded');
            content.style.maxHeight = null;
            icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
        } else {
            item.classList.add('expanded');
            content.style.maxHeight = content.scrollHeight + "px";
            icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
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

        const cleanPhone = animal.tutor_phone ? animal.tutor_phone.replace(/\D/g, '') : '';
        const waUrl = cleanPhone ? `https://wa.me/55${cleanPhone}?text=Olá ${animal.tutor_name}, estamos entrando em contato sobre o pet ${animal.name}.` : '#';

        container.innerHTML = `
            <div class="profile-header-card">
                <div class="profile-photo-area"><img src="${animal.photo_url || ''}" class="profile-photo" onerror="this.style.display='none'"></div>
                <div class="profile-info-main">
                    <h2>${animal.name}</h2>
                    <span class="species-tag ${animal.species.toLowerCase()}">${animal.species}</span>
                    <div class="tutor-contact-info">
                        <p>Tutor: <strong>${animal.tutor_name}</strong></p>
                        <a href="${waUrl}" target="_blank" class="btn btn-success btn-sm mt-2" style="background:#25d366; border:none; display:inline-flex; align-items:center; gap:8px;">
                            <i class="fab fa-whatsapp"></i> WhatsApp
                        </a>
                    </div>
                </div>
            </div>
            <div class="profile-accordion-container">
                <div class="accordion-item expanded">
                    <div class="accordion-header"><h3><i class="fas fa-syringe"></i> Vacinas e Reforços</h3><i class="fas fa-chevron-up accordion-icon"></i></div>
                    <div class="accordion-content">
                        <button class="btn btn-primary btn-sm mb-3" id="add-history-btn"><i class="fas fa-plus"></i> Adicionar Registro</button>
                        <div class="history-list">${this.renderHistoryList(history, true)}</div>
                    </div>
                </div>
                <div class="accordion-item">
                    <div class="accordion-header"><h3><i class="fas fa-history"></i> Outros Registros</h3><i class="fas fa-chevron-down accordion-icon"></i></div>
                    <div class="accordion-content">
                        <div class="history-list">${this.renderHistoryList(history, false)}</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderHistoryList(history, isVaccineOnly) {
        const filtered = history.filter(h => isVaccineOnly ? h.type === 'VACINAÇÃO' : h.type !== 'VACINAÇÃO');
        if (filtered.length === 0) return '<p class="text-center text-secondary py-3">Nenhum registro encontrado.</p>';

        return filtered.sort((a, b) => new Date(b.date) - new Date(a.date)).map(entry => {
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
        let v = {};
        try { v = JSON.parse(entry.description); } catch(e) { v = { name: 'Vacina', dose: 'N/A', nextDate: '' }; }

        const nextDate = new Date(v.nextDate + 'T12:00:00');
        const diff = Math.ceil((nextDate - new Date()) / (1000 * 60 * 60 * 24));
        
        let status = 'status-ok'; let text = 'Em dia';
        if (diff < 0) { status = 'status-expired'; text = 'Vencida'; }
        else if (diff <= 7) { status = 'status-warning'; text = 'Vence em breve'; }

        return `
        <div class="vaccine-card ${status}">
            <div class="vac-header">
                <div><strong>${v.name}</strong><br><small>${v.dose}</small></div>
                <span class="vac-status-badge">${text}</span>
            </div>
            <div class="vac-body">
                <div class="vac-info"><span>📅 Aplicada: ${new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span><span>🔄 Reforço: ${nextDate.toLocaleDateString('pt-BR')}</span></div>
                <div class="vac-meta">Lote: ${v.lote || '-'} | Vet: ${v.vet || '-'} | Peso: ${v.weight || '-'}kg</div>
            </div>
            <div class="vac-actions">
                <button class="btn-apply-next" onclick="window.animalProfileManager.quickNext('${v.name}', '${v.dose}')"><i class="fas fa-syringe"></i> Próxima Dose</button>
                <button class="delete-btn-mini" onclick="window.animalProfileManager.deleteHistoryEntry(${entry.id})"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }

    quickNext(name, lastDose) {
        this.openHistoryModal();
        document.getElementById('history-type').value = 'VACINAÇÃO';
        this.onHistoryTypeChange('VACINAÇÃO');
        document.getElementById('vac-name').value = name;
        const doses = { '1ª Dose': '2ª Dose', '2ª Dose': '3ª Dose', '3ª Dose': 'Reforço Anual', 'Reforço Anual': 'Reforço Anual' };
        document.getElementById('vac-dose').value = doses[lastDose] || 'Reforço Anual';
        this.calculateBooster();
    }

    getHistoryIcon(t) {
        const map = { 'BANHO': 'shower', 'TOSA': 'cut', 'VETERINÁRIO': 'stethoscope', 'MEDICAÇÃO': 'pills', 'HOSPEDAGEM': 'bed' };
        return map[t] || 'clipboard-list';
    }

    openHistoryModal() {
        const m = document.getElementById('history-modal');
        document.getElementById('history-form').reset();
        document.getElementById('history-animal-name').value = this.currentAnimal.name;
        document.getElementById('history-date').valueAsDate = new Date();
        this.onHistoryTypeChange('');
        m.classList.add('active');
    }

    closeHistoryModal() { document.getElementById('history-modal').classList.remove('active'); }

    async saveHistoryEntry() {
        const type = document.getElementById('history-type').value;
        const date = document.getElementById('history-date').value;
        let desc = document.getElementById('history-description').value;

        if (type === 'VACINAÇÃO') {
            const data = {
                name: document.getElementById('vac-name').value,
                dose: document.getElementById('vac-dose').value,
                nextDate: document.getElementById('vac-next-date').value,
                lote: document.getElementById('vac-lote').value,
                lab: document.getElementById('vac-lab').value,
                weight: document.getElementById('vac-weight').value,
                vet: document.getElementById('vac-vet').value,
                price: document.getElementById('vac-price').value
            };
            desc = JSON.stringify(data);
        }

        try {
            await window.db.addAnimalHistory({ animal_id: this.currentAnimal.id, type, date, description: desc });
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