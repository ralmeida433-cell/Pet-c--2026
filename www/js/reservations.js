class ReservationsManager {
    constructor() {
        this.currentReservationId = null;
        this.reservations = [];
        this.filteredReservations = [];
        this.animals = [];
        this.isInitialized = false;
        this.accommodations = {
            'INTERNO': { count: 5, species: 'CÃO' },
            'EXTERNO': { count: 6, species: 'CÃO' },
            'GATIL': { count: 4, species: 'GATO' }
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupFormValidation();
        this.setupCalculations();

        // Registrar função global para WhatsApp
        window.sendWhatsAppReceipt = (id) => this.sendWhatsAppReceipt(id);

        console.log('Reservations Manager initialized');
    }

    bindEvents() {
        // Botão adicionar reserva
        const addBtn = document.getElementById('add-reservation-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openReservationModal());
        }

        // Fechar modal
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (e.target.closest('#reservation-modal')) {
                    this.closeReservationModal();
                }
            });
        });

        // Cancelar reserva
        const cancelBtn = document.getElementById('cancel-reservation');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeReservationModal());
        }

        // Formulário de reserva
        const form = document.getElementById('reservation-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveReservation();
            });
        }

        // Filtros e busca
        const searchInput = document.getElementById('reservation-search');
        const statusFilter = document.getElementById('status-filter');
        const monthFilter = document.getElementById('month-filter');

        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.applyFilters();
            }, 300));
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }

        if (monthFilter) {
            monthFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }

        // Pílulas de filtro rápido
        const filterPills = document.querySelectorAll('.quick-filters .filter-pill');
        filterPills.forEach(pill => {
            pill.addEventListener('click', () => {
                filterPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');

                const status = pill.dataset.status;
                if (statusFilter) {
                    statusFilter.value = status;
                    this.applyFilters();
                }
            });
        });

        // Fechar modal ao clicar fora
        const modal = document.getElementById('reservation-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) {
                    this.closeReservationModal();
                }
            });
        }

        // Eventos específicos de reserva
        this.bindReservationEvents();
        this.bindCalculationEvents();
        this.bindServiceEvents();
    }

    bindReservationEvents() {
        // Mudança de animal - filtrar tipos de alojamento
        const animalSelect = document.getElementById('reservation-animal');
        if (animalSelect) {
            animalSelect.addEventListener('change', (e) => {
                this.onAnimalChange(e.target.value);
            });
        }

        // Mudança de tipo de alojamento - popular números
        const accommodationSelect = document.getElementById('reservation-accommodation-type');
        if (accommodationSelect) {
            accommodationSelect.addEventListener('change', (e) => {
                this.populateKennelNumbers(e.target.value);
            });
        }

        // Mudança nas datas - verificar disponibilidade
        ['checkin-date', 'checkout-date'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    const accommodationType = document.getElementById('reservation-accommodation-type')?.value;
                    if (accommodationType) {
                        this.populateKennelNumbers(accommodationType);
                    }
                    this.calculateTotalDays();
                    this.calculateTotalValue();
                });
            }
        });
    }

    bindCalculationEvents() {
        // Recalcular quando valor da diária mudar
        const dailyRateInput = document.getElementById('daily-rate');
        if (dailyRateInput) {
            dailyRateInput.addEventListener('input', () => {
                this.calculateTotalValue();
            });
        }

        // Recalcular quando valores de serviços mudarem
        ['transport-value', 'bath-value'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    this.calculateTotalValue();
                });
            }
        });
    }

    bindServiceEvents() {
        // Ativar/desativar campos de serviços
        const transportService = document.getElementById('transport-service');
        if (transportService) {
            transportService.addEventListener('change', (e) => {
                const valueInput = document.getElementById('transport-value');
                if (valueInput) {
                    valueInput.disabled = !e.target.checked;
                    if (!e.target.checked) {
                        valueInput.value = '';
                    } else {
                        valueInput.value = '28.00'; // Valor padrão
                    }
                    this.calculateTotalValue();
                }
            });
        }

        const bathService = document.getElementById('bath-service');
        if (bathService) {
            bathService.addEventListener('change', (e) => {
                const valueInput = document.getElementById('bath-value');
                if (valueInput) {
                    valueInput.disabled = !e.target.checked;
                    if (!e.target.checked) {
                        valueInput.value = '';
                    } else {
                        valueInput.value = '50.00'; // Valor padrão
                    }
                    this.calculateTotalValue();
                }
            });
        }
    }

    setupFormValidation() {
        const form = document.getElementById('reservation-form');
        if (!form) return;

        const inputs = form.querySelectorAll('input[required], select[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });

            input.addEventListener('input', () => {
                this.clearFieldError(input);
            });
        });
    }

    setupCalculations() {
        // Configurar valores padrão baseados na planilha
        this.defaultRates = {
            'INTERNO': 50,
            'EXTERNO': 50,
            'GATIL': 45
        };

        this.serviceRates = {
            transport: 28,
            bath: 50
        };
    }

    async loadReservations() {
        try {
            this.showLoading();

            const search = document.getElementById('reservation-search')?.value || '';
            const status = document.getElementById('status-filter')?.value || '';
            const month = document.getElementById('month-filter')?.value || '';

            const reservationsData = await db.getReservations(search, status, month);
            this.reservations = Array.isArray(reservationsData) ? reservationsData : [];
            this.filteredReservations = [...this.reservations];

            this.renderReservationsTable();
            this.updateReservationStats();
            this.hideLoading();
            this.isInitialized = true;
        } catch (error) {
            console.error('Erro ao carregar reservas:', error);
            this.reservations = [];
            this.filteredReservations = [];
            this.renderReservationsTable();
            this.hideLoading();
        }
    }

    async loadAnimalsDropdown() {
        try {
            const animalsData = await db.getAnimals();
            this.animals = Array.isArray(animalsData) ? animalsData : [];

            const select = document.getElementById('reservation-animal');
            if (!select) return;

            select.innerHTML = '<option value="">Selecione o animal</option>';

            this.animals.forEach(animal => {
                const option = document.createElement('option');
                option.value = animal.id;
                option.textContent = `${animal.name} - ${animal.tutor_name}`;
                option.dataset.species = animal.species || 'CÃO';
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar animais:', error);
            this.animals = [];
        }
    }

    onAnimalChange(animalId) {
        const select = document.getElementById('reservation-animal');
        const accommodationSelect = document.getElementById('reservation-accommodation-type');

        if (!animalId || !select || !accommodationSelect) return;

        const selectedOption = select.options[select.selectedIndex];
        const species = selectedOption.dataset.species || 'CÃO';

        accommodationSelect.innerHTML = '<option value="">Selecione</option>';

        // Filtrar tipos de alojamento baseado na espécie
        for (const [type, details] of Object.entries(this.accommodations)) {
            if (details.species === species) {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type === 'INTERNO' ? 'Canil Interno' :
                    type === 'EXTERNO' ? 'Canil Externo' : 'Gatil';
                accommodationSelect.appendChild(option);
            }
        }

        // Definir valor padrão da diária
        const dailyRateInput = document.getElementById('daily-rate');
        if (dailyRateInput) {
            if (species === 'CÃO') {
                dailyRateInput.value = '50.00';
            } else if (species === 'GATO') {
                dailyRateInput.value = '45.00';
            }
        }
    }

    async populateKennelNumbers(accommodationType) {
        const kennelNumberSelect = document.getElementById('reservation-kennel-number');

        if (!accommodationType || !kennelNumberSelect) {
            if (kennelNumberSelect) {
                kennelNumberSelect.innerHTML = '<option value="">Selecione o tipo primeiro</option>';
                kennelNumberSelect.disabled = true;
            }
            return;
        }

        kennelNumberSelect.innerHTML = '<option value="">Aguarde...</option>';
        kennelNumberSelect.disabled = true;

        const checkinDate = document.getElementById('checkin-date')?.value;
        const checkoutDate = document.getElementById('checkout-date')?.value;

        if (!checkinDate || !checkoutDate) {
            kennelNumberSelect.innerHTML = '<option value="">Selecione as datas primeiro</option>';
            return;
        }

        try {
            // Verificar disponibilidade
            const occupied = await db.getOccupiedKennels(checkinDate, checkoutDate);
            const occupiedNumbers = Array.isArray(occupied) ?
                occupied.filter(o => o.accommodation_type === accommodationType).map(o => o.kennel_number) : [];

            // Popular opções
            let options = '<option value="">Selecione</option>';
            const maxNumber = this.accommodations[accommodationType]?.count || 0;

            for (let i = 1; i <= maxNumber; i++) {
                const isOccupied = occupiedNumbers.includes(i);
                const status = isOccupied ? ' (Ocupado)' : ' (Disponível)';
                const optionText = `${accommodationType} ${i}${status}`;

                options += `<option value="${i}" ${isOccupied ? 'disabled' : ''}>${optionText}</option>`;
            }

            kennelNumberSelect.innerHTML = options;
            kennelNumberSelect.disabled = false;

            // Selecionar valor pré-definido se houver e estiver disponível
            if (this.preselectedKennelNumber) {
                const optionExists = kennelNumberSelect.querySelector(`option[value="${this.preselectedKennelNumber}"]`);
                if (optionExists && !optionExists.disabled) {
                    kennelNumberSelect.value = this.preselectedKennelNumber;
                }
                // Limpar seleção prévia para não interferir no futuro
                this.preselectedKennelNumber = null;
            }
        } catch (error) {
            console.error('Erro ao verificar disponibilidade:', error);
            kennelNumberSelect.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    }

    calculateTotalDays() {
        const checkinDate = document.getElementById('checkin-date')?.value;
        const checkoutDate = document.getElementById('checkout-date')?.value;

        if (!checkinDate || !checkoutDate) return;

        const checkin = new Date(checkinDate);
        const checkout = new Date(checkoutDate);

        if (checkout <= checkin) return;

        const totalDays = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));

        // Atualizar campo oculto ou exibir informação
        const daysInfo = document.querySelector('.days-info');
        if (daysInfo) {
            daysInfo.textContent = `${totalDays} diária(s)`;
        }

        this.calculateTotalValue();
    }

    calculateTotalValue() {
        const checkinDate = document.getElementById('checkin-date')?.value;
        const checkoutDate = document.getElementById('checkout-date')?.value;
        const dailyRate = parseFloat(document.getElementById('daily-rate')?.value) || 0;
        const transportValue = document.getElementById('transport-service')?.checked ?
            (parseFloat(document.getElementById('transport-value')?.value) || 0) : 0;
        const bathValue = document.getElementById('bath-service')?.checked ?
            (parseFloat(document.getElementById('bath-value')?.value) || 0) : 0;

        const totalValueInput = document.getElementById('total-value');
        if (!totalValueInput) return;

        if (!checkinDate || !checkoutDate || dailyRate <= 0) {
            totalValueInput.value = '';
            return;
        }

        const checkin = new Date(checkinDate);
        const checkout = new Date(checkoutDate);
        const totalDays = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));

        if (totalDays <= 0) {
            totalValueInput.value = '';
            return;
        }

        const totalValue = (totalDays * dailyRate) + transportValue + bathValue;
        totalValueInput.value = this.formatCurrency(totalValue);
    }

    applyFilters() {
        const search = document.getElementById('reservation-search')?.value.toLowerCase().trim() || '';
        const status = document.getElementById('status-filter')?.value || '';
        const month = document.getElementById('month-filter')?.value || '';

        this.filteredReservations = this.reservations.filter(reservation => {
            const matchesSearch = !search ||
                (reservation.animal_name && reservation.animal_name.toLowerCase().includes(search)) ||
                (reservation.tutor_name && reservation.tutor_name.toLowerCase().includes(search));

            const matchesStatus = !status || reservation.status === status;

            const matchesMonth = !month ||
                (reservation.checkin_date && reservation.checkin_date.startsWith(month));

            return matchesSearch && matchesStatus && matchesMonth;
        });

        this.renderReservationsTable();
        this.updateReservationStats();
    }

    renderReservationsTable() {
        const tbody = document.querySelector('#reservations-table tbody');
        if (!tbody) return;

        if (!Array.isArray(this.filteredReservations) || this.filteredReservations.length === 0) {
            tbody.innerHTML = this.getEmptyStateHTML();
            return;
        }

        tbody.innerHTML = this.filteredReservations.map(reservation => `
            <tr>
                <td data-label="Animal">
                    <div class="animal-info">
                        <strong>${reservation.animal_name || 'N/A'}</strong>
                        <small>${reservation.animal_species || 'N/A'}</small>
                    </div>
                </td>
                <td data-label="Alojamento">
                    <span class="kennel-badge ${(reservation.accommodation_type || '').toLowerCase()}">
                        ${reservation.accommodation_type || 'N/A'} ${reservation.kennel_number || ''}
                    </span>
                </td>
                <td data-label="Período">
                    <div class="date-info">
                        <div>${this.formatDate(reservation.checkin_date)} a</div>
                        <div>${this.formatDate(reservation.checkout_date)}</div>
                    </div>
                </td>
                <td data-label="Diárias">
                    <span class="days-badge">${reservation.total_days || 0}</span>
                </td>
                <td data-label="Valor">
                    <strong>${this.formatCurrency(reservation.total_value)}</strong>
                </td>
                <td data-label="Status">
                    <span class="status-badge ${this.getStatusClass(reservation.status)}">
                        ${reservation.status || 'N/A'}
                    </span>
                </td>
                <td data-label="Ações">
                    <div class="action-buttons" style="justify-content: flex-end;">
                        <button class="action-btn wa-btn" onclick="reservationsManager.sendWhatsAppReceipt(${reservation.id})" title="Enviar Recibo WhatsApp">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        <button class="action-btn print-btn" onclick="printReceipt(${reservation.id})" title="Imprimir Recibo">
                            <i class="fas fa-print"></i>
                        </button>
                        <button class="action-btn view-btn" onclick="reservationsManager.viewReservation(${reservation.id})" title="Ver detalhes">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit-btn" onclick="reservationsManager.editReservation(${reservation.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${reservation.status === 'ATIVA' ?
                `<button class="action-btn finish-btn" onclick="reservationsManager.finishReservation(${reservation.id})" title="Finalizar">
                                 <i class="fas fa-check"></i>
                             </button>` : ''
            }
                        <button class="action-btn delete-btn" onclick="reservationsManager.deleteReservation(${reservation.id})" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async sendWhatsAppReceipt(id) {
        try {
            const res = await db.getReservationById(id);
            if (!res) return;

            const tutorPhone = this.formatPhoneForWhatsApp(res.tutor_phone);
            const message = `Olá ${res.tutor_name}! 🐾\n\nInformamos que a reserva de *${res.animal_name}* no *Hotel Pet CÁ* foi finalizada com sucesso.\n\n📅 *Período:* ${this.formatDate(res.checkin_date)} a ${this.formatDate(res.checkout_date)}\n💰 *Valor Total:* ${this.formatCurrency(res.total_value)}\n\nAgradecemos a confiança! Esperamos ver vocês em breve. ❤️`;

            const waUrl = `https://wa.me/${tutorPhone}?text=${encodeURIComponent(message)}`;
            window.open(waUrl, '_blank');
        } catch (error) {
            console.error('Erro ao enviar WhatsApp:', error);
            this.showError('Erro ao enviar mensagem pelo WhatsApp');
        }
    }

    formatPhoneForWhatsApp(phone) {
        if (!phone) return '';
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11) cleaned = '55' + cleaned;
        if (cleaned.length === 10) cleaned = '55' + cleaned;
        return cleaned;
    }

    getEmptyStateHTML() {
        const search = document.getElementById('reservation-search')?.value || '';
        const status = document.getElementById('status-filter')?.value || '';
        const month = document.getElementById('month-filter')?.value || '';

        return `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="empty-state">
                        <div class="empty-content">
                            <i class="fas fa-calendar-alt"></i>
                            <h3>Nenhuma reserva encontrada</h3>
                            <p>${search || status || month ?
                'Tente ajustar os filtros de busca' :
                'Clique em "Nova Reserva" para criar a primeira reserva'
            }</p>
                            ${!search && !status && !month ?
                '<button class="btn btn-primary" onclick="reservationsManager.openReservationModal()">Nova Reserva</button>' :
                '<button class="btn btn-secondary" onclick="reservationsManager.clearFilters()">Limpar Filtros</button>'
            }
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }

    openReservationModal(data = null) {
        this.currentReservationId = null;
        let prefillData = null;

        // Verificar se é ID (edição) ou Objeto (Nova reserva pré-preenchida)
        if (data && typeof data === 'object') {
            prefillData = data;
        } else if (data) {
            this.currentReservationId = data;
        }

        const modal = document.getElementById('reservation-modal');
        const form = document.getElementById('reservation-form');
        const title = document.getElementById('reservation-modal-title');

        if (!modal || !form) return;

        form.reset();

        // Resetar campos específicos
        const kennelNumberSelect = document.getElementById('reservation-kennel-number');
        if (kennelNumberSelect) {
            kennelNumberSelect.innerHTML = '<option value="">Selecione as datas primeiro</option>';
            kennelNumberSelect.disabled = true;
        }

        const transportValue = document.getElementById('transport-value');
        const bathValue = document.getElementById('bath-value');
        const totalValue = document.getElementById('total-value');

        if (transportValue) transportValue.disabled = true;
        if (bathValue) bathValue.disabled = true;
        if (totalValue) totalValue.value = 'R$ 0,00';

        if (this.currentReservationId) {
            if (title) title.textContent = 'Editar Reserva';
            this.loadReservationData(this.currentReservationId);
        } else {
            if (title) title.textContent = 'Nova Reserva';
            this.loadAnimalsDropdown();

            // Pré-preencher dados se fornecidos (ex: vindo da tela de canis)
            if (prefillData) {
                setTimeout(() => {
                    const typeSelect = document.getElementById('reservation-accommodation-type');
                    if (typeSelect && prefillData.tipo) {
                        typeSelect.value = prefillData.tipo;

                        // Armazenar número do canil para seleção posterior (após datas)
                        if (prefillData.numero) {
                            this.preselectedKennelNumber = prefillData.numero;

                            // Tentar definir datas padrão (hoje -> amanhã) para facilitar
                            const today = new Date();
                            const tomorrow = new Date(today);
                            tomorrow.setDate(tomorrow.getDate() + 1);

                            const checkinDate = document.getElementById('checkin-date');
                            const checkoutDate = document.getElementById('checkout-date');

                            if (checkinDate) checkinDate.valueAsDate = today;
                            if (checkoutDate) checkoutDate.valueAsDate = tomorrow;

                            // Forçar atualização da lista de canis
                            this.populateKennelNumbers(prefillData.tipo);
                            this.calculateTotalDays();
                        }
                    }
                }, 200);
            } else {
                this.preselectedKennelNumber = null;
            }
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeReservationModal() {
        const modal = document.getElementById('reservation-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    async saveReservation() {
        const form = document.getElementById('reservation-form');
        if (!this.validateForm(form)) return;

        const checkinDate = document.getElementById('checkin-date').value;
        const checkoutDate = document.getElementById('checkout-date').value;
        const checkin = new Date(checkinDate);
        const checkout = new Date(checkoutDate);
        const totalDays = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));

        const reservationData = {
            animal_id: parseInt(document.getElementById('reservation-animal').value),
            accommodation_type: document.getElementById('reservation-accommodation-type').value,
            kennel_number: parseInt(document.getElementById('reservation-kennel-number').value),
            daily_rate: parseFloat(document.getElementById('daily-rate').value),
            checkin_date: checkinDate,
            checkout_date: checkoutDate,
            checkin_time: document.getElementById('checkin-time')?.value || '14:00',
            checkout_time: document.getElementById('checkout-time')?.value || '12:00',
            total_days: totalDays,
            transport_service: document.getElementById('transport-service').checked,
            transport_value: parseFloat(document.getElementById('transport-value').value) || 0,
            bath_service: document.getElementById('bath-service').checked,
            bath_value: parseFloat(document.getElementById('bath-value').value) || 0,
            payment_method: document.getElementById('payment-method').value,
            whatsapp_receipt: document.getElementById('whatsapp-receipt').checked ? 1 : 0
        };

        // Calcular valor total
        reservationData.total_value = (totalDays * reservationData.daily_rate) +
            (reservationData.transport_service ? reservationData.transport_value : 0) +
            (reservationData.bath_service ? reservationData.bath_value : 0);

        try {
            if (this.currentReservationId) {
                await db.updateReservation(this.currentReservationId, reservationData);
            } else {
                await db.addReservation(reservationData);
            }

            this.closeReservationModal();
            this.loadReservations();

            if (window.dashboardManager) {
                window.dashboardManager.loadDashboard();
            }
        } catch (error) {
            console.error('Erro ao salvar reserva:', error);
            this.showError('Erro ao salvar reserva');
        }
    }

    async deleteReservation(id) {
        if (!confirm('Tem certeza que deseja excluir esta reserva?')) return;

        try {
            await db.deleteReservation(id);
            this.loadReservations();

            if (window.dashboardManager) {
                window.dashboardManager.loadDashboard();
            }
        } catch (error) {
            console.error('Erro ao excluir reserva:', error);
            this.showError('Erro ao excluir reserva');
        }
    }

    async finishReservation(id) {
        if (!confirm('Tem certeza que deseja finalizar esta reserva?')) return;

        try {
            const reservation = await db.getReservationById(id);
            if (reservation) {
                reservation.status = 'FINALIZADA';
                await db.updateReservation(id, reservation);
                this.loadReservations();

                // Enviar recibo se solicitado
                if (reservation.whatsapp_receipt) {
                    this.sendWhatsAppReceipt(id);
                }

                if (window.dashboardManager) {
                    window.dashboardManager.loadDashboard();
                }
            }
        } catch (error) {
            console.error('Erro ao finalizar reserva:', error);
            this.showError('Erro ao finalizar reserva');
        }
    }

    clearFilters() {
        const searchInput = document.getElementById('reservation-search');
        const statusFilter = document.getElementById('status-filter');
        const monthFilter = document.getElementById('month-filter');

        if (searchInput) searchInput.value = '';
        if (statusFilter) statusFilter.value = '';
        if (monthFilter) monthFilter.value = '';

        this.applyFilters();
    }

    updateReservationStats() {
        // Implementar se necessário
    }

    validateForm(form) {
        // Implementar validação básica
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                this.showFieldError(field, 'Este campo é obrigatório');
                isValid = false;
            }
        });

        return isValid;
    }

    validateField(field) {
        // Implementar validação específica
    }

    clearFieldError(field) {
        // Implementar limpeza de erro
    }

    showFieldError(field, message) {
        // Implementar exibição de erro
        console.warn(`Erro no campo ${field.id}: ${message}`);
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value || 0);
    }

    formatDate(dateString) {
        if (!dateString) return '-';

        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR');
        } catch (error) {
            return dateString;
        }
    }

    getStatusClass(status) {
        const statusClasses = {
            'ATIVA': 'status-active',
            'FINALIZADA': 'status-finished',
            'CANCELADA': 'status-cancelled'
        };
        return statusClasses[status] || 'status-active';
    }

    showLoading() {
        const section = document.getElementById('reservations');
        if (!section) return;

        let loader = section.querySelector('.section-loader');

        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'section-loader';
            loader.innerHTML = `
                <div class="loader-content">
                    <div class="spinner"></div>
                    <p>Carregando reservas...</p>
                </div>
            `;
            section.appendChild(loader);
        }

        loader.style.display = 'flex';
    }

    hideLoading() {
        const loader = document.querySelector('#reservations .section-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    showError(message) {
        if (window.hotelPetApp) {
            window.hotelPetApp.showNotification(message, 'error');
        } else {
            console.error(message);
        }
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

    // Métodos adicionais para compatibilidade
    async viewReservation(id) {
        console.log('Visualizar reserva:', id);
        // Implementar visualização detalhada
    }

    async editReservation(id) {
        this.openReservationModal(id);
    }

    async loadReservationData(id) {
        try {
            const reservation = await db.getReservationById(id);
            if (!reservation) return;

            // Preencher formulário com dados da reserva
            const fields = {
                'reservation-animal': reservation.animal_id,
                'reservation-accommodation-type': reservation.accommodation_type,
                'reservation-kennel-number': reservation.kennel_number,
                'daily-rate': reservation.daily_rate,
                'checkin-date': reservation.checkin_date,
                'checkout-date': reservation.checkout_date,
                'checkin-time': reservation.checkin_time || '14:00',
                'checkout-time': reservation.checkout_time || '12:00',
                'transport-service': reservation.transport_service,
                'transport-value': reservation.transport_value,
                'bath-service': reservation.bath_service,
                'bath-value': reservation.bath_value,
                'payment-method': reservation.payment_method
            };

            Object.entries(fields).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = Boolean(value);
                    } else {
                        element.value = value;
                    }
                }
            });

            // Recalcular valores
            this.calculateTotalValue();
        } catch (error) {
            console.error('Erro ao carregar dados da reserva:', error);
        }
    }
}
