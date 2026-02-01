class AnimalsManager {
    constructor() {
        this.currentAnimalId = null;
        this.currentPhotoBase64 = null;
    }

    init() {
        this.bindEvents();
        console.log('✅ Animals Manager inicializado');
    }

    bindEvents() {
        // Botão Novo Animal
        const addBtn = document.getElementById('add-animal-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                console.log('🔘 Botão Novo Animal clicado');
                this.openAnimalModal();
            });
        }

        // Formulário - Listener mais robusto
        const form = document.getElementById('animal-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('📝 Submit do formulário detectado');
                await this.saveAnimal();
            });
        }

        // Upload foto
        const photoInput = document.getElementById('animal-photo');
        if (photoInput) {
            photoInput.addEventListener('change', (e) => {
                console.log('📸 Foto selecionada');
                this.handlePhotoUpload(e);
            });
        }

        // Busca
        document.getElementById('animal-search')?.addEventListener('input', () => this.applyFilters());
    }

    async saveAnimal() {
        console.log('🚀 Iniciando salvamento de animal...');
        
        try {
            const name = document.getElementById('animal-name')?.value?.trim();
            const species = document.getElementById('animal-species')?.value;
            const tutor = document.getElementById('tutor-name')?.value?.trim();
            const phone = document.getElementById('tutor-phone')?.value?.trim();

            console.log('Dados coletados:', { name, species, tutor, phone });

            if (!name || !tutor || !species) {
                alert('❌ Erro: Nome, Tutor e Espécie são obrigatórios!');
                console.error('Validação falhou');
                return;
            }

            if (!window.db || !window.db.isInitialized) {
                alert('❌ Banco de dados não inicializado!');
                console.error('DB não pronto');
                return;
            }

            // Processar foto
            let finalPhotoUrl = this.currentPhotoBase64;
            if (this.currentPhotoBase64 && this.currentPhotoBase64.startsWith('data:image') && window.storageService) {
                console.log('💾 Salvando foto no dispositivo...');
                finalPhotoUrl = await window.storageService.saveImage(this.currentPhotoBase64);
            }

            const animalData = {
                name: name.toUpperCase(),
                species: species,
                tutor_name: tutor.toUpperCase(),
                tutor_phone: phone,
                photo_url: finalPhotoUrl || null
            };

            console.log('Dados finais para DB:', animalData);

            if (this.currentAnimalId) {
                console.log('✏️ Atualizando animal ID:', this.currentAnimalId);
                await window.db.updateAnimal(this.currentAnimalId, animalData);
                window.hotelPetApp?.showNotification('Animal atualizado com sucesso! 🐕', 'success');
            } else {
                console.log('➕ Adicionando novo animal');
                await window.db.addAnimal(animalData);
                window.hotelPetApp?.showNotification('Novo animal cadastrado! 🐶', 'success');
            }

            // Recarregar lista e fechar modal
            await this.loadAnimals();
            window.hotelPetApp?.closeAllModals();

        } catch (error) {
            console.error('❌ Erro completo no salvamento:', error);
            alert('❌ Erro ao salvar animal: ' + error.message + '\nVerifique o console para detalhes.');
        }
    }

    // Resto dos métodos permanecem iguais...
    handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        console.log('📁 Lendo arquivo de foto...');
        
        const reader = new FileReader();
        reader.onload = (event) => {
            this.currentPhotoBase64 = event.target.result;
            const preview = document.getElementById('photo-preview');
            const placeholder = document.getElementById('photo-placeholder');
            if (preview) {
                preview.src = this.currentPhotoBase64;
                preview.style.display = 'block';
            }
            if (placeholder) placeholder.style.display = 'none';
            console.log('✅ Preview da foto carregado');
        };
        reader.readAsDataURL(file);
    }

    openAnimalModal(id = null) {
        console.log('🪟 Abrindo modal de animal (ID:', id, ')');
        this.currentAnimalId = id;
        this.currentPhotoBase64 = null;
        
        const modal = document.getElementById('animal-modal');
        const form = document.getElementById('animal-form');
        const title = document.getElementById('animal-modal-title');
        const preview = document.getElementById('photo-preview');
        const placeholder = document.getElementById('photo-placeholder');

        if (form) form.reset();
        if (preview) preview.style.display = 'none';
        if (placeholder) placeholder.style.display = 'flex';
        
        if (id) {
            title.textContent = 'Editar Animal';
            window.db.getAnimalById(id).then(a => {
                if (!a) {
                    alert('Animal não encontrado!');
                    return;
                }
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
        } else {
            title.textContent = 'Novo Animal';
        }
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    async loadAnimals() {
        console.log('🔄 Recarregando lista de animais...');
        if (!window.db || !window.db.isInitialized) return;
        const animals = await window.db.getAnimals();
        this.renderAnimalsTable(animals);
    }

    renderAnimalsTable(animals) {
        // Implementação igual à anterior (mantida para brevidade)
        const container = document.querySelector('#animals .table-container');
        if (!container) return;
        // ... resto do código de renderização
    }

    async deleteAnimal(id) {
        if (confirm('Excluir este animal?')) {
            await window.db.deleteAnimal(id);
            await this.loadAnimals();
            window.hotelPetApp?.showNotification('Animal excluído!', 'info');
        }
    }

    editAnimal(id) {
        this.openAnimalModal(id);
    }

    applyFilters() {
        const search = document.getElementById('animal-search')?.value || '';
        window.db.getAnimals(search).then(animals => this.renderAnimalsTable(animals));
    }
}

// Tornar global para uso em onclicks inline
window.AnimalsManager = AnimalsManager;