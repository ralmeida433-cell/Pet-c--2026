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

        // Inicializar Camera se estiver no Capacitor
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

        // Botões de Câmera
        const startCameraBtn = document.getElementById('start-camera-btn');
        const capturePhotoBtn = document.getElementById('capture-photo-btn');

        if (startCameraBtn) {
            startCameraBtn.addEventListener('click', () => this.handleCameraStart());
        }

        if (capturePhotoBtn) {
            capturePhotoBtn.addEventListener('click', () => this.takeSnapshot());
        }
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

        // Limpar o conteúdo anterior
        tbody.innerHTML = '';

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

        // Se estiver em mobile, usar layout de lista, senão manter tabela (ou adaptar)
        // O usuário pediu especificamente o layout de lista retrátil.

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
                    <div class="animal-item-toggle">
                        <i class="fas fa-chevron-down"></i>
                    </div>
                </div>
                <div class="animal-item-details">
                    <div class="detail-row">
                        <span class="detail-label">Tutor:</span>
                        <span class="detail-value">${animal.tutor_name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Telefone:</span>
                        <div class="detail-value contact-link">
                            <span>${animal.tutor_phone}</span>
                            <a href="https://wa.me/${this.formatPhoneForWhatsApp(animal.tutor_phone)}" 
                               target="_blank" class="whatsapp-direct-link">
                                <i class="fab fa-whatsapp"></i>
                            </a>
                        </div>
                    </div>
                    <div class="animal-item-actions">
                        <button class="btn btn-sm btn-warning" onclick="animalsManager.editAnimal(${animal.id})">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="animalsManager.deleteAnimal(${animal.id})">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </div>
                </div>
            `;
            listContainer.appendChild(item);
        });

        // Para manter a compatibilidade com o HTML existente que espera um tbody em uma tabela,
        // vamos substituir a tabela inteira ou gerenciar o container.
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) {
            // Se já existir a lista, remove
            const existingList = tableContainer.querySelector('.animals-list-container');
            if (existingList) existingList.remove();

            // Ocultar a tabela original se estiver visível
            const table = document.getElementById('animals-table');
            if (table) table.style.display = 'none';

            tableContainer.appendChild(listContainer);
        }
    }

    formatPhoneForWhatsApp(phone) {
        if (!phone) return '';
        // Remover tudo que não for número e adicionar 55 se necessário
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11) cleaned = '55' + cleaned;
        if (cleaned.length === 10) cleaned = '55' + cleaned;
        return cleaned;
    }

    async addAnotherAnimal(baseAnimalId) {
        try {
            const animal = await db.getAnimalById(baseAnimalId);
            if (!animal) return;

            this.openAnimalModal();

            // Preencher dados do tutor
            setTimeout(() => {
                const tutorInput = document.getElementById('tutor-name');
                const phoneInput = document.getElementById('tutor-phone');
                if (tutorInput) tutorInput.value = animal.tutor_name;
                if (phoneInput) phoneInput.value = animal.tutor_phone;

                // Focar no nome do animal
                document.getElementById('animal-name')?.focus();
            }, 100);

        } catch (error) {
            console.error('Erro ao preparar novo animal:', error);
        }
    }

    // Gerenciamento de Câmera (Capacitor + WebBR)
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

            // Verificar permissões primeiro
            let permissions = await Camera.checkPermissions();
            if (permissions.camera !== 'granted') {
                permissions = await Camera.requestPermissions({ permissions: ['camera'] });
            }

            if (permissions.camera !== 'granted') {
                alert('Permissão de câmera é necessária para tirar fotos.');
                return;
            }

            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: true,
                resultType: CameraResultType.DataUrl,
                source: CameraSource.Camera
            });

            this.currentPhotoBase64 = image.dataUrl;
            const preview = document.getElementById('photo-preview');
            const placeholder = document.getElementById('photo-placeholder');
            if (preview) {
                preview.src = this.currentPhotoBase64;
                preview.style.display = 'block';
            }
            if (placeholder) {
                placeholder.style.display = 'none';
            }
        } catch (error) {
            console.error('Erro ao tirar foto nativa:', error);
            if (error.message !== 'User cancelled photos app') {
                alert('Erro ao acessar câmera nativa: ' + error.message);
            }
        }
    }

    async startWebCamera() {
        const container = document.getElementById('camera-container');
        const video = document.getElementById('camera-feed');

        if (!container || !video) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });

            video.srcObject = stream;
            container.style.display = 'block';

            this.activeStream = stream;
        } catch (error) {
            console.error('Erro ao acessar webcam:', error);
            alert('Não foi possível acessar a câmera. Verifique as permissões do seu navegador.');
        }
    }

    takeSnapshot() {
        const video = document.getElementById('camera-feed');
        const canvas = document.createElement('canvas');
        if (!video || !this.activeStream) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        this.currentPhotoBase64 = canvas.toDataURL('image/jpeg');

        const preview = document.getElementById('photo-preview');
        const placeholder = document.getElementById('photo-placeholder');
        if (preview) {
            preview.src = this.currentPhotoBase64;
            preview.style.display = 'block';
        }
        if (placeholder) {
            placeholder.style.display = 'none';
        }

        // Parar câmera
        this.stopCamera();
    }

    stopCamera() {
        if (this.activeStream) {
            this.activeStream.getTracks().forEach(track => track.stop());
            this.activeStream = null;
        }
        const container = document.getElementById('camera-container');
        if (container) container.style.display = 'none';
    }

    openAnimalModal(animalId = null) {
        this.stopCamera(); // Garantir que câmera tá off
        this.currentAnimalId = animalId;
        this.currentPhotoBase64 = null;

        const modal = document.getElementById('animal-modal');
        const form = document.getElementById('animal-form');
        const title = document.getElementById('animal-modal-title');
        const preview = document.getElementById('photo-preview');
        const placeholder = document.getElementById('photo-placeholder');

        if (!modal) return;

        if (form) form.reset();

        if (preview) {
            preview.src = '';
            preview.style.display = 'none';
        }
        if (placeholder) {
            placeholder.style.display = 'flex';
        }

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
            const placeholder = document.getElementById('photo-placeholder');

            if (nameInput) nameInput.value = animal.name;
            if (speciesSelect) speciesSelect.value = animal.species;
            if (tutorInput) tutorInput.value = animal.tutor_name;
            if (phoneInput) phoneInput.value = animal.tutor_phone;

            if (animal.photo_url && preview) {
                preview.src = animal.photo_url;
                preview.style.display = 'block';
                this.currentPhotoBase64 = animal.photo_url;
                if (placeholder) placeholder.style.display = 'none';
            } else {
                if (preview) preview.style.display = 'none';
                if (placeholder) placeholder.style.display = 'flex';
            }
        } catch (error) {
            console.error('Erro ao carregar dados do animal:', error);
        }
    }

    handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            let result = e.target.result;

            // Salvar em arquivo se possível
            if (window.storageService) {
                try {
                    result = await window.storageService.saveImage(result);
                    console.log('Imagem de upload salva em:', result);
                } catch (err) {
                    console.error('Erro ao salvar imagem de upload:', err);
                }
            }

            this.currentPhotoBase64 = result;
            const preview = document.getElementById('photo-preview');
            const placeholder = document.getElementById('photo-placeholder');
            if (preview) {
                preview.src = this.currentPhotoBase64;
                preview.style.display = 'block';
            }
            if (placeholder) {
                placeholder.style.display = 'none';
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
