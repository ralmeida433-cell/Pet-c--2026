class ReservationsManager {
    constructor() {
        this.currentReservationId = null;
        this.reservations = [];
        this.filteredReservations = [];
        this.animals = [];
        this.isInitialized = false;
        // Lista de acomodações agora é dinâmica, mas mantemos a estrutura para mapeamento de espécies
        this.accommodationTypes = {
            'INTERNO': { species: 'CÃO' },
            'EXTERNO': { species: 'CÃO' },
            'GATIL': { species: 'GATO' }
        };
        this.allKennels = []; // Lista completa de canis do DB
        this.init();
    }

    init() {
        this.bindEvents();
        this.createDetailModal(); // Cria o modal de detalhes/ações
        console.log('Reservations Manager: Iniciado');
    }

    bindEvents() {
        const addBtn = document.getElementById('add-reservation-btn');
        if (addBtn) addBtn.onclick = () => this.openReservationModal();

        const form = document.getElementById('reservation-form');
        if (form) form.onsubmit = (e) => { e.preventDefault(); this.saveReservation(); };

        // Listeners para atualização de canis
        document.getElementById('reservation-accommodation-type')?.addEventListener('change', (e) => {
            this.populateKennelNumbers(e.target.value);
        });

        document.getElementById('checkin-date')?.addEventListener('change', () => this.updateAvailability());
        document.getElementById('checkout-date')?.addEventListener('change', () => this.updateAvailability());
        
        // Cálculos
        document.getElementById('daily-rate')?.addEventListener('input', () => this.calculateTotalValue());
        
        // Lógica de Serviços Adicionais (Correção do Bug)
        const transportService = document.getElementById('transport-service');
        const transportValue = document.getElementById('transport-value');
        const bathService = document.getElementById('bath-service');
        const bathValue = document.getElementById('bath-value');

        if (transportService && transportValue) {
            transportService.addEventListener('change', () => {
                transportValue.disabled = !transportService.checked;
                if (!transportService.checked) transportValue.value = '';
                this.calculateTotalValue();
            });
            transportValue.addEventListener('input', () => this.calculateTotalValue());
        }

        if (bathService && bathValue) {
            bathService.addEventListener('change', () => {
                bathValue.disabled = !bathService.checked;
                if (!bathService.checked) bathValue.value = '';
                this.calculateTotalValue();
            });
            bathValue.addEventListener('input', () => this.calculateTotalValue());
        }

        // Busca e filtros
        document.getElementById('reservation-search')?.addEventListener('input', () => this.applyFilters());
        document.getElementById('status-filter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('month-filter')?.addEventListener('change', () => this.applyFilters());
        
        // Quick Filters
        document.querySelectorAll('.quick-filters .filter-pill').forEach(pill => {
            pill.addEventListener('click', (e) => {
                document.querySelectorAll('.quick-filters .filter-pill').forEach(p => p.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById('status-filter').value = e.target.dataset.status;
                this.applyFilters();
            });
        });
    }

    updateAvailability() {
        const type = document.getElementById('reservation-accommodation-type').value;
        if (type) this.populateKennelNumbers(type);
        this.calculateTotalDays();
    }

    async loadReservations() {
        if (!window.db || !window.db.isInitialized) return;
        this.reservations = await db.getReservations();
        this.applyFilters();
    }
    
    async updateAccommodationList() {
        if (!window.db || !window.db.isInitialized) return;
        this.allKennels = await window.db.getAllKennels();
    }

    async loadAnimalsDropdown() {
        await this.updateAccommodationList(); // Garante que a lista de canis esteja atualizada
        
        const animals = await db.getAnimals();
        const select = document.getElementById('reservation-animal');
        if (!select) return;
        select.innerHTML = '<option value="">Selecione o animal</option>' + 
            animals.map(a => `<option value="${a.id}" data-species="${a.species}">${a.name} (${a.tutor_name})</option>`).join('');
        
        select.onchange = (e) => {
            const species = e.target.options[e.target.selectedIndex].dataset.species;
            this.filterAccommodationBySpecies(species);
        };
    }

    filterAccommodationBySpecies(species) {
        const select = document.getElementById('reservation-accommodation-type');
        if (!select) return;
        
        // Determina os tipos de acomodação compatíveis com a espécie
        const compatibleTypes = Object.entries(this.accommodationTypes)
            .filter(([type, info]) => info.species === species)
            .map(([type]) => type);

        select.innerHTML = '<option value="">Selecione</option>';
        
        compatibleTypes.forEach(type => {
            select.innerHTML += `<option value="${type}">${type === 'GATIL' ? 'Gatil' : 'Canil ' + type.toLowerCase()}</option>`;
        });
        
        // Limpa o número do canil
        document.getElementById('reservation-kennel-number').innerHTML = '<option value="">Escolha o número</option>';
        document.getElementById('reservation-kennel-number').disabled = true;
    }

    async populateKennelNumbers(accommodationType, currentKennel = null) {
        const kennelSelect = document.getElementById('reservation-kennel-number');
        const checkin = document.getElementById('checkin-date').value;
        const checkout = document.getElementById('checkout-date').value;

        if (!accommodationType || !checkin || !checkout) {
            kennelSelect.innerHTML = '<option value="">Defina datas e tipo primeiro</option>';
            kennelSelect.disabled = true;
            return;
        }

        kennelSelect.innerHTML = '<option value="">Carregando...</option>';
        kennelSelect.disabled = true;

        try {
            const occupied = await db.getOccupiedKennels(checkin, checkout);
            const occupiedNumbers = occupied
                .filter(o => o.accommodation_type === accommodationType)
                .map(o => o.kennel_number);

            // Filtra os canis disponíveis do tipo selecionado
            const availableKennels = this.allKennels.filter(k => k.type === accommodationType);
            
            let options = '<option value="">Escolha o número</option>';
            
            availableKennels.forEach(kennel => {
                const isOccupied = occupiedNumbers.includes(kennel.number);
                const isCurrent = currentKennel && kennel.number === currentKennel && kennel.type === accommodationType;
                
                options += `<option value="${kennel.number}" ${isOccupied && !isCurrent ? 'disabled' : ''} ${isCurrent ? 'selected' : ''}>
                    ${accommodationType} ${kennel.number} ${isOccupied && !isCurrent ? '(Ocupado)' : '(Livre)'}
                </option>`;
            });

            kennelSelect.innerHTML = options;
            kennelSelect.disabled = false;
        } catch (e) {
            console.error(e);
            kennelSelect.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    }

    calculateTotalDays() {
        const d1 = new Date(document.getElementById('checkin-date').value);
        const d2 = new Date(document.getElementById('checkout-date').value);
        if (d1 && d2 && d2 > d1) {
            const diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
            this.calculateTotalValue();
        }
    }

    calculateTotalValue() {
        const d1 = new Date(document.getElementById('checkin-date').value);
        const d2 = new Date(document.getElementById('checkout-date').value);
        const daily = parseFloat(document.getElementById('daily-rate')?.value) || 0;
        
        if (d1 && d2 && d2 > d1) {
            const days = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
            let total = days * daily;
            
            const transportService = document.getElementById('transport-service');
            const transportValue = parseFloat(document.getElementById('transport-value')?.value) || 0;
            
            const bathService = document.getElementById('bath-service');
            const bathValue = parseFloat(document.getElementById('bath-value')?.value) || 0;

            if (transportService?.checked) {
                total += transportValue;
            }
            if (bathService?.checked) {
                total += bathValue;
            }

            document.getElementById('total-value').value = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total);
        } else {
            document.getElementById('total-value').value = this.formatCurrency(0);
        }
    }
    
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    }
    
    formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr + 'T00:00:00'); // Adiciona T00:00:00 para evitar problemas de fuso horário
            return date.toLocaleDateString('pt-BR');
        } catch (error) {
            return dateStr;
        }
    }

    openReservationModal(data = null) {
        const modal = document.getElementById('reservation-modal');
        const form = document.getElementById('reservation-form');
        if (!modal || !form) return;

        form.reset();
        this.currentReservationId = null;
        this.loadAnimalsDropdown();

        // Resetar campos de serviço
        document.getElementById('transport-value').disabled = true;
        document.getElementById('bath-value').disabled = true;
        document.getElementById('total-value').value = this.formatCurrency(0);
        document.getElementById('reservation-modal-title').textContent = 'Nova Reserva';


        // Datas Padrão (Hoje e Amanhã) para facilitar a busca automática de canis
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        document.getElementById('checkin-date').valueAsDate = today;
        document.getElementById('checkout-date').valueAsDate = tomorrow;
        
        // Forçar cálculo inicial para preencher o total
        this.calculateTotalValue();


        if (data && data.tipo) {
            setTimeout(() => {
                const species = data.tipo === 'GATIL' ? 'GATO' : 'CÃO';
                this.filterAccommodationBySpecies(species);
                document.getElementById('reservation-accommodation-type').value = data.tipo;
                this.populateKennelNumbers(data.tipo);
                
                // Pré-selecionar o número se for passado
                if (data.numero) {
                    setTimeout(() => {
                        const kennelOption = document.querySelector(`#reservation-kennel-number option[value="${data.numero}"]`);
                        if (kennelOption && !kennelOption.disabled) {
                            document.getElementById('reservation-kennel-number').value = data.numero;
                        }
                    }, 100);
                }
            }, 300);
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    async editReservation(id) {
        const res = await db.getReservationById(id);
        if (!res) return;

        this.currentReservationId = id;
        const modal = document.getElementById('reservation-modal');
        const form = document.getElementById('reservation-form');
        if (!modal || !form) return;

        document.getElementById('reservation-modal-title').textContent = 'Editar Reserva';
        
        // 1. Carregar animais e filtrar acomodação
        await this.loadAnimalsDropdown();
        const animalSelect = document.getElementById('reservation-animal');
        animalSelect.value = res.animal_id;
        
        const selectedOption = animalSelect.options[animalSelect.selectedIndex];
        const species = selectedOption.dataset.species;
        this.filterAccommodationBySpecies(species);
        
        // 2. Preencher campos básicos
        document.getElementById('reservation-accommodation-type').value = res.accommodation_type;
        document.getElementById('daily-rate').value = res.daily_rate;
        document.getElementById('checkin-date').value = res.checkin_date;
        document.getElementById('checkout-date').value = res.checkout_date;
        document.getElementById('payment-method').value = res.payment_method;

        // 3. Preencher serviços
        document.getElementById('transport-service').checked = res.transport_service;
        document.getElementById('transport-value').value = res.transport_value || '';
        document.getElementById('transport-value').disabled = !res.transport_service;
        
        document.getElementById('bath-service').checked = res.bath_service;
        document.getElementById('bath-value').value = res.bath_value || '';
        document.getElementById('bath-value').disabled = !res.bath_service;

        // 4. Popular canis (incluindo o canil atual mesmo se estiver ocupado)
        await this.populateKennelNumbers(res.accommodation_type, res.kennel_number);
        document.getElementById('reservation-kennel-number').value = res.kennel_number;
        
        // 5. Calcular total
        this.calculateTotalValue();

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        this.closeDetailModal();
    }

    async saveReservation() {
        window.hotelPetApp.showLoading();
        
        const animalId = document.getElementById('reservation-animal').value;
        const accommodationType = document.getElementById('reservation-accommodation-type').value;
        const kennelNumber = document.getElementById('reservation-kennel-number').value;
        const dailyRate = parseFloat(document.getElementById('daily-rate').value);
        const checkinDate = document.getElementById('checkin-date').value;
        const checkoutDate = document.getElementById('checkout-date').value;
        const paymentMethod = document.getElementById('payment-method').value;

        // Validação básica
        if (!animalId || !accommodationType || !kennelNumber || isNaN(dailyRate) || !checkinDate || !checkoutDate || !paymentMethod) {
            window.hotelPetApp.showNotification('Preencha todos os campos obrigatórios.', 'error');
            window.hotelPetApp.hideLoading();
            return;
        }

        const d1 = new Date(checkinDate);
        const d2 = new Date(checkoutDate);
        const days = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
        
        if (days <= 0) {
            window.hotelPetApp.showNotification('A data de saída deve ser posterior à data de entrada.', 'error');
            window.hotelPetApp.hideLoading();
            return;
        }

        // Recalcular total para garantir precisão
        let totalValue = days * dailyRate;
        const transportService = document.getElementById('transport-service').checked;
        const transportValue = parseFloat(document.getElementById('transport-value').value) || 0;
        const bathService = document.getElementById('bath-service').checked;
        const bathValue = parseFloat(document.getElementById('bath-value').value) || 0;

        if (transportService) totalValue += transportValue;
        if (bathService) totalValue += bathValue;

        const data = {
            animal_id: animalId,
            accommodation_type: accommodationType,
            kennel_number: kennelNumber,
            daily_rate: dailyRate,
            checkin_date: checkinDate,
            checkout_date: checkoutDate,
            total_days: days,
            transport_service: transportService,
            transport_value: transportValue,
            bath_service: bathService,
            bath_value: bathValue,
            payment_method: paymentMethod,
            total_value: totalValue,
            status: 'ATIVA' // Sempre ativa ao salvar/editar
        };

        try {
            if (this.currentReservationId) {
                await db.updateReservation(this.currentReservationId, data);
                window.hotelPetApp.showNotification('Reserva atualizada com sucesso!', 'success');
            } else {
                await db.addReservation(data);
                window.hotelPetApp.showNotification('Reserva salva com sucesso!', 'success');
            }
            
            window.hotelPetApp.closeAllModals();
            this.loadReservations();
            if (window.dashboardManager) window.dashboardManager.loadDashboard();
            if (window.kennelVisualization) window.kennelVisualization.refresh();
        } catch (e) {
            window.hotelPetApp.showNotification('Erro ao salvar reserva: ' + e.message, 'error');
            console.error(e);
        } finally {
            window.hotelPetApp.hideLoading();
        }
    }

    applyFilters() {
        const s = document.getElementById('reservation-search').value.toLowerCase();
        const status = document.getElementById('status-filter').value;
        
        const filtered = this.reservations.filter(r => {
            const matchesSearch = r.animal_name?.toLowerCase().includes(s) || r.tutor_name?.toLowerCase().includes(s);
            const matchesStatus = !status || r.status === status;
            return matchesSearch && matchesStatus;
        });

        this.renderReservationsList(filtered);
    }

    // NOVO: Renderiza a lista de cards otimizada para mobile
    renderReservationsList(data) {
        const container = document.querySelector('#reservations .table-container');
        if (!container) return;
        
        // Esconde a tabela tradicional e mostra a lista de cards
        container.innerHTML = `<div id="reservations-list-cards" class="reservations-list-cards"></div>`;
        const listContainer = document.getElementById('reservations-list-cards');

        if (data.length === 0) {
            listContainer.innerHTML = '<p style="text-align:center; padding:2rem; color:#64748b;">Nenhuma reserva encontrada.</p>';
            return;
        }

        listContainer.innerHTML = data.map(r => {
            const cleanPhone = r.tutor_phone ? r.tutor_phone.replace(/\D/g, '') : '';
            const waUrl = cleanPhone ? `https://wa.me/55${cleanPhone}` : '#';
            const statusClass = r.status.toLowerCase();
            const kennelClass = r.accommodation_type.toLowerCase();

            return `
                <div class="reservation-card" onclick="window.reservationsManager.openDetailModal(${r.id})">
                    <div class="card-header">
                        <div class="animal-info-summary">
                            <div class="animal-thumb">
                                <img src="${r.photo_url || 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 512 512\'><path fill=\'%23cbd5e0\' d=\'M256 160c12.9 0 24.7 3.9 34.2 10.5l5.8-14.8C311 118.6 285.2 96 256 96s-55 22.6-40 59.7l5.8 14.8c9.5-6.6 21.3-10.5 34.2-10.5zm-112 80c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zm224 0c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zM256 320c-44.2 0-80 35.8-80 80s35.8 80 80 80 80-35.8 80-80-35.8-80-80-80z\'/></svg>'}" onerror="this.style.display='none'">
                            </div>
                            <div class="text-info">
                                <strong class="animal-name">${r.animal_name}</strong>
                                <span class="tutor-name">Tutor: ${r.tutor_name}</span>
                            </div>
                        </div>
                        <div class="status-and-actions">
                            <span class="status-badge ${statusClass}">${r.status}</span>
                            <a href="${waUrl}" target="_blank" class="action-btn wa-btn" onclick="event.stopPropagation();" title="WhatsApp Tutor">
                                <i class="fab fa-whatsapp"></i>
                            </a>
                        </div>
                    </div>
                    <div class="card-details">
                        <div class="detail-item">
                            <i class="fas fa-home"></i>
                            <span class="kennel-badge ${kennelClass}">${r.accommodation_type} ${r.kennel_number}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>${this.formatDate(r.checkin_date)} - ${this.formatDate(r.checkout_date)}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-dollar-sign"></i>
                            <strong class="total-value">${this.formatCurrency(r.total_value)}</strong>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // NOVO: Modal de Detalhes da Reserva
    createDetailModal() {
        if (document.getElementById('reservation-detail-modal')) return;

        const modalHTML = `
            <div id="reservation-detail-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="detail-modal-title">Detalhes da Reserva</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div id="detail-content" class="detail-content">
                        <!-- Conteúdo injetado aqui -->
                    </div>
                    <div class="detail-actions">
                        <button class="btn btn-secondary" id="detail-edit-btn"><i class="fas fa-edit"></i> Editar</button>
                        <button class="btn btn-success" id="detail-whatsapp-btn"><i class="fab fa-whatsapp"></i> Compartilhar Recibo</button>
                        <button class="btn btn-info" id="detail-print-btn"><i class="fas fa-print"></i> Gerar Recibo</button>
                        <button class="btn btn-danger" id="detail-finalize-btn"><i class="fas fa-check-circle"></i> Finalizar Reserva</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Bind dos botões de ação do modal de detalhes
        document.getElementById('detail-edit-btn')?.addEventListener('click', () => this.handleDetailAction('edit'));
        document.getElementById('detail-whatsapp-btn')?.addEventListener('click', () => this.handleDetailAction('whatsapp'));
        document.getElementById('detail-print-btn')?.addEventListener('click', () => this.handleDetailAction('print'));
        document.getElementById('detail-finalize-btn')?.addEventListener('click', () => this.handleDetailAction('finalize'));
    }

    async openDetailModal(id) {
        const res = await db.getReservationById(id);
        if (!res) return;

        this.currentReservationId = id;
        const modal = document.getElementById('reservation-detail-modal');
        const content = document.getElementById('detail-content');
        const finalizeBtn = document.getElementById('detail-finalize-btn');
        
        const cleanPhone = res.tutor_phone ? res.tutor_phone.replace(/\D/g, '') : '';
        const waUrl = cleanPhone ? `https://wa.me/55${cleanPhone}?text=Ol%C3%A1%20${res.tutor_name},%20segue%20o%20recibo%20da%20reserva%20do%20${res.animal_name}.` : '#';

        // Atualiza o botão de WhatsApp
        document.getElementById('detail-whatsapp-btn').setAttribute('data-whatsapp-url', waUrl);

        // Renderiza o conteúdo
        content.innerHTML = `
            <div class="detail-profile-summary">
                <div class="detail-photo-area">
                    <img src="${res.photo_url || 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 512 512\'><path fill=\'%23cbd5e0\' d=\'M256 160c12.9 0 24.7 3.9 34.2 10.5l5.8-14.8C311 118.6 285.2 96 256 96s-55 22.6-40 59.7l5.8 14.8c9.5-6.6 21.3-10.5 34.2-10.5zm-112 80c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zm224 0c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zM256 320c-44.2 0-80 35.8-80 80s35.8 80 80 80 80-35.8 80-80-35.8-80-80-80z\'/></svg>'}" 
                         alt="${res.animal_name}" class="detail-photo" onerror="this.style.display='none'">
                </div>
                <div class="detail-info-main">
                    <h3>${res.animal_name}</h3>
                    <p>Tutor: <strong>${res.tutor_name}</strong></p>
                    <p>Telefone: ${res.tutor_phone || 'N/A'}</p>
                    <span class="status-badge ${res.status.toLowerCase()}">${res.status}</span>
                </div>
            </div>
            
            <div class="detail-grid">
                <div class="detail-item"><span class="label">Alojamento:</span><span class="value">${res.accommodation_type} ${res.kennel_number}</span></div>
                <div class="detail-item"><span class="label">Diárias:</span><span class="value">${res.total_days}</span></div>
                <div class="detail-item"><span class="label">Check-in:</span><span class="value">${this.formatDate(res.checkin_date)}</span></div>
                <div class="detail-item"><span class="label">Check-out:</span><span class="value">${this.formatDate(res.checkout_date)}</span></div>
                <div class="detail-item"><span class="label">Diária (R$):</span><span class="value">${res.daily_rate.toFixed(2)}</span></div>
                <div class="detail-item"><span class="label">Pagamento:</span><span class="value">${res.payment_method}</span></div>
            </div>
            
            <div class="detail-services">
                <h4>Serviços Adicionais</h4>
                <p>${res.transport_service ? `Transporte: ${this.formatCurrency(res.transport_value)}` : 'Sem Transporte'}</p>
                <p>${res.bath_service ? `Banho: ${this.formatCurrency(res.bath_value)}` : 'Sem Banho'}</p>
            </div>

            <div class="detail-total">
                <span class="label">VALOR TOTAL:</span>
                <span class="value">${this.formatCurrency(res.total_value)}</span>
            </div>
        `;

        // Habilita/Desabilita botão de finalizar
        if (res.status === 'ATIVA') {
            finalizeBtn.style.display = 'inline-flex';
        } else {
            finalizeBtn.style.display = 'none';
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeDetailModal() {
        document.getElementById('reservation-detail-modal')?.classList.remove('active');
        document.body.style.overflow = '';
        this.currentReservationId = null;
    }

    handleDetailAction(action) {
        const id = this.currentReservationId;
        if (!id) return;

        switch (action) {
            case 'edit':
                this.editReservation(id);
                break;
            case 'finalize':
                this.finalizeReservation(id);
                break;
            case 'print':
                this.generateReceipt(id);
                break;
            case 'whatsapp':
                this.shareReceipt(id);
                break;
        }
    }

    async finalizeReservation(id) {
        if (confirm('Deseja realmente FINALIZAR esta reserva?')) {
            window.hotelPetApp.showLoading();
            try {
                const res = await db.getReservationById(id);
                if (!res) throw new Error('Reserva não encontrada');

                // Atualiza status para FINALIZADA
                res.status = 'FINALIZADA';
                await db.updateReservation(id, res);
                
                // Adiciona registro ao histórico do animal
                await db.addAnimalHistory({
                    animal_id: res.animal_id,
                    type: 'HOSPEDAGEM',
                    date: new Date().toISOString().split('T')[0],
                    description: `Reserva finalizada. Período: ${this.formatDate(res.checkin_date)} a ${this.formatDate(res.checkout_date)}. Total: ${this.formatCurrency(res.total_value)}.`
                });

                window.hotelPetApp.showNotification('Reserva finalizada com sucesso!', 'success');
                this.closeDetailModal();
                this.loadReservations();
                if (window.dashboardManager) window.dashboardManager.loadDashboard();
                if (window.kennelVisualization) window.kennelVisualization.refresh();
            } catch (e) {
                window.hotelPetApp.showNotification('Erro ao finalizar reserva: ' + e.message, 'error');
                console.error(e);
            } finally {
                window.hotelPetApp.hideLoading();
            }
        }
    }

    generateReceipt(id) {
        if (window.printReceipt) {
            window.printReceipt(id);
        } else {
            window.hotelPetApp.showNotification('Funcionalidade de impressão não disponível.', 'warning');
        }
    }

    async shareReceipt(id) {
        const res = await db.getReservationById(id);
        if (!res) return;

        const cleanPhone = res.tutor_phone ? res.tutor_phone.replace(/\D/g, '') : '';
        if (!cleanPhone) {
            window.hotelPetApp.showNotification('Telefone do tutor não encontrado.', 'error');
            return;
        }

        const message = encodeURIComponent(
            `Olá ${res.tutor_name}, aqui é do Hotel Pet CÁ. Aqui seu pet é bem cuidado.

Segue o resumo da reserva do(a) *${res.animal_name}*:
🐾 Alojamento: ${res.accommodation_type} ${res.kennel_number}
📅 Período: ${this.formatDate(res.checkin_date)} a ${this.formatDate(res.checkout_date)} (${res.total_days} diárias)
💰 Valor Total: ${this.formatCurrency(res.total_value)}
💳 Pagamento: ${res.payment_method}

Obrigado pela preferência!`
        );

        const waLink = `https://wa.me/55${cleanPhone}?text=${message}`;
        window.open(waLink, '_blank');
    }

    async deleteReservation(id) {
        if (confirm('Excluir reserva?')) {
            await db.deleteReservation(id);
            this.loadReservations();
            if (window.kennelVisualization) window.kennelVisualization.refresh();
        }
    }
}
window.ReservationsManager = ReservationsManager;