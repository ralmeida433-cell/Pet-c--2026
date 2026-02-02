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

        // Toggle campos de vacinação
        const typeSelect = document.getElementById('history-type');
        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => {
                const vacFields = document.getElementById('vaccination-fields');
                if (e.target.value === 'VACINAÇÃO') {
                    vacFields.style.display = 'block';
                    this.calculateNextDose(); // Cálculo inicial
                } else {
                    vacFields.style.display = 'none';
                }
            });
        }

        // Listeners para auto-cálculo
        ['history-date', 'vac-name', 'vac-dose'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.calculateNextDose());
        });

        document.getElementById('history-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveHistoryEntry();
        });

        document.getElementById('cancel-history')?.addEventListener('click', () => this.closeHistoryModal());
    }

    calculateNextDose() {
        const dateInput = document.getElementById('history-date').value;
        const vacName = document.getElementById('vac-name').value;
        const vacDose = document.getElementById('vac-dose').value;
        const nextDateInput = document.getElementById('vac-next-date');

        if (!dateInput) return;

        let date = new Date(dateInput + 'T00:00:00');
        let daysToAdd = 365; // Padrão anual

        if (vacName === 'V8' || vacName === 'V10') {
            if (vacDose === '1ª Dose' || vacDose === '2ª Dose') daysToAdd = 30;
        } else if (vacName === 'GRIPE') {
            if (vacDose === '1ª Dose') daysToAdd = 21;
        } else if (vacName === 'ANTIRRÁBICA') {
            daysToAdd = 365;
        }

        date.setDate(date.getDate() + daysToAdd);
        nextDateInput.value = date.toISOString().split('T')[0];
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
                    <div class="accordion-header"><h3><i class="fas fa-history"></i> Histórico & Vacinas</h3><i class="fas fa-chevron-up accordion-icon"></i></div>
                    <div class="accordion-content">
                        <button class="btn btn-primary btn-sm mb-3" id="add-history-btn"><i class="fas fa-plus"></i> Adicionar Registro / Vacina</button>
                        <div class="history-list">${this.renderHistoryList(history)}</div>
                    </div>
                </div>
                <div class="accordion-item">
                    <div class="accordion-header"><h3><i class="fas fa-notes-medical"></i> Saúde</h3><i class="fas fa-chevron-down accordion-icon"></i></div>
                    <div class="accordion-content">
                        <div class="data-grid">
                            <div class="data-item"><span class="data-label">Peso Atual:</span><span class="data-value">${animal.weight || 'N/A'}</span></div>
                            <div class="data-item"><span class="data-label">Status Vacinal:</span><span class="data-value">${this.getVaccinationOverallStatus(history)}</span></div>
                        </div>
                        <div class="data-item full-width mt-2"><span class="data-label">Observações Médicas:</span><p class="data-value-long">${animal.vet_notes || 'Sem registro.'}</p></div>
                    </div>
                </div>
            </div>
        `;
        const firstContent = container.querySelector('.accordion-item.expanded .accordion-content');
        if (firstContent) { setTimeout(() => { firstContent.style.maxHeight = "none"; }, 100); }
    }

    getVaccinationOverallStatus(history) {
        const vaccines = history.filter(h => h.type === 'VACINAÇÃO');
        if (vaccines.length === 0) return 'Sem registros';
        const today = new Date();
        const hasLate = vaccines.some(v => v.next_date && new Date(v.next_date) < today);
        return hasLate ? 'Atrasada 🔴' : 'Em dia 🟢';
    }

    renderHistoryList(history) {
        if (!history || history.length === 0) return '<p class="text-center text-secondary" style="padding:1rem; font-size:0.8rem;">Nenhum registro.</p>';
        
        return history.sort((a, b) => new Date(b.date) - new Date(a.date)).map(entry => {
            const isVac = entry.type === 'VACINAÇÃO';
            const statusClass = this.getVaccineStatusClass(entry.next_date);
            const statusLabel = this.getVaccineStatusLabel(entry.next_date);

            return `
            <div class="history-entry ${isVac ? 'vac-entry' : ''}">
                <div class="history-icon ${entry.type.toLowerCase()}">
                    <i class="fas fa-${this.getHistoryIcon(entry.type)}"></i>
                </div>
                <div class="history-details">
                    <div class="history-header-line">
                        <span class="history-type">${isVac ? `VACINA: ${entry.vac_name}` : entry.type}</span>
                        ${isVac ? `<span class="vac-status-badge ${statusClass}">${statusLabel}</span>` : ''}
                    </div>
                    <span class="history-date">Aplicação: ${new Date(entry.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                    ${isVac ? `
                        <div class="vac-info-grid">
                            <span>Dose: <strong>${entry.vac_dose}</strong></span>
                            <span>Próximo Reforço: <strong class="${statusClass === 'late' ? 'text-danger' : ''}">${new Date(entry.next_date + 'T00:00:00').toLocaleDateString('pt-BR')}</strong></span>
                        </div>
                        ${entry.vac_reactions ? `<p class="vac-reaction">⚠ Reação: ${entry.vac_reactions}</p>` : ''}
                    ` : `<p class="history-description">${entry.description}</p>`}
                </div>
                <div class="entry-actions">
                    ${isVac ? `<button class="action-btn-mini apply-next" onclick="window.animalProfileManager.applyNextDose('${entry.vac_name}')" title="Aplicar próxima dose"><i class="fas fa-syringe"></i></button>` : ''}
                    <button class="action-btn delete-btn" onclick="window.animalProfileManager.deleteHistoryEntry(${entry.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `}).join('');
    }

    getVaccineStatusClass(nextDate) {
        if (!nextDate) return 'ok';
        const target = new Date(nextDate + 'T00:00:00');
        const today = new Date();
        const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'late';
        if (diffDays <= 7) return 'warning';
        return 'ok';
    }

    getVaccineStatusLabel(nextDate) {
        const status = this.getVaccineStatusClass(nextDate);
        if (status === 'late') return 'Atrasada';
        if (status === 'warning') return 'Vence em breve';
        return 'Em dia';
    }

    getHistoryIcon(type) {
        switch (type) {
            case 'VACINAÇÃO': return 'syringe';
            case 'BANHO': return 'shower';
            case 'TOSA': return 'cut';
            case 'VETERINÁRIO': return 'stethoscope';
            case 'MEDICAÇÃO': return 'pills';
            case 'HOSPEDAGEM': return 'bed';
            default: return 'clipboard-list';
        }
    }

    applyNextDose(vacName) {
        this.openHistoryModal();
        document.getElementById('history-type').value = 'VACINAÇÃO';
        document.getElementById('history-type').dispatchEvent(new Event('change'));
        document.getElementById('vac-name').value = vacName;
        this.calculateNextDose();
    }

    openHistoryModal() {
        const modal = document.getElementById('history-modal');
        document.getElementById('history-form')?.reset();
        document.getElementById('history-animal-name').value = this.currentAnimal.name;
        document.getElementById('history-date').valueAsDate = new Date();
        document.getElementById('vaccination-fields').style.display = 'none';
        modal?.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeHistoryModal() { document.getElementById('history-modal')?.classList.remove('active'); document.body.style.overflow = ''; }

    async saveHistoryEntry() {
        const animalId = this.currentAnimal.id;
        const type = document.getElementById('history-type').value;
        const date = document.getElementById('history-date').value;
        const description = document.getElementById('history-description').value;
        
        if (!type || !date) { window.hotelPetApp.showNotification('Preencha os campos obrigatórios.', 'warning'); return; }

        const entry = {
            animal_id: animalId,
            type,
            date,
            description: type === 'VACINAÇÃO' ? `Vacina ${document.getElementById('vac-name').value} - ${document.getElementById('vac-dose').value}` : description,
            vac_name: type === 'VACINAÇÃO' ? document.getElementById('vac-name').value : null,
            vac_dose: type === 'VACINAÇÃO' ? document.getElementById('vac-dose').value : null,
            vac_lote: type === 'VACINAÇÃO' ? document.getElementById('vac-lote').value : null,
            vac_lab: type === 'VACINAÇÃO' ? document.getElementById('vac-lab').value : null,
            vac_vet: type === 'VACINAÇÃO' ? document.getElementById('vac-vet').value : null,
            next_date: type === 'VACINAÇÃO' ? document.getElementById('vac-next-date').value : null,
            vac_reactions: type === 'VACINAÇÃO' ? document.getElementById('vac-reactions').value : null,
            price: type === 'VACINAÇÃO' ? parseFloat(document.getElementById('vac-price').value) || 0 : 0
        };

        // Atualiza peso do animal se informado na vacina
        const weight = document.getElementById('vac-weight')?.value;
        if (type === 'VACINAÇÃO' && weight) {
            await window.db.updateAnimal(animalId, { ...this.currentAnimal, weight: weight + 'kg' });
        }

        try {
            await window.db.addAnimalHistory(entry);
            window.hotelPetApp.showNotification('Histórico registrado!', 'success');
            this.closeHistoryModal();
            this.loadProfile(animalId);
        } catch (e) { console.error(e); }
    }

    async deleteHistoryEntry(historyId) {
        if (confirm('Deseja realmente excluir este registro?')) {
            try {
                await window.db.deleteAnimalHistory(historyId);
                window.hotelPetApp.showNotification('Excluído.', 'success');
                this.loadProfile(this.currentAnimal.id);
            } catch (e) { console.error(e); }
        }
    }
}
window.animalProfileManager = new AnimalProfileManager();