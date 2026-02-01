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
        document.getElementById('transport-service')?.addEventListener('change', () => this.calculateTotalValue());
        document.getElementById('bath-service')?.addEventListener('change', () => this.calculateTotalValue());

        // Busca e filtros
        document.getElementById('reservation-search')?.addEventListener('input', () => this.applyFilters());
        document.getElementById('status-filter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('month-filter')?.addEventListener('change', () => this.applyFilters());
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

    async populateKennelNumbers(accommodationType) {
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
                options += `<option value="${kennel.number}" ${isOccupied ? 'disabled' : ''}>${accommodationType} ${kennel.number} ${isOccupied ? '(Ocupado)' : '(Livre)'}</option>`;
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
        const daily = parseFloat(document.getElementById('daily-rate').value) || 0;
        
        if (d1 && d2 && d2 > d1) {
            const days = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
            let total = days * daily;
            
            if (document.getElementById('transport-service').checked) {
                total += parseFloat(document.getElementById('transport-value').value) || 0;
            }
            if (document.getElementById('bath-service').checked) {
                total += parseFloat(document.getElementById('bath-value').value) || 0;
            }

            document.getElementById('total-value').value = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total);
        }
    }

    openReservationModal(data = null) {
        const modal = document.getElementById('reservation-modal');
        const form = document.getElementById('reservation-form');
        if (!modal || !form) return;

        form.reset();
        this.loadAnimalsDropdown();

        // Datas Padrão (Hoje e Amanhã) para facilitar a busca automática de canis
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        document.getElementById('checkin-date').valueAsDate = today;
        document.getElementById('checkout-date').valueAsDate = tomorrow;

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

    async saveReservation() {
        const d1 = new Date(document.getElementById('checkin-date').value);
        const d2 = new Date(document.getElementById('checkout-date').value);
        const days = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));

        const data = {
            animal_id: document.getElementById('reservation-animal').value,
            accommodation_type: document.getElementById('reservation-accommodation-type').value,
            kennel_number: document.getElementById('reservation-kennel-number').value,
            daily_rate: document.getElementById('daily-rate').value,
            checkin_date: document.getElementById('checkin-date').value,
            checkout_date: document.getElementById('checkout-date').value,
            total_days: days,
            transport_service: document.getElementById('transport-service').checked,
            transport_value: document.getElementById('transport-value').value,
            bath_service: document.getElementById('bath-service').checked,
            bath_value: document.getElementById('bath-value').value,
            payment_method: document.getElementById('payment-method').value,
            total_value: parseFloat(document.getElementById('total-value').value.replace(/[R$\s.]/g, '').replace(',', '.'))
        };

        await db.addReservation(data);
        window.hotelPetApp.closeAllModals();
        this.loadReservations();
        if (window.dashboardManager) window.dashboardManager.loadDashboard();
        if (window.kennelVisualization) window.kennelVisualization.refresh();
    }

    applyFilters() {
        const s = document.getElementById('reservation-search').value.toLowerCase();
        const status = document.getElementById('status-filter').value;
        
        const filtered = this.reservations.filter(r => {
            const matchesSearch = r.animal_name?.toLowerCase().includes(s) || r.tutor_name?.toLowerCase().includes(s);
            const matchesStatus = !status || r.status === status;
            return matchesSearch && matchesStatus;
        });

        this.renderReservationsTable(filtered);
    }

    renderReservationsTable(data) {
        const tbody = document.querySelector('#reservations-table tbody');
        if (!tbody) return;
        tbody.innerHTML = data.map(r => `
            <tr>
                <td><strong>${r.animal_name}</strong></td>
                <td><span class="kennel-badge ${r.accommodation_type.toLowerCase()}">${r.accommodation_type} ${r.kennel_number}</span></td>
                <td>${new Date(r.checkin_date).toLocaleDateString()} a ${new Date(r.checkout_date).toLocaleDateString()}</td>
                <td>${r.total_days}</td>
                <td>R$ ${r.total_value.toFixed(2)}</td>
                <td><span class="status-badge ${r.status.toLowerCase()}">${r.status}</span></td>
                <td><button class="action-btn delete-btn" onclick="window.reservationsManager.deleteReservation(${r.id})"><i class="fas fa-trash"></i></button></td>
            </tr>
        `).join('');
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