class AnimalsManager {
    constructor() {
        this.currentAnimalId = null;
        this.currentPhotoBase64 = null;
    }

    init() {
        this.bindEvents();
        console.log('Animals Manager: Iniciado');
    }

    bindEvents() {
        // Máscara de Telefone Automática
        const phoneInput = document.getElementById('tutor-phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
                e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
            });
        }

        const addBtn = document.getElementById('add-animal-btn');
        if (addBtn) addBtn.onclick = () => this.openAnimalModal();

        const form = document.getElementById('animal-form');
        if (form) {
            form.onsubmit = null;
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveAnimal();
            });
        }

        document.getElementById('animal-photo')?.addEventListener('change', e => this.handlePhotoUpload(e));
        document.getElementById('animal-search')?.addEventListener('input', () => this.applyFilters());
    }

    async loadAnimals() {
        if (!window.db || !window.db.isInitialized) return;
        try {
            const animals = await db.getAnimals();
            this.renderAnimalsTable(animals);
        } catch (e) { console.error(e); }
    }

    renderAnimalsTable(animals) {
        const container = document.querySelector('#animals .table-container');
        if (!container) return;

        if (!animals || animals.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding:2rem; color:#64748b;">Nenhum pet cadastrado.</p>';
            return;
        }

        let html = '<div class="animals-grid-modern">';
        animals.forEach(a => {
            const cleanPhone = a.tutor_phone ? a.tutor_phone.replace(/\D/g, '') : '';
            const waUrl = cleanPhone ? `https://wa.me/55${cleanPhone}` : '#';
            const speciesIcon = a.species === 'GATO' ? 'fa-cat' : 'fa-dog';
            const speciesClass = a.species === 'GATO' ? 'species-cat' : 'species-dog';
            const sexIcon = a.sex === 'F' ? '<i class="fas fa-venus" style="color:#e91e63; margin-left:5px;" title="Fêmea"></i>' : '<i class="fas fa-mars" style="color:#2196f3; margin-left:5px;" title="Macho"></i>';

            html += `
            <div class="pet-card-modern" onclick="window.animalsManager.viewProfile(${a.id})">
                <div class="pet-card-content">
                    <div class="list-pet-photo">
                         <img src="${a.photo_url || 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 512 512\'><path fill=\'%23cbd5e0\' d=\'M256 160c12.9 0 24.7 3.9 34.2 10.5l5.8-14.8C311 118.6 285.2 96 256 96s-55 22.6-40 59.7l5.8 14.8c9.5-6.6 21.3-10.5 34.2-10.5zm-112 80c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zm224 0c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zM256 320c-44.2 0-80 35.8-80 80s35.8 80 80 80 80-35.8 80-80-35.8-80-80-80z\'/></svg>'}" onerror="this.style.display='none'">
                    </div>
                    <div class="pet-info-modern">
                        <div class="pet-header-modern">
                            <h3 class="pet-name">${a.name} ${sexIcon}</h3>
                            <span class="pet-species-badge ${speciesClass}"><i class="fas ${speciesIcon}"></i> ${a.species}</span>
                        </div>
                        <div class="pet-tutor-info">
                            <p><i class="fas fa-user-circle"></i> ${a.tutor_name}</p>
                            <p class="phone-row">
                                <i class="fas fa-phone-alt"></i> ${a.tutor_phone || '-'}
                                ${cleanPhone ? `<a href="${waUrl}" target="_blank" class="wa-link-modern" onclick="event.stopPropagation();"><i class="fab fa-whatsapp"></i></a>` : ''}
                            </p>
                        </div>
                    </div>
                </div>
                <div class="pet-card-actions">
                    <button class="btn-icon-modern edit" onclick="event.stopPropagation(); window.animalsManager.editAnimal(${a.id})" title="Editar"><i class="fas fa-pen"></i></button>
                    <button class="btn-icon-modern delete" onclick="event.stopPropagation(); window.animalsManager.deleteAnimal(${a.id})" title="Excluir"><i class="fas fa-trash-alt"></i></button>
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
            const sex = document.getElementById('animal-sex').value;
            const tutor = document.getElementById('tutor-name').value;
            const phone = document.getElementById('tutor-phone').value;

            // Novos campos de saúde
            const weight = document.getElementById('animal-weight')?.value || '';
            const allergies = document.getElementById('animal-allergies')?.value || '';
            const medication = document.getElementById('animal-medication')?.value || '';
            const vetNotes = document.getElementById('animal-vet-notes')?.value || '';

            if (!name || !tutor) {
                window.hotelPetApp?.showNotification('Nome e Tutor são obrigatórios!', 'warning');
                return;
            }

            window.hotelPetApp?.showLoading();
            let finalPhotoUrl = this.currentPhotoBase64;
            if (this.currentPhotoBase64?.startsWith('data:image') && window.storageService) {
                finalPhotoUrl = await window.storageService.saveImage(this.currentPhotoBase64);
            }

            const data = {
                name: name.toUpperCase().trim(),
                species: species,
                sex: sex,
                tutor_name: tutor.toUpperCase().trim(),
                tutor_phone: phone.trim(),
                photo_url: finalPhotoUrl,
                weight: weight,
                vaccination_status: '', // Mantido vazio pois é calculado ou gerido via histórico
                allergies: allergies,
                medication: medication,
                vet_notes: vetNotes
            };

            if (this.currentAnimalId) {
                const existing = await db.getAnimalById(this.currentAnimalId);
                const updatedData = { ...existing, ...data };
                await db.updateAnimal(this.currentAnimalId, updatedData);
                window.hotelPetApp?.showNotification('Animal atualizado!', 'success');
            } else {
                await db.addAnimal(data);
                window.hotelPetApp?.showNotification('Novo animal cadastrado!', 'success');
            }

            window.hotelPetApp?.closeAllModals();
            await this.loadAnimals();
        } catch (e) {
            window.hotelPetApp?.showNotification('Erro: ' + e.message, 'error');
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
            if (preview) { preview.src = this.currentPhotoBase64; preview.style.display = 'block'; }
            document.getElementById('photo-placeholder').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    async takePhoto() {
        try {
            // Se estiver em plataforma nativa (Android/iOS), usa o plugin do Capacitor
            if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                // Safely access Camera plugin
                const Camera = window.Capacitor.Plugins.Camera || window.Capacitor.Plugins.camera;

                // Define Enums manually since they aren't available on the plugin object
                const CameraResultType = {
                    Uri: 'uri',
                    Base64: 'base64',
                    DataUrl: 'dataUrl'
                };

                const CameraSource = {
                    Prompt: 'PROMPT',
                    Camera: 'CAMERA',
                    Photos: 'PHOTOS'
                };

                if (!Camera) {
                    throw new Error('Plugin Camera não encontrado');
                }

                // Verificar permissões primeiro
                try {
                    const permissions = await Camera.checkPermissions();
                    if (permissions.camera !== 'granted') {
                        const request = await Camera.requestPermissions();
                        if (request.camera !== 'granted') {
                            window.hotelPetApp?.showNotification('Permissão de câmera negada. Ative nas configurações do celular.', 'warning');
                            return;
                        }
                    }
                } catch (permError) {
                    console.warn('Erro ao verificar permissões (pode ser ignorado em algumas versões):', permError);
                }

                const image = await Camera.getPhoto({
                    quality: 70, // Reduzido um pouco para evitar problemas de memória
                    allowEditing: true,
                    resultType: CameraResultType.DataUrl,
                    source: CameraSource.Prompt,
                    promptLabelHeader: 'Foto do Perfil',
                    promptLabelPhoto: 'Escolher da Galeria',
                    promptLabelPicture: 'Tirar Foto Agora',
                    saveToGallery: false
                });

                if (image && image.dataUrl) {
                    this.currentPhotoBase64 = image.dataUrl;
                    const preview = document.getElementById('photo-preview');
                    if (preview) {
                        preview.src = this.currentPhotoBase64;
                        preview.style.display = 'block';
                    }
                    document.getElementById('photo-placeholder').style.display = 'none';
                }
            } else {
                // Fallback para navegador (Simular clique no input file oculto)
                document.getElementById('animal-photo')?.click();
            }
        } catch (error) {
            console.error('Erro na câmera:', error);
            // Silenciar se o usuário apenas cancelou a ação
            if (error && error.message && !error.message.includes('cancelled')) {
                window.hotelPetApp?.showNotification('Erro ao acessar a câmera.', 'error');
            }
        }
    }


    openAnimalModal(id = null) {
        this.currentAnimalId = id;
        this.currentPhotoBase64 = null;
        const modal = document.getElementById('animal-modal');
        document.getElementById('animal-form')?.reset();

        if (id) {
            document.getElementById('animal-modal-title').textContent = 'Editar Animal';
            db.getAnimalById(id).then(a => {
                if (!a) return;
                document.getElementById('animal-name').value = a.name;
                document.getElementById('animal-species').value = a.species;
                document.getElementById('animal-sex').value = a.sex || 'M';
                document.getElementById('tutor-name').value = a.tutor_name;
                document.getElementById('tutor-phone').value = a.tutor_phone;

                // Preencher campos de saúde
                if (document.getElementById('animal-weight')) document.getElementById('animal-weight').value = a.weight || '';
                if (document.getElementById('animal-allergies')) document.getElementById('animal-allergies').value = a.allergies || '';
                if (document.getElementById('animal-medication')) document.getElementById('animal-medication').value = a.medication || '';
                if (document.getElementById('animal-vet-notes')) document.getElementById('animal-vet-notes').value = a.vet_notes || '';

                if (a.photo_url) {
                    const preview = document.getElementById('photo-preview');
                    if (preview) { preview.src = a.photo_url; preview.style.display = 'block'; }
                    document.getElementById('photo-placeholder').style.display = 'none';
                    this.currentPhotoBase64 = a.photo_url;
                }
            });
        } else {
            document.getElementById('animal-modal-title').textContent = 'Novo Animal';
            document.getElementById('photo-preview').style.display = 'none';
            document.getElementById('photo-placeholder').style.display = 'flex';
        }
        modal?.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    async deleteAnimal(id) {
        if (confirm('Deseja realmente excluir este animal? Isso removerá todo o histórico associado.')) {
            await db.deleteAnimal(id);
            await this.loadAnimals();
            window.hotelPetApp?.showNotification('Animal e histórico excluídos.', 'success');
        }
    }

    editAnimal(id) { this.openAnimalModal(id); }

    viewProfile(id) {
        if (window.hotelPetApp && window.animalProfileManager) {
            window.hotelPetApp.navigateToSection('animal-profile');
            window.animalProfileManager.loadProfile(id);
        }
    }

    applyFilters() {
        const s = document.getElementById('animal-search')?.value || '';
        db.getAnimals(s).then(res => this.renderAnimalsTable(res));
    }
}
window.AnimalsManager = AnimalsManager;