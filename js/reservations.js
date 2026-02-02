class ReservationsManager {
    constructor() {
        this.currentReservationId = null;
        this.reservations = [];
        this.animals = [];
        this.isInitialized = false;
        this.accommodationTypes = {
            'INTERNO': { species: 'CÃO' },
            'EXTERNO': { species: 'CÃO' },
            'GATIL': { species: 'GATO' }
        };
        this.allKennels = [];
    }

    init() {
        if (this.isInitialized) return;
        this.bindEvents();
        this.isInitialized = true;
        console.log('Reservations Manager: Iniciado');
    }

    bindEvents() {
        const addBtn = document.getElementById('add-reservation-btn');
        if (addBtn) addBtn.onclick = () => this.openReservationModal();

        const form = document.getElementById('reservation-form');
        if (form) {
            form.onsubmit = (e) => { 
                e.preventDefault(); 
                this.saveReservation(); 
            };
        }

        // Delegação de evento para expansão e botões de ação na lista
        document.addEventListener('click', (e) => {
            const cardHeader = e.target.closest('.res-card-header');
            if (cardHeader) {
                this.toggleCardExpansion(cardHeader.closest('.reservation-expandable-card'));
                return;
            }

            const actionBtn = e.target.closest('[data-action]');
            if (actionBtn) {
                const id = actionBtn.dataset.id;
                const action = actionBtn.dataset.action;
                this.handleDetailAction(action, id);
            }
        });

        document.getElementById('reservation-accommodation-type')?.addEventListener('change', (e) => {
            this.populateKennelNumbers(e.target.value);
        });

        document.getElementById('checkin-date')?.addEventListener('change', () => this.updateAvailability());
        document.getElementById('checkout-date')?.addEventListener('change', () => this.updateAvailability());
        document.getElementById('daily-rate')?.addEventListener('input', () => this.calculateTotalValue());
        
        document.getElementById('reservation-search')?.addEventListener('input', () => this.applyFilters());
        document.getElementById('month-filter')?.addEventListener('change', () => this.applyFilters());
    }

    toggleCardExpansion(card) {
        if (!card) return;
        const isExpanded = card.classList.contains('expanded');
        
        // Fecha outros cards abertos
        document.querySelectorAll('.reservation-expandable-card.expanded').forEach(c => {
            if (c !== card) {
                c.classList.remove('expanded');
                c.querySelector('.res-card-body').style.maxHeight = null;
            }
        });

        const body = card.querySelector('.res-card-body');
        if (isExpanded) {
            card.classList.remove('expanded');
            body.style.maxHeight = null;
        } else {
            card.classList.add('expanded');
            body.style.maxHeight = body.scrollHeight + "px";
        }
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
        await this.updateAccommodationList();
        const animals = await db.getAnimals();
        const select = document.getElementById('reservation-animal');
        if (!select) return;
        select.innerHTML = '<option value="">Selecione o animal</option>' + 
            animals.map(a => `<option value="${a.id}" data-species="${a.species}">${a.name} (${a.tutor_name})</option>`).join('');
        
        select.onchange = (e) => {
            const species = e.target.options[e.target.selectedIndex]?.dataset.species;
            if (species) this.filterAccommodationBySpecies(species);
        };
    }

    filterAccommodationBySpecies(species) {
        const select = document.getElementById('reservation-accommodation-type');
        if (!select) return;
        const compatibleTypes = Object.entries(this.accommodationTypes)
            .filter(([type, info]) => info.species === species)
            .map(([type]) => type);

        select.innerHTML = '<option value="">Selecione</option>';
        compatibleTypes.forEach(type => {
            select.innerHTML += `<option value="${type}">${type === 'GATIL' ? 'Gatil' : 'Canil ' + type.toLowerCase()}</option>`;
        });
    }

    async populateKennelNumbers(accommodationType, currentKennel = null) {
        const kennelSelect = document.getElementById('reservation-kennel-number');
        const checkin = document.getElementById('checkin-date').value;
        const checkout = document.getElementById('checkout-date').value;

        if (!accommodationType || !checkin || !checkout) {
            kennelSelect.disabled = true;
            return;
        }

        try {
            const occupied = await db.getOccupiedKennels(checkin, checkout);
            const occupiedNumbers = occupied.filter(o => o.accommodation_type === accommodationType).map(o => o.kennel_number);
            const availableKennels = this.allKennels.filter(k => k.type === accommodationType);
            
            let options = '<option value="">Escolha o número</option>';
            availableKennels.forEach(kennel => {
                const isOccupied = occupiedNumbers.includes(kennel.number);
                const isCurrent = currentKennel && kennel.number == currentKennel;
                options += `<option value="${kennel.number}" ${isOccupied && !isCurrent ? 'disabled' : ''} ${isCurrent ? 'selected' : ''}>
                    ${accommodationType} ${kennel.number} ${isOccupied && !isCurrent ? '(Ocupado)' : '(Livre)'}
                </option>`;
            });

            kennelSelect.innerHTML = options;
            kennelSelect.disabled = false;
        } catch (e) { console.error(e); }
    }

    calculateTotalValue() {
        const d1 = new Date(document.getElementById('checkin-date').value + 'T00:00:00');
        const d2 = new Date(document.getElementById('checkout-date').value + 'T00:00:00');
        const daily = parseFloat(document.getElementById('daily-rate')?.value) || 0;
        
        if (d1 && d2 && d2 > d1) {
            const days = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
            let total = days * daily;
            document.getElementById('total-value').value = this.formatCurrency(total);
        } else {
            document.getElementById('total-value').value = this.formatCurrency(0);
        }
    }

    async saveReservation() {
        const animalId = document.getElementById('reservation-animal').value;
        const accommodationType = document.getElementById('reservation-accommodation-type').value;
        const kennelNumber = document.getElementById('reservation-kennel-number').value;
        const dailyRate = parseFloat(document.getElementById('daily-rate').value);
        const checkinDate = document.getElementById('checkin-date').value;
        const checkoutDate = document.getElementById('checkout-date').value;
        const paymentMethod = document.getElementById('payment-method').value;

        if (!animalId || !accommodationType || !kennelNumber) {
            window.hotelPetApp.showNotification('Preencha os campos obrigatórios.', 'warning');
            return;
        }

        const d1 = new Date(checkinDate + 'T00:00:00');
        const d2 = new Date(checkoutDate + 'T00:00:00');
        const totalDays = Math.max(1, Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)));

        const data = {
            animal_id: animalId,
            accommodation_type: accommodationType,
            kennel_number: kennelNumber,
            daily_rate: dailyRate,
            checkin_date: checkinDate,
            checkout_date: checkoutDate,
            payment_method: paymentMethod,
            total_days: totalDays,
            total_value: totalDays * dailyRate,
            status: 'ATIVA'
        };

        window.hotelPetApp.showLoading();
        try {
            if (this.currentReservationId) {
                await db.updateReservation(this.currentReservationId, data);
            } else {
                await db.addReservation(data);
            }
            window.hotelPetApp.closeAllModals();
            await this.loadReservations();
        } catch (e) {
            console.error(e);
        } finally {
            window.hotelPetApp.hideLoading();
        }
    }

    applyFilters() {
        const search = document.getElementById('reservation-search')?.value.toLowerCase() || '';
        const month = document.getElementById('month-filter')?.value || '';
        
        const filtered = this.reservations.filter(r => {
            const matchesSearch = r.animal_name?.toLowerCase().includes(search) || r.tutor_name?.toLowerCase().includes(search);
            const matchesMonth = !month || r.checkin_date.startsWith(month);
            return matchesSearch && matchesMonth;
        });

        this.renderReservationsList(filtered);
    }

    renderReservationsList(data) {
        const container = document.querySelector('#reservations .table-container');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = '<p class="text-center p-4">Nenhuma reserva encontrada.</p>';
            return;
        }

        container.innerHTML = data.map(r => `
            <div class="reservation-expandable-card" id="res-card-${r.id}">
                <div class="res-card-header">
                    <div class="res-summary-left">
                        <div class="res-pet-thumb">
                            <img src="${r.photo_url || ''}" onerror="this.style.display='none'">
                            <i class="fas fa-paw" style="${r.photo_url ? 'display:none' : ''}"></i>
                        </div>
                        <div class="res-pet-info">
                            <strong class="res-name">${r.animal_name}</strong>
                            <span class="res-period">${this.formatDateShort(r.checkin_date)} - ${this.formatDateShort(r.checkout_date)}</span>
                        </div>
                    </div>
                    <div class="res-summary-right">
                        <span class="status-badge-compact ${r.status.toLowerCase()}">${r.status}</span>
                        <i class="fas fa-chevron-down expansion-arrow"></i>
                    </div>
                </div>
                
                <div class="res-card-body">
                    <div class="res-details-grid">
                        <div class="res-detail-item">
                            <label>Tutor</label>
                            <span>${r.tutor_name}</span>
                        </div>
                        <div class="res-detail-item">
                            <label>Alojamento</label>
                            <span>${r.accommodation_type} ${r.kennel_number}</span>
                        </div>
                        <div class="res-detail-item">
                            <label>Check-in</label>
                            <span>${this.formatDate(r.checkin_date)}</span>
                        </div>
                        <div class="res-detail-item">
                            <label>Check-out</label>
                            <span>${this.formatDate(r.checkout_date)}</span>
                        </div>
                        <div class="res-detail-item">
                            <label>Pgto</label>
                            <span>${r.payment_method}</span>
                        </div>
                        <div class="res-detail-item">
                            <label>Total</label>
                            <strong class="res-total-val">${this.formatCurrency(r.total_value)}</strong>
                        </div>
                    </div>
                    <div class="res-card-actions">
                        <button class="btn btn-sm btn-secondary" data-action="edit" data-id="${r.id}"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-success" data-action="whatsapp" data-id="${r.id}"><i class="fab fa-whatsapp"></i></button>
                        ${r.status === 'ATIVA' ? `<button class="btn btn-sm btn-primary" data-action="finalize" data-id="${r.id}">Finalizar</button>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    async handleDetailAction(action, id) {
        if (action === 'edit') await this.editReservation(id);
        else if (action === 'finalize') await this.finalizeReservation(id);
        else if (action === 'whatsapp') await this.shareReceipt(id);
    }

    async editReservation(id) {
        const res = this.reservations.find(r => r.id == id);
        if (!res) return;
        this.currentReservationId = id;
        this.openReservationModal();
        
        setTimeout(async () => {
            document.getElementById('reservation-animal').value = res.animal_id;
            this.filterAccommodationBySpecies(res.animal_species);
            document.getElementById('reservation-accommodation-type').value = res.accommodation_type;
            document.getElementById('daily-rate').value = res.daily_rate;
            document.getElementById('checkin-date').value = res.checkin_date;
            document.getElementById('checkout-date').value = res.checkout_date;
            document.getElementById('payment-method').value = res.payment_method;
            await this.populateKennelNumbers(res.accommodation_type, res.kennel_number);
            document.getElementById('reservation-kennel-number').value = res.kennel_number;
            this.calculateTotalValue();
        }, 300);
    }

    async finalizeReservation(id) {
        if (confirm('Finalizar hospedagem e liberar alojamento?')) {
            await db.updateReservation(id, { status: 'FINALIZADA' });
            window.hotelPetApp.showNotification('Finalizada!', 'success');
            await this.loadReservations();
        }
    }

    async shareReceipt(id) {
        const res = this.reservations.find(r => r.id == id);
        const text = encodeURIComponent(`*Hotel Pet CÁ - Recibo*\nPet: ${res.animal_name}\nTotal: ${this.formatCurrency(res.total_value)}`);
        window.open(`https://wa.me/55${res.tutor_phone.replace(/\D/g,'')}?text=${text}`, '_blank');
    }

    openReservationModal() {
        this.currentReservationId = null;
        document.getElementById('reservation-form')?.reset();
        this.loadAnimalsDropdown();
        document.getElementById('reservation-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    formatDate(d) { return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR'); }
    formatDateShort(d) { return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); }
    formatCurrency(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
    updateAvailability() { this.calculateTotalValue(); }
}
window.ReservationsManager = ReservationsManager;