class AnimalsManager {
    constructor() {
        this.currentAnimalId = null;
        this.currentPhotoBase64 = null;
        // Não chamamos init() no constructor para evitar duplicidade
    }

    init() {
        this.bindEvents();
        console.log('Animals Manager initialized');
    }

    bindEvents() {
        const form = document.getElementById('animal-form');
        if (form) {
            // Removendo listeners antigos para evitar duplicidade
            form.removeEventListener('submit', this.handleFormSubmit);
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveAnimal();
            });
        }
        
        // Botão de fechar foto (se houver)
        document.getElementById('remove-image')?.addEventListener('click', () => {
            this.currentPhotoBase64 = null;
            const preview = document.getElementById('photo-preview');
            if (preview) preview.style.display = 'none';
            const placeholder = document.getElementById('photo-placeholder');
            if (placeholder) placeholder.style.display = 'flex';
        });

        document.getElementById('animal-photo')?.addEventListener('change', e => this.handlePhotoUpload(e));
        document.getElementById('animal-search')?.addEventListener('input', () => this.applyFilters());
    }

    async loadAnimals() {
        if (!window.db || !window.db.isInitialized) return;
        const animals = await db.getAnimals();
        this.renderAnimalsTable(animals);
    }

    renderAnimalsTable(animals) {
        const container = document.querySelector('#animals .table-container');
        if (!container) return;

        const localPlaceholder = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><path fill='%23cbd5e0' d='M256 160c12.9 0 24.7 3.9 34.2 10.5l5.8-14.8C311 118.6 285.2 96 256 96s-55 22.6-40 59.7l5.8 14.8c9.5-6.6 21.3-10.5 34.2-10.5zm-112 80c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zm224 0c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zM256 320c-44.2 0-80 35.8-80 80s35.8 80 80 80 80-35.8 80-80-35.8-80-80-80z'/></svg>`;

        if (animals.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding:2rem; color:#64748b;">Nenhum pet cadastrado.</p>';
            return;
        }

        let html = '<div class="animals-list-container">';
        animals.forEach(a => {
            html += `
            <div class="animal-list-item">
                <div class="animal-item-header" onclick="this.parentElement.classList.toggle('expanded')">
                    <div class="animal-item-summary">
                        <div class="animal-thumb">
                            <img src="${a.photo_url || localPlaceholder}" onerror="this.src='${localPlaceholder}'">
                        </div>
                        <div class="animal-basic-info"><strong>${a.name}</strong><span>${a.species}</span></div>
                    </div>
                    <i class="fas fa-chevron-down"></i>
                </div>
                <div class="animal-item-details">
                    <div class="detail-row"><span class="detail-label">Tutor:</span><span class="detail-value">${a.tutor_name}</span></div>
                    <div class="detail-row"><span class="detail-label">Fone:</span><span class="detail-value">${a.tutor_phone}</span></div>
                    <div class="animal-item-actions">
                        <button class="btn btn-sm btn-secondary" onclick="window.animalsManager.editAnimal(${a.id})"><i class="fas fa-edit"></i> Editar</button>
                        <button class="btn btn-sm btn-danger" onclick="window.animalsManager.deleteAnimal(${a.id})"><i class="fas fa-trash"></i> Excluir</button>
                    </div>
                </div>
            </div>`;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    async saveAnimal() {
        try {
            const name = document.getElementById('animal-name').value;
            const species = document.getElementById('animal-species').value;
            const tutor = document.getElementById('tutor-name').value;
            const phone = document.getElementById('tutor-phone').value;

            if (!name || !tutor) {
                window.hotelPetApp?.showNotification('Nome e Tutor são obrigatórios!', 'warning');
                return;
            }

            window.hotelPetApp?.showLoading();

            let finalPhotoUrl = this.currentPhotoBase64;
            if (this.currentPhotoBase64 && this.currentPhotoBase64.startsWith('data:image') && window.storageService) {
                finalPhotoUrl = await window.storageService.saveImage(this.currentPhotoBase64);
            }

            const data = {
                name: name.toUpperCase().trim(),
                species: species,
                tutor_name: tutor.toUpperCase().trim(),
                tutor_phone: phone.trim(),
                photo_url: finalPhotoUrl
            };

            if (this.currentAnimalId) {
                await db.updateAnimal(this.currentAnimalId, data);
            } else {
                await db.addAnimal(data);
            }

            window.hotelPetApp?.closeAllModals();
            await this.loadAnimals();
            window.hotelPetApp?.showNotification('Animal salvo com sucesso!', 'success');

        } catch (e) {
            console.error('Erro ao salvar animal:', e);
            window.hotelPetApp?.showNotification('Erro ao salvar: ' + e.message, 'error');
        } finally {
            window.hotelPetApp?.hideLoading();
        }
    }

    handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            this.currentPhotoBase64 = event.target.result;
            const preview = document.getElementById('photo-preview');
            if (preview) {
                preview.src = this.currentPhotoBase64;
                preview.style.display = 'block';
            }
            const placeholder = document.getElementById('photo-placeholder');
            if (placeholder) placeholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    openAnimalModal(id = null) {
        this.currentAnimalId = id;
        this.currentPhotoBase64 = null;
        const form = document.getElementById('animal-form');
        if (form) form.reset();
        
        const preview = document.getElementById('photo-preview');
        const placeholder = document.getElementById('photo-placeholder');
        if (preview) preview.style.display = 'none';
        if (placeholder) placeholder.style.display = 'flex';
        
        if (id) {
            db.getAnimalById(id).then(a => {
                if (!a) return;
                document.getElementById('animal-name').value = a.name;
                document.getElementById('animal-species').value = a.species;
                document.getElementById('tutor-name').value = a.tutor_name;
                document.getElementById('tutor-phone').value = a.tutor_phone;
                if (a.photo_url) {
                    if (preview) {
                        preview.src = a.photo_url;
                        preview.style.display = 'block';
                    }
                    if (placeholder) placeholder.style.display = 'none';
                    this.currentPhotoBase64 = a.photo_url;
                }
            });
        }
        document.getElementById('animal-modal').classList.add('active');
    }

    async deleteAnimal(id) {
        if (confirm('Deseja realmente excluir este animal?')) {
            await db.deleteAnimal(id);
            await this.loadAnimals();
            window.hotelPetApp?.showNotification('Animal excluído', 'info');
        }
    }

    editAnimal(id) { this.openAnimalModal(id); }
    
    applyFilters() {
        const s = document.getElementById('animal-search')?.value || '';
        db.getAnimals(s).then(res => this.renderAnimalsTable(res));
    }
}
// Não instanciamos aqui, deixamos para o app.js