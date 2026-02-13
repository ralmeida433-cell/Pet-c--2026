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
        if (this._clickHandler) document.removeEventListener('click', this._clickHandler);

        this._clickHandler = (e) => {
            if (e.target.closest('#add-history-btn')) {
                this.openHistoryModal();
                return;
            }

            const header = e.target.closest('.accordion-header');
            if (header) {
                e.preventDefault();
                e.stopPropagation();
                this.toggleAccordion(header.closest('.accordion-item'));
            }
        };

        document.addEventListener('click', this._clickHandler);

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
            if (type === 'VACINAÇÃO') {
                this.onVaccineNameChange(document.getElementById('vac-name').value);
                this.calculateBooster();
            }
        }
    }

    onVaccineNameChange(value) {
        const otherGroup = document.getElementById('other-vac-name-group');
        if (otherGroup) {
            otherGroup.style.display = value === 'OUTRA' ? 'block' : 'none';
        }
        this.calculateBooster();
    }

    calculateBooster() {
        const vacNameSelect = document.getElementById('vac-name').value;
        const customName = document.getElementById('vac-name-custom')?.value || '';
        const vacName = vacNameSelect === 'OUTRA' ? customName : vacNameSelect;

        const dose = document.getElementById('vac-dose').value;
        const appDateVal = document.getElementById('history-date').value;
        if (!appDateVal) return;

        let appDate = new Date(appDateVal + 'T12:00:00');
        let daysToAdd = 365;

        if (dose !== 'Reforço Anual') {
            const nameLower = vacName.toLowerCase();
            if (nameLower.includes('v8') || nameLower.includes('v10') || nameLower.includes('v11')) daysToAdd = 25;
            else if (nameLower.includes('gripe')) daysToAdd = 21;
            else if (nameLower.includes('giárdia')) daysToAdd = 21;
            else if (nameLower.includes('leishmaniose')) daysToAdd = 21;
            else if (nameLower.includes('v3') || nameLower.includes('v4') || nameLower.includes('v5')) daysToAdd = 21;
            else if (nameLower.includes('antirrábica')) daysToAdd = 365;
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
        const speciesIcon = animal.species.toUpperCase() === 'CÃO' ? 'fa-dog' : 'fa-cat';
        const sexLabel = animal.sex === 'F' ? 'Fêmea' : 'Macho';
        const sexIcon = animal.sex === 'F' ? '<i class="fas fa-venus" style="color:#e91e63;"></i>' : '<i class="fas fa-mars" style="color:#2196f3;"></i>';

        container.innerHTML = `
            <div class="profile-header-card">
                <div class="profile-photo-area">
                    ${animal.photo_url
                ? `<img src="${animal.photo_url}" class="profile-pet-photo" onerror="this.parentElement.innerHTML='<div class=&quot;photo-placeholder&quot; style=&quot;width:140px;height:140px;font-size:3rem;&quot;><i class=&quot;fas ${speciesIcon}&quot;></i></div>'">`
                : `<div class="photo-placeholder" style="width:140px;height:140px;font-size:3rem;"><i class="fas ${speciesIcon}"></i></div>`
            }
                </div>
                <div class="profile-info-main">
                    <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.5rem;">
                        <span class="species-tag ${animal.species.toLowerCase()}">${animal.species}</span>
                        <span class="species-tag" style="background:${animal.sex === 'F' ? '#fce7f3' : '#e0f2fe'}; color:${animal.sex === 'F' ? '#be185d' : '#0369a1'};">
                            ${sexIcon} ${sexLabel}
                        </span>
                    </div>
                    <h2>${animal.name}</h2>
                    <div class="tutor-contact-info">
                        <p><i class="fas fa-user-circle"></i> Tutor: <strong>${animal.tutor_name}</strong></p>
                        <div style="display:flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem;">
                            <a href="${waUrl}" target="_blank" class="btn btn-success btn-sm whatsapp-btn" style="flex:1; justify-content:center;">
                                <i class="fab fa-whatsapp"></i> WhatsApp
                            </a>
                            <button class="btn btn-primary btn-sm" onclick="window.animalProfileManager.openHistoryModal()" style="flex:1; justify-content:center;">
                                <i class="fas fa-plus"></i> Novo Registro
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="profile-accordion-container">
                <div class="accordion-item expanded" id="health-info-section">
                    <div class="accordion-header">
                        <h3><i class="fas fa-info-circle"></i> Informações de Saúde</h3>
                        <i class="fas fa-chevron-up accordion-icon"></i>
                    </div>
                    <div class="accordion-content">
                        <div class="accordion-inner-content">
                            ${this.renderHealthSummary(animal, history)}
                        </div>
                    </div>
                </div>

                <div class="accordion-item">
                    <div class="accordion-header">
                        <h3><i class="fas fa-syringe"></i> Vacinação e Imunidade</h3>
                        <i class="fas fa-chevron-down accordion-icon"></i>
                    </div>
                    <div class="accordion-content">
                        <div class="accordion-inner-content">
                            <div style="padding-bottom: 1.5rem;">
                                <p style="color:#64748b; font-size:0.9rem; margin:0;">Histórico completo de vacinas aplicadas.</p>
                            </div>
                            <div class="history-list">${this.renderHistoryList(history, true)}</div>
                        </div>
                    </div>
                </div>

                <div class="accordion-item">
                    <div class="accordion-header">
                        <h3><i class="fas fa-notes-medical"></i> Prontuário e Serviços</h3>
                        <i class="fas fa-chevron-down accordion-icon"></i>
                    </div>
                    <div class="accordion-content">
                        <div class="accordion-inner-content">
                            <div class="history-list">${this.renderHistoryList(history, false)}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="profile-actions-footer" style="margin-top:2rem; padding:1.5rem; background:white; border-radius:16px; box-shadow:0 4px 12px rgba(0,0,0,0.05); text-align:center;">
                <p style="color:#64748b; font-size:0.9rem; margin-bottom:1rem;">Deseja exportar todo o histórico deste pet em um documento oficial?</p>
                <button class="btn btn-primary w-100" onclick="window.animalProfileManager.generateAnimalPDF()" style="height:56px; font-size:1.1rem; border-radius:14px;">
                    <i class="fas fa-file-pdf"></i> Gerar Relatório Completo do Pet
                </button>
            </div>
        `;
    }

    async generateAnimalPDF() {
        if (!this.currentAnimal) return;
        const animal = this.currentAnimal;
        const history = await window.db.getAnimalHistory(animal.id);

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const PRIMARY_COLOR = [103, 58, 183];
        const TEXT_COLOR = [51, 65, 85];

        const getImageData = (url) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png', 1.0));
                };
                img.onerror = () => resolve(null);
                img.src = url;
            });
        };

        window.hotelPetApp.showLoading();

        try {
            doc.setFillColor(...PRIMARY_COLOR);
            doc.rect(0, 0, 210, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text("RELATÓRIO DO PET", 105, 20, { align: 'center' });
            doc.setFontSize(14);
            doc.text("PetCá Premium Hotel & Pet Shop", 105, 30, { align: 'center' });

            const logo = await getImageData('css/logo.png');
            if (logo) doc.addImage(logo, 'PNG', 10, 5, 25, 25);

            let y = 50;
            const petPhoto = animal.photo_url ? await getImageData(animal.photo_url) : null;
            const sexLabel = animal.sex === 'F' ? 'Fêmea' : 'Macho';

            if (petPhoto) {
                doc.addImage(petPhoto, 'JPEG', 15, y, 40, 40);
                doc.setDrawColor(...PRIMARY_COLOR);
                doc.setLineWidth(1);
                doc.rect(15, y, 40, 40);
                doc.setTextColor(...TEXT_COLOR);
                doc.setFontSize(18);
                doc.text(animal.name.toUpperCase(), 60, y + 10);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'normal');
                doc.text(`Espécie: ${animal.species} | Sexo: ${sexLabel}`, 60, y + 18);
                doc.text(`Tutor: ${animal.tutor_name}`, 60, y + 24);
                doc.text(`Telefone: ${animal.tutor_phone || 'Não informado'}`, 60, y + 30);
                y += 50;
            } else {
                doc.setTextColor(...TEXT_COLOR);
                doc.setFontSize(22);
                doc.text(animal.name.toUpperCase(), 15, y + 10);
                doc.setFontSize(12);
                doc.text(`Espécie: ${animal.species} | Sexo: ${sexLabel}`, 15, y + 20);
                doc.text(`Tutor: ${animal.tutor_name}`, 15, y + 26);
                y += 35;
            }

            doc.setFillColor(248, 250, 252);
            doc.rect(15, y, 180, 50, 'F');
            doc.setTextColor(...PRIMARY_COLOR);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.text("INFORMAÇÕES DE SAÚDE E CUIDADOS", 20, y + 10);
            doc.setTextColor(...TEXT_COLOR);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Peso Base: ${animal.weight || 'N/A'} kg`, 20, y + 20);
            doc.text(`Alergias: ${animal.allergies || 'Nenhuma'}`, 20, y + 26);
            doc.text(`Medicações Atuais: ${animal.medication || 'Nenhuma'}`, 20, y + 32);
            const vetNotes = doc.splitTextToSize(`Observações Veterinárias: ${animal.vet_notes || 'Sem observações.'}`, 170);
            doc.text(vetNotes, 20, y + 40);
            y += 65;

            const vaccines = history.filter(h => h.type === 'VACINAÇÃO');
            if (vaccines.length > 0) {
                doc.setTextColor(...PRIMARY_COLOR);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(13);
                doc.text("HISTÓRICO DE VACINAÇÃO (IMUNIDADE)", 15, y);
                const vacBody = vaccines.map(v => {
                    let d = {}; try { d = JSON.parse(v.description); } catch (e) { }
                    return [
                        d.name || 'Vacina',
                        d.dose || '-',
                        new Date(v.date + 'T12:00:00').toLocaleDateString('pt-BR'),
                        new Date(d.nextDate + 'T12:00:00').toLocaleDateString('pt-BR'),
                        d.vet || '-'
                    ];
                });
                doc.autoTable({
                    startY: y + 5,
                    head: [['Vacina', 'Dose', 'Data', 'Reforço', 'Veterinário']],
                    body: vacBody,
                    headStyles: { fillColor: PRIMARY_COLOR },
                    margin: { left: 15, right: 15 }
                });
                y = doc.lastAutoTable.finalY + 15;
            }

            const general = history.filter(h => h.type !== 'VACINAÇÃO');
            if (general.length > 0) {
                if (y > 230) { doc.addPage(); y = 20; }
                doc.setTextColor(...PRIMARY_COLOR);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(13);
                doc.text("HISTÓRICO DE SERVIÇOS E OCORRÊNCIAS", 15, y);
                const genBody = general.map(g => [
                    g.type,
                    new Date(g.date + 'T12:00:00').toLocaleDateString('pt-BR'),
                    g.description
                ]);
                doc.autoTable({
                    startY: y + 5,
                    head: [['Tipo', 'Data', 'Descrição / Observação']],
                    body: genBody,
                    headStyles: { fillColor: [71, 85, 105] },
                    margin: { left: 15, right: 15 }
                });
            }

            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(9);
                doc.setTextColor(150);
                doc.text(`Documento gerado automaticamente pelo Sistema PetCá Premium em ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });
                doc.text(`Página ${i} de ${pageCount}`, 195, 285, { align: 'right' });
            }

            this.showPDFOptions(doc, `Relatorio_${animal.name}.pdf`);
            window.hotelPetApp.showNotification('Relatório do Pet gerado com sucesso!');
        } catch (error) {
            console.error(error);
            window.hotelPetApp.showNotification('Erro ao gerar relatório', 'error');
        } finally {
            window.hotelPetApp.hideLoading();
        }
    }

    renderHealthSummary(animal, history) {
        let lastWeight = animal.weight ? animal.weight + ' kg' : 'Não informado';
        // Se houver peso no histórico mais recente, usa ele (opcional, pode-se mostrar os dois)
        const weightEntry = history.filter(h => {
            if (h.type === 'VACINAÇÃO') {
                try { const d = JSON.parse(h.description); return d.weight; } catch (e) { return false; }
            }
            return false;
        }).sort((a, b) => new Date(b.date) - new Date(a.date))[0];

        if (weightEntry) {
            try { lastWeight = JSON.parse(weightEntry.description).weight + ' kg (Histórico)'; } catch (e) { }
        }

        const meds = history.filter(h => h.type === 'MEDICAÇÃO')
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        const medsHistoryHtml = meds.length > 0
            ? meds.map(m => `<div class="medication-list-item"><i class="fas fa-pills"></i> <span>${m.description} (${new Date(m.date + 'T12:00:00').toLocaleDateString('pt-BR')})</span></div>`).join('')
            : '';

        const continuousMeds = animal.medication ? `<div style="margin-bottom:0.5rem; color:#e11d48; font-weight:600;"><i class="fas fa-exclamation-circle"></i> Uso Contínuo: ${animal.medication}</div>` : '';

        const finalMedsHtml = (continuousMeds + medsHistoryHtml) || '<span style="color:#94a3b8;">Nenhuma medicação registrada.</span>';

        return `
            <div class="info-health-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem;">
                <div class="health-item"><strong>PESO ATUAL:</strong> <span>${lastWeight}</span></div>
                <div class="health-item"><strong>SEXO:</strong> <span>${animal.sex === 'F' ? 'Fêmea' : 'Macho'}</span></div>
                <div class="health-item"><strong>ALERGIAS:</strong> <span style="color:${animal.allergies ? '#e11d48' : 'inherit'}; font-weight:${animal.allergies ? '700' : '400'};">${animal.allergies || 'Nenhuma'}</span></div>
                <div class="health-item"><strong>MEDICAÇÃO / TRATAMENTO:</strong> 
                    <div style="margin-top: 0.5rem;">${finalMedsHtml}</div>
                </div>
                <div class="health-item" style="grid-column: 1/-1;"><strong>NOTAS DO VETERINÁRIO:</strong> <p style="white-space: pre-wrap;">${animal.vet_notes || 'Sem observações.'}</p></div>
            </div>
        `;
    }

    renderHistoryList(history, isVaccineOnly) {
        const filtered = history.filter(h => isVaccineOnly ? h.type === 'VACINAÇÃO' : h.type !== 'VACINAÇÃO');
        if (filtered.length === 0) return '<p style="text-align:center; color:#64748b; padding:2rem;">Nenhum registro encontrado.</p>';

        return filtered.sort((a, b) => new Date(b.date) - new Date(a.date)).map(entry => {
            if (entry.type === 'VACINAÇÃO') return this.renderVaccineCard(entry);
            const typeClass = entry.type.toLowerCase();
            return `
            <div class="history-entry" style="position:relative; padding-bottom:2.5rem;">
                <div class="history-icon ${typeClass}"><i class="fas fa-${this.getHistoryIcon(entry.type)}"></i></div>
                <div class="history-details" style="width:100%;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.25rem;">
                        <span class="history-type" style="font-weight:700;">${entry.type}</span>
                        <span class="history-date" style="font-size:0.85rem; color:#64748b;">${new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    </div>
                    <p class="history-description" style="margin:0;">${entry.description}</p>
                </div>
                <button class="btn-vac-delete" style="width:32px; height:32px; font-size:0.8rem; position:absolute; right:10px; bottom:10px;" onclick="window.animalProfileManager.deleteHistoryEntry(${entry.id})"><i class="fas fa-trash"></i></button>
            </div>`;
        }).join('');
    }

    renderVaccineCard(entry) {
        let v = {};
        try { v = JSON.parse(entry.description); } catch (e) { v = { name: 'Vacina', dose: 'N/A', nextDate: '' }; }

        const nextDate = new Date(v.nextDate + 'T12:00:00');
        const diff = Math.ceil((nextDate - new Date()) / (1000 * 60 * 60 * 24));

        let status = 'status-ok'; let text = 'Em dia';
        if (diff < 0) { status = 'status-expired'; text = 'Vencida'; }
        else if (diff <= 7) { status = 'status-warning'; text = 'Vence em breve'; }

        return `
        <div class="vaccine-card ${status}">
            <div class="vac-header">
                <div>
                    <strong style="display:block; font-size:1.25rem;">${v.name}</strong>
                    <span style="color:#64748b; font-weight:600; font-size:0.9rem;">${v.dose}</span>
                </div>
                <span class="vac-status-badge">${text}</span>
            </div>
            
            <div class="vac-info">
                <span><i class="fas fa-calendar-check" style="color:#10b981;"></i> Aplicada: <strong>${new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}</strong></span>
                <span><i class="fas fa-sync" style="color:#ef4444;"></i> Reforço: <strong>${nextDate.toLocaleDateString('pt-BR')}</strong></span>
            </div>

            <div class="vac-meta">
                <i class="fas fa-barcode"></i> Lote: ${v.lote || '-'} | <i class="fas fa-user-md"></i> Vet: ${v.vet || '-'} | <i class="fas fa-weight"></i> Peso: ${v.weight || '-'}kg
            </div>

            <div class="vac-actions">
                <button class="btn-vac-next" onclick="event.stopPropagation(); window.animalProfileManager.quickNext('${v.name}', '${v.dose}')">
                    <i class="fas fa-plus-circle"></i> Agendar Próxima Dose
                </button>
                <button class="btn-vac-delete" onclick="event.stopPropagation(); window.animalProfileManager.deleteHistoryEntry(${entry.id})" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
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
        const map = {
            'BANHO': 'bath',
            'TOSA': 'cut',
            'VETERINÁRIO': 'stethoscope',
            'MEDICAÇÃO': 'pills',
            'HOSPEDAGEM': 'bed',
            'VACINAÇÃO': 'syringe',
            'OBSERVAÇÃO': 'clipboard-list'
        };
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
            const vacName = document.getElementById('vac-name').value;
            const finalVacName = vacName === 'OUTRA' ? document.getElementById('vac-name-custom').value : vacName;
            const data = {
                name: finalVacName || 'Vacina',
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
    async showPDFOptions(doc, filename, reservationData = null) {
        if (window.PDFHelper) {
            await window.PDFHelper.showPDFOptions(doc, filename, reservationData);
        } else {
            console.warn('PDFHelper not available, saving locally');
            doc.save(filename);
        }
    }


}
window.animalProfileManager = new AnimalProfileManager();