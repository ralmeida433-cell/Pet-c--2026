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
        this.initCamera();
        console.log('Animals Manager initialized');
    }

    async initCamera() {
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            try {
                const { Camera } = Capacitor.Plugins;
                this.camera = Camera;
            } catch (e) {
                console.warn('Camera plugin not available');
            }
        }
    }

    bindEvents() {
        const addBtn = document.getElementById('add-animal-btn');
        const animalForm = document.getElementById('animal-form');
        const cancelBtn = document.getElementById('cancel-animal');
        const photoInput = document.getElementById('animal-photo');
        const searchInput = document.getElementById('animal-search');
        const filterSelect = document.getElementById('kennel-filter');
        const modal = document.getElementById('animal-modal');

        if (addBtn) addBtn.addEventListener('click', () => this.openAnimalModal());
        if (animalForm) {
            animalForm.addEventListener('submit', async e => {
                e.preventDefault();
                await this.saveAnimal();
            });
        }
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeAnimalModal());
        if (photoInput) photoInput.addEventListener('change', e => this.handlePhotoUpload(e));
        if (searchInput) searchInput.addEventListener('input', this.debounce(() => this.applyFilters(), 300));
        if (filterSelect) filterSelect.addEventListener('change', () => this.applyFilters());
        
        if (modal) {
            modal.addEventListener('click', e => {
                if (e.target === e.currentTarget) this.closeAnimalModal();
            });
        }

        const startCameraBtn = document.getElementById('start-camera-btn');
        if (startCameraBtn) startCameraBtn.addEventListener('click', () => this.handleCameraStart());
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
        this.loadAnimalsFiltered(searchInput.value, filterSelect.value);
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
        // CORREÇÃO: Buscar o container específico da seção de animais para não conflitar com dashboard
        const animalsSection = document.getElementById('animals');
        if (!animalsSection) return;

        const tableContainer = animalsSection.querySelector('.table-container');
        if (!tableContainer) return;

        // Limpar conteúdo anterior
        const existingList = tableContainer.querySelector('.animals-list-container');
        if (existingList) existingList.remove();
        
        const table = document.getElementById('animals-table');
        if (table) table.style.display = 'none';

        if (animals.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'animals-list-container';
            emptyDiv.innerHTML = `
                <div style="padding: 3rem; text-align: center; color: #94a3b8;">
                    <i class="fas fa-paw" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>Nenhum animal cadastrado</p>
                </div>
            `;
            tableContainer.appendChild(emptyDiv);
            return;
        }

        const listContainer = document.createElement('div');
        listContainer.className = 'animals-list-container';

        animals.forEach(animal => {
            const item = document.createElement('div');
            item.className = 'animal-list-item';
            item.innerHTML = `
                <div class="animal-item-header" onclick="this.parentElement.classList.toggle('expanded')">
                    <div class="animal-item-summary">
                        <div class="animal-thumb">
                            <img src="${animal.photo_url || 'https://via.placeholder.com/150?text=🐾'}" alt="${animal.name}">
                        </div>
                        <div class="animal-basic-info">
                            <span class="animal-list-name">${animal.name}</span>
                            <span class="animal-list-species"><i class="fas fa-${animal.species === 'GATO' ? 'cat' : 'dog'}"></i> ${animal.species}</span>
                        </div>
                    </div>
                    <div class="animal-item-toggle"><i class="fas fa-chevron-down"></i></div>
                </div>
                <div class="animal-item-details">
                    <div class="detail-row"><span class="detail-label">Tutor:</span><span class="detail-value">${animal.tutor_name}</span></div>
                    <div class="detail-row">
                        <span class="detail-label">Telefone:</span>
                        <div class="detail-value contact-link">
                            <span>${animal.tutor_phone}</span>
                            <a href="https://wa.me/${this.formatPhoneForWhatsApp(animal.tutor_phone)}" target="_blank" class="whatsapp-direct-link"><i class="fab fa-whatsapp"></i></a>
                        </div>
                    </div>
                    <div class="animal-item-actions">
                        <button class="btn btn-sm btn-warning" onclick="animalsManager.editAnimal(${animal.id})"><i class="fas fa-edit"></i> Editar</button>
                        <button class="btn btn-sm btn-danger" onclick="animalsManager.deleteAnimal(${animal.id})"><i class="fas fa-trash"></i> Excluir</button>
                    </div>
                </div>
            `;
            listContainer.appendChild(item);
        });

        tableContainer.appendChild(listContainer);
    }

    formatPhoneForWhatsApp(phone) {
        if (!phone) return '';
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11 || cleaned.length === 10) cleaned = '55' + cleaned;
        return cleaned;
    }

    async handleCameraStart() {
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            await this.takeNativePhoto();
        } else {
            await this.startWebCamera();
        }
    }

    async takeNativePhoto() {
        try {
            const { Camera, CameraResultType, CameraSource } = Capacitor.Plugins;
            let permissions = await Camera.checkPermissions();
            if (permissions.camera !== 'granted') {
                permissions = await Camera.requestPermissions({ permissions: ['camera'] });
            }
            if (permissions.camera !== 'granted') return;

            const image = await Camera.getPhoto({
                quality: 80,
                allowEditing: false,
                resultType: CameraResultType.DataUrl,
                source: CameraSource.Camera
            });

            this.currentPhotoBase64 = image.dataUrl;
            const preview = document.getElementById('photo-preview');
            const placeholder = document.getElementById('photo-placeholder');
            if (preview) { preview.src = this.currentPhotoBase64; preview.style.display = 'block'; }
            if (placeholder) placeholder.style.display = 'none';
        } catch (error) {
            console.error('Erro na foto nativa:', error);
        }
    }

    async startWebCamera() {
        const container = document.getElementById('camera-container');
        const video = document.getElementById('camera-feed');
        if (!container || !video) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
            video.srcObject = stream;
            container.style.display = 'block';
            this.activeStream = stream;
        } catch (error) {
            alert('Câmera não disponível no navegador.');
        }
    }

    stopCamera() {
        if (this.activeStream) { this.activeStream.getTracks().forEach(track => track.stop()); this.activeStream = null; }
        const container = document.getElementById('camera-container');
        if (container) container.style.display = 'none';
    }

    openAnimalModal(animalId = null) {
        this.stopCamera();
        this.currentAnimalId = animalId;
        this.currentPhotoBase64 = null;

        const modal = document.getElementById('animal-modal');
        const form = document.getElementById('animal-form');
        const title = document.getElementById('animal-modal-title');
        const preview = document.getElementById('photo-preview');
        const placeholder = document.getElementById('photo-placeholder');

        if (!modal) return;
        if (form) form.reset();
        if (preview) { preview.src = ''; preview.style.display = 'none'; }
        if (placeholder) placeholder.style.display = 'flex';

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
        if (modal) { modal.classList.remove('active'); document.body.style.overflow = ''; }
    }

    async loadAnimalData(id) {
        try {
            const animal = await db.getAnimalById(id);
            if (!animal) return;
            document.getElementById('animal-name').value = animal.name;
            document.getElementById('animal-species').value = animal.species;
            document.getElementById('tutor-name').value = animal.tutor_name;
            document.getElementById('tutor-phone').value = animal.tutor_phone;

            if (animal.photo_url) {
                const preview = document.getElementById('photo-preview');
                const placeholder = document.getElementById('photo-placeholder');
                preview.src = animal.photo_url;
                preview.style.display = 'block';
                this.currentPhotoBase64 = animal.photo_url;
                if (placeholder) placeholder.style.display = 'none';
            }
        } catch (error) { console.error(error); }
    }

    handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            let result = e.target.result;
            if (window.storageService) {
                try { result = await window.storageService.saveImage(result); } catch (err) {}
            }
            this.currentPhotoBase64 = result;
            document.getElementById('photo-preview').src = result;
            document.getElementById('photo-preview').style.display = 'block';
            document.getElementById('photo-placeholder').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    async saveAnimal() {
        const name = document.getElementById('animal-name').value;
        const species = document.getElementById('animal-species').value;
        const tutor = document.getElementById('tutor-name').value;
        const phone = document.getElementById('tutor-phone').value;

        if (!name || !tutor || !phone) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        const animalData = {
            name: name.toUpperCase(),
            species: species,
            tutor_name: tutor.toUpperCase(),
            tutor_phone: phone,
            photo_url: this.currentPhotoBase64
        };

        try {
            this.showLoading();
            if (this.currentAnimalId) {
                await db.updateAnimal(this.currentAnimalId, animalData);
            } else {
                await db.addAnimal(animalData);
            }

            // Notificação de sucesso
            if (window.hotelPetApp) {
                window.hotelPetApp.showNotification('Animal salvo com sucesso!', 'success');
            }

            this.closeAnimalModal();
            await this.loadAnimals();
            
            if (window.reservationsManager) {
                await window.reservationsManager.loadAnimalsDropdown();
            }
            this.hideLoading();
        } catch (error) {
            console.error('Erro ao salvar:', error);
            this.hideLoading();
            alert('Erro ao salvar animal: ' + error.message);
        }
    }

    async deleteAnimal(id) {
        if (!confirm('Tem certeza que deseja excluir este animal?')) return;
        try {
            await db.deleteAnimal(id);
            if (window.hotelPetApp) window.hotelPetApp.showNotification('Animal excluído.', 'success');
            await this.loadAnimals();
        } catch (error) { alert(error.message); }
    }

    async editAnimal(id) { this.openAnimalModal(id); }

    showLoading() { if (window.hotelPetApp) window.hotelPetApp.showLoading(); }
    hideLoading() { if (window.hotelPetApp) window.hotelPetApp.hideLoading(); }

    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
}