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
                console.log('Botão salvar clicado!');
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

        // Ícone de pata em SVG (Data URI) para funcionar 100% offline
        const localPlaceholder = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><path fill='%23cbd5e0' d='M256 160c12.9 0 24.7 3.9 34.2 10.5l5.8-14.8C311 118.6 285.2 96 256 96s-55 22.6-40 59.7l5.8 14.8c9.5-6.6 21.3-10.5 34.2-10.5zm-112 80c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zm224 0c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zM256 320c-44.2 0-80 35.8-80 80s35.8 80 80 80 80-35.8 80-80-35.8-80-80-80z'/></svg>`;

        let html = '<div class="animals-list-container">';
        if (animals.length === 0) {
            html += '<p style="text-align:center; padding:2rem; color:#64748b;">Nenhum pet cadastrado.</p>';
        } else {
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
                        <p><strong>Tutor:</strong> ${a.tutor_name}</p>
                        <p><strong>Fone:</strong> ${a.tutor_phone}</p>
                        <div class="animal-item-actions">
                            <button class="btn btn-sm btn-secondary" onclick="animalsManager.editAnimal(${a.id})">Editar</button>
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
            console.log('Iniciando processo de salvamento...');
            const name = document.getElementById('animal-name').value;
            const species = document.getElementById('animal-species').value;
            const tutor = document.getElementById('tutor-name').value;
            const phone = document.getElementById('tutor-phone').value;

            if (!name || !tutor) {
                alert('O nome do animal e do tutor são obrigatórios!');
                return;
            }

            window.hotelPetApp?.showLoading();

            // PASSO 1: Salvar a imagem no disco (se houver nova foto)
            let finalPhotoUrl = this.currentPhotoBase64;
            if (this.currentPhotoBase64 && this.currentPhotoBase64.startsWith('data:image') && window.storageService) {
                console.log('Salvando arquivo de imagem no celular...');
                finalPhotoUrl = await window.storageService.saveImage(this.currentPhotoBase64);
            }

            // PASSO 2: Salvar registro no banco de dados SQLite
            const data = {
                name: name.toUpperCase().trim(),
                species: species,
                tutor_name: tutor.toUpperCase().trim(),
                tutor_phone: phone.trim(),
                photo_url: finalPhotoUrl
            };

            console.log('Gravando no banco SQLite...', data.name);
            if (this.currentAnimalId) {
                await db.updateAnimal(this.currentAnimalId, data);
            } else {
                await db.addAnimal(data);
            }

            console.log('Sucesso! Fechando modal e atualizando lista.');
            
            // Forçar fechamento e recarregamento
            this.closeAnimalModal();
            await this.loadAnimals();
            
            if (window.hotelPetApp) {
                window.hotelPetApp.showNotification('Animal salvo com sucesso!', 'success');
            } else {
                alert('Animal salvo com sucesso!');
            }

        } catch (e) {
            console.error('ERRO NO SALVAMENTO:', e);
            alert('Erro ao salvar: ' + e.message);
        } finally {
            window.hotelPetApp?.hideLoading();
        }
    }

    handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validar tamanho (máximo 5MB para não travar o processamento)
        if (file.size > 5 * 1024 * 1024) {
            alert('A foto é muito grande! Tente uma foto menor ou tire uma nova.');
            return;
        }

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
        document.getElementById('animal-form').reset();
        
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

    closeAnimalModal() {
        document.getElementById('animal-modal').classList.remove('active');
        document.body.style.overflow = '';
    }

    async deleteAnimal(id) {
        if (confirm('Deseja realmente excluir este animal?')) {
            await db.deleteAnimal(id);
            await this.loadAnimals();
        }
    }

    editAnimal(id) { this.openAnimalModal(id); }
    
    applyFilters() {
        const s = document.getElementById('animal-search')?.value || '';
        db.getAnimals(s).then(res => this.renderAnimalsTable(res));
    }
}

window.animalsManager = new AnimalsManager();