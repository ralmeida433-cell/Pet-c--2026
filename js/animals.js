class AnimalsManager {
    constructor() {
        this.currentAnimalId = null;
        this.currentPhotoBase64 = null;
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bindEvents());
        } else {
            this.bindEvents();
        }
    }

    bindEvents() {
        const form = document.getElementById('animal-form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                await this.saveAnimal();
            };
        }
        
        document.getElementById('add-animal-btn')?.addEventListener('click', () => this.openAnimalModal());
        document.getElementById('cancel-animal')?.addEventListener('click', () => this.closeAnimalModal());
        document.getElementById('animal-photo')?.addEventListener('change', e => this.handlePhotoUpload(e));
        document.getElementById('animal-search')?.addEventListener('input', () => this.applyFilters());
    }

    async loadAnimals() {
        const animals = await db.getAnimals();
        this.renderAnimalsTable(animals);
    }

    renderAnimalsTable(animals) {
        const container = document.querySelector('#animals .table-container');
        if (!container) return;

        let html = '<div class="animals-list-container">';
        if (animals.length === 0) {
            html += '<p style="text-align:center; padding:2rem;">Nenhum pet cadastrado.</p>';
        } else {
            animals.forEach(a => {
                html += `
                <div class="animal-list-item">
                    <div class="animal-item-header" onclick="this.parentElement.classList.toggle('expanded')">
                        <div class="animal-item-summary">
                            <div class="animal-thumb"><img src="${a.photo_url || 'https://via.placeholder.com/150?text=🐾'}" onerror="this.src='https://via.placeholder.com/150?text=Erro'"></div>
                            <div class="animal-basic-info"><strong>${a.name}</strong><span>${a.species}</span></div>
                        </div>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="animal-item-details">
                        <p>Tutor: ${a.tutor_name}</p>
                        <p>Fone: ${a.tutor_phone}</p>
                        <div class="animal-item-actions">
                            <button class="btn btn-sm btn-warning" onclick="animalsManager.editAnimal(${a.id})">Editar</button>
                            <button class="btn btn-sm btn-danger" onclick="animalsManager.deleteAnimal(${a.id})">Excluir</button>
                        </div>
                    </div>
                </div>`;
            });
        }
        html += '</div>';
        container.innerHTML = html;
    }

    async saveAnimal() {
        try {
            const name = document.getElementById('animal-name').value;
            const species = document.getElementById('animal-species').value;
            const tutor = document.getElementById('tutor-name').value;
            const phone = document.getElementById('tutor-phone').value;

            if (!name || !tutor) return alert('Preencha os campos obrigatórios.');

            window.hotelPetApp?.showLoading();

            // PASSO 1: Salvar a imagem no disco do celular primeiro
            let finalPhotoUrl = this.currentPhotoBase64;
            if (this.currentPhotoBase64 && window.storageService) {
                finalPhotoUrl = await window.storageService.saveImage(this.currentPhotoBase64);
            }

            // PASSO 2: Salvar registro no banco
            const data = {
                name: name.toUpperCase(),
                species: species,
                tutor_name: tutor.toUpperCase(),
                tutor_phone: phone,
                photo_url: finalPhotoUrl
            };

            if (this.currentAnimalId) {
                await db.updateAnimal(this.currentAnimalId, data);
            } else {
                await db.addAnimal(data);
            }

            window.hotelPetApp?.showNotification('Salvo com sucesso!', 'success');
            this.closeAnimalModal();
            await this.loadAnimals();
        } catch (e) {
            alert('Erro ao salvar: ' + e.message);
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
            document.getElementById('photo-preview').src = this.currentPhotoBase64;
            document.getElementById('photo-preview').style.display = 'block';
            document.getElementById('photo-placeholder').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    openAnimalModal(id = null) {
        this.currentAnimalId = id;
        this.currentPhotoBase64 = null;
        document.getElementById('animal-form').reset();
        document.getElementById('photo-preview').style.display = 'none';
        document.getElementById('photo-placeholder').style.display = 'flex';
        
        if (id) {
            db.getAnimalById(id).then(a => {
                document.getElementById('animal-name').value = a.name;
                document.getElementById('animal-species').value = a.species;
                document.getElementById('tutor-name').value = a.tutor_name;
                document.getElementById('tutor-phone').value = a.tutor_phone;
                if (a.photo_url) {
                    document.getElementById('photo-preview').src = a.photo_url;
                    document.getElementById('photo-preview').style.display = 'block';
                    document.getElementById('photo-placeholder').style.display = 'none';
                    this.currentPhotoBase64 = a.photo_url;
                }
            });
        }
        document.getElementById('animal-modal').classList.add('active');
    }

    closeAnimalModal() {
        document.getElementById('animal-modal').classList.remove('active');
    }

    async deleteAnimal(id) {
        if (confirm('Excluir este animal?')) {
            await db.deleteAnimal(id);
            await this.loadAnimals();
        }
    }

    editAnimal(id) { this.openAnimalModal(id); }
    applyFilters() {
        const s = document.getElementById('animal-search').value;
        db.getAnimals(s).then(res => this.renderAnimalsTable(res));
    }
}

window.animalsManager = new AnimalsManager();