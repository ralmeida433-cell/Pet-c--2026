class AnimalsManager {
    constructor() {
        this.currentAnimalId = null;
        this.currentPhotoBase64 = null;
        this.init();
    }

    init() {
        // Aguardar DOM estar pronto antes de vincular eventos
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bindEvents());
        } else {
            this.bindEvents();
        }
        console.log('Animals Manager initialized');
    }

    bindEvents() {
        // Verificar se elementos existem antes de adicionar eventos
        const addBtn = document.getElementById('add-animal-btn');
        const animalForm = document.getElementById('animal-form');
        const cancelBtn = document.getElementById('cancel-animal');
        const photoInput = document.getElementById('animal-photo');
        const searchInput = document.getElementById('animal-search');
        const filterSelect = document.getElementById('kennel-filter');
        const modal = document.getElementById('animal-modal');

        if (addBtn) {
            addBtn.addEventListener('click', () => this.openAnimalModal());
        }

        if (animalForm) {
            animalForm.addEventListener('submit', e => {
                e.preventDefault();
                this.saveAnimal();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeAnimalModal());
        }

        if (photoInput) {
            photoInput.addEventListener('change', e => this.handlePhotoUpload(e));
        }

        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => this.applyFilters(), 300));
        }

        if (filterSelect) {
            filterSelect.addEventListener('change', () => this.applyFilters());
        }

        if (modal) {
            modal.addEventListener('click', e => {
                if (e.target === e.currentTarget) {
                    this.closeAnimalModal();
                }
            });
        }

        // Fechar modal com botão X
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', e => {
                if (e.target.closest('#animal-modal')) {
                    this.closeAnimalModal();
                }
            });
        });
    }

    async loadAnimals() {
        try {
            this.showLoading();
            const animals = await db.getAnimals();
            this.renderAnimalsTable(animals);
            this.hideLoading();
        } catch (error) {
            console.error('Erro ao carregar animais:', error);
            this.hideLoading();
        }
    }

    applyFilters() {
        const searchInput = document.getElementById('animal-search');
        const filterSelect = document.getElementById('kennel-filter');

        if (!searchInput || !filterSelect) return;

        const search = searchInput.value;
        const filter = filterSelect.value;

        this.loadAnimalsFiltered(search, filter);
    }

    async loadAnimalsFiltered(search = '', kennelType = '') {
        try {
            const animals = await db.getAnimals(search, kennelType);
            this.renderAnimalsTable(animals);
        } catch (error) {
            console.error('Erro ao carregar animais filtrados:', error);
        }
    }

    renderAnimalsTable(animals) {
        const tbody = document.querySelector('#animals-table tbody');
        if (!tbody) return;

        if (animals.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div style="padding: 2rem;">
                            <i class="fas fa-paw" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem; display: block;"></i>
                            <p>Nenhum animal encontrado</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = animals.map(animal => `
            <tr>
                <td data-label="Foto">
                    <div style="display: flex; justify-content: flex-end; align-items: center;">
                        <img src="${animal.photo_url || 'https://via.placeholder.com/40'}" 
                             alt="${animal.name}" 
                             style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                    </div>
                </td>
                <td data-label="Animal"><strong>${animal.name}</strong></td>
                <td data-label="Espécie">
                    <i class="fas fa-${animal.species === 'CÃO' ? 'dog' : 'cat'}"></i> 
                    ${animal.species}
                </td>
                <td data-label="Tutor">${animal.tutor_name}</td>
                <td data-label="Telefone">${animal.tutor_phone}</td>
                <td data-label="Ações">
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-warning" onclick="animalsManager.editAnimal(${animal.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="animalsManager.deleteAnimal(${animal.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    openAnimalModal(animalId = null) {
        this.currentAnimalId = animalId;
        this.currentPhotoBase64 = null;

        const modal = document.getElementById('animal-modal');
        const form = document.getElementById('animal-form');
        const title = document.getElementById('animal-modal-title');
        const preview = document.getElementById('photo-preview');

        if (!modal || !form) return;

        form.reset();
        if (preview) preview.style.display = 'none';

        if (animalId) {
            if (title) title.textContent = 'Editar Animal';
            this.loadAnimalData(animalId);
        } else {
            if (title) title.textContent = 'Novo Animal';
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeAnimalModal() {
        const modal = document.getElementById('animal-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    async loadAnimalData(id) {
        try {
            const animal = await db.getAnimalById(id);
            if (!animal) return;

            const nameInput = document.getElementById('animal-name');
            const speciesSelect = document.getElementById('animal-species');
            const tutorInput = document.getElementById('tutor-name');
            const phoneInput = document.getElementById('tutor-phone');
            const preview = document.getElementById('photo-preview');

            if (nameInput) nameInput.value = animal.name;
            if (speciesSelect) speciesSelect.value = animal.species;
            if (tutorInput) tutorInput.value = animal.tutor_name;
            if (phoneInput) phoneInput.value = animal.tutor_phone;

            if (animal.photo_url && preview) {
                preview.src = animal.photo_url;
                preview.style.display = 'block';
                this.currentPhotoBase64 = animal.photo_url;
            }
        } catch (error) {
            console.error('Erro ao carregar dados do animal:', error);
        }
    }

    handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = e => {
            this.currentPhotoBase64 = e.target.result;
            const preview = document.getElementById('photo-preview');
            if (preview) {
                preview.src = this.currentPhotoBase64;
                preview.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    }

    async saveAnimal() {
        const nameInput = document.getElementById('animal-name');
        const speciesSelect = document.getElementById('animal-species');
        const tutorInput = document.getElementById('tutor-name');
        const phoneInput = document.getElementById('tutor-phone');

        if (!nameInput || !speciesSelect || !tutorInput || !phoneInput) {
            console.error('Campos obrigatórios não encontrados');
            return;
        }

        const animalData = {
            name: nameInput.value,
            species: speciesSelect.value,
            tutor_name: tutorInput.value,
            tutor_phone: phoneInput.value,
            photo_url: this.currentPhotoBase64
        };

        try {
            if (this.currentAnimalId) {
                await db.updateAnimal(this.currentAnimalId, animalData);
            } else {
                await db.addAnimal(animalData);
            }

            this.closeAnimalModal();
            this.loadAnimals();

            if (window.reservationsManager) {
                window.reservationsManager.loadAnimalsDropdown();
            }
        } catch (error) {
            console.error('Erro ao salvar animal:', error);
        }
    }

    async deleteAnimal(id) {
        if (!confirm('Tem certeza que deseja excluir este animal?')) return;

        try {
            await db.deleteAnimal(id);
            this.loadAnimals();
        } catch (error) {
            alert(error.message);
        }
    }

    async editAnimal(id) {
        this.openAnimalModal(id);
    }

    showLoading() {
        // Implementar loading se necessário
    }

    hideLoading() {
        // Implementar loading se necessário
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}
