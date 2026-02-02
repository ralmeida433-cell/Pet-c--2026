class ReservationsManager {
    constructor() {
        this.currentReservationId = null;
        this.reservations = [];
        this.animals = [];
        this.isInitialized = false;
        this.accommodationTypes = { 'INTERNO': { species: 'CÃO' }, 'EXTERNO': { species: 'CÃO' }, 'GATIL': { species: 'GATO' } };
        this.allKennels = [];
    }

    init() {
        if (this.isInitialized) return;
        this.bindEvents();
        this.isInitialized = true;
    }

    bindEvents() {
        document.getElementById('add-reservation-btn')?.addEventListener('click', () => this.openReservationModal());
        document.getElementById('reservation-form')?.addEventListener('submit', (e) => { e.preventDefault(); this.saveReservation(); });
        document.addEventListener('click', (e) => {
            const header = e.target.closest('.res-card-header');
            if (header) { this.toggleCardExpansion(header.closest('.reservation-expandable-card')); return; }
            const actionBtn = e.target.closest('[data-action]');
            if (actionBtn) { this.handleDetailAction(actionBtn.dataset.action, actionBtn.dataset.id); }
        });
        document.getElementById('reservation-accommodation-type')?.addEventListener('change', (e) => { this.populateKennelNumbers(e.target.value); });
        document.getElementById('checkin-date')?.addEventListener('change', () => this.updateAvailability());
        document.getElementById('checkout-date')?.addEventListener('change', () => this.updateAvailability());
        document.getElementById('daily-rate')?.addEventListener('input', () => this.calculateTotalValue());
        document.getElementById('reservation-search')?.addEventListener('input', () => this.applyFilters());
    }

    toggleCardExpansion(card) {
        if (!card) return;
        const isExpanded = card.classList.contains('expanded');
        document.querySelectorAll('.reservation-expandable-card.expanded').forEach(c => { if (c !== card) { c.classList.remove('expanded'); c.querySelector('.res-card-body').style.maxHeight = null; } });
        const body = card.querySelector('.res-card-body');
        if (isExpanded) { card.classList.remove('expanded'); body.style.maxHeight = null; } else { card.classList.add('expanded'); body.style.maxHeight = body.scrollHeight + "px"; }
    }

    async loadReservations() { if (!window.db || !window.db.isInitialized) return; this.reservations = await db.getReservations(); this.applyFilters(); }
    async updateAccommodationList() { if (!window.db || !window.db.isInitialized) return; this.allKennels = await window.db.getAllKennels(); }

    async loadAnimalsDropdown() {
        await this.updateAccommodationList();
        const animals = await db.getAnimals();
        const select = document.getElementById('reservation-animal');
        if (!select) return;
        select.innerHTML = '<option value="">Selecione</option>' + animals.map(a => `<option value="${a.id}" data-species="${a.species}">${a.name}</option>`).join('');
        select.onchange = (e) => { const species = e.target.options[e.target.selectedIndex]?.dataset.species; if (species) this.filterAccommodationBySpecies(species); };
    }

    filterAccommodationBySpecies(species) {
        const select = document.getElementById('reservation-accommodation-type');
        if (!select) return;
        const compatibleTypes = Object.entries(this.accommodationTypes).filter(([type, info]) => info.species === species).map(([type]) => type);
        select.innerHTML = '<option value="">Selecione</option>' + compatibleTypes.map(type => `<option value="${type}">${type}</option>`).join('');
    }

    async populateKennelNumbers(type, current = null) {
        const kennelSelect = document.getElementById('reservation-kennel-number');
        const checkin = document.getElementById('checkin-date').value;
        const checkout = document.getElementById('checkout-date').value;
        if (!type || !checkin || !checkout) { kennelSelect.disabled = true; return; }
        try {
            const occupied = await db.getOccupiedKennels(checkin, checkout);
            const occupiedNumbers = occupied.filter(o => o.accommodation_type === type).map(o => o.kennel_number);
            const availableKennels = this.allKennels.filter(k => k.type === type);
            kennelSelect.innerHTML = '<option value="">Escolha</option>' + availableKennels.map(k => {
                const isOccupied = occupiedNumbers.includes(k.number);
                return `<option value="${k.number}" ${isOccupied && k.number != current ? 'disabled' : ''} ${k.number == current ? 'selected' : ''}>${type} ${k.number}</option>`;
            }).join('');
            kennelSelect.disabled = false;
        } catch (e) { console.error(e); }
    }

    calculateTotalValue() {
        const d1 = new Date(document.getElementById('checkin-date').value + 'T00:00:00');
        const d2 = new Date(document.getElementById('checkout-date').value + 'T00:00:00');
        const daily = parseFloat(document.getElementById('daily-rate')?.value) || 0;
        if (d1 && d2 && d2 > d1) { const days = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)); document.getElementById('total-value').value = this.formatCurrency(days * daily); } else { document.getElementById('total-value').value = this.formatCurrency(0); }
    }

    async saveReservation() {
        const animalId = document.getElementById('reservation-animal').value;
        const type = document.getElementById('reservation-accommodation-type').value;
        const number = document.getElementById('reservation-kennel-number').value;
        const daily = parseFloat(document.getElementById('daily-rate').value);
        const inDate = document.getElementById('checkin-date').value;
        const outDate = document.getElementById('checkout-date').value;
        if (!animalId || !type || !number) return;
        const d1 = new Date(inDate + 'T00:00:00'); const d2 = new Date(outDate + 'T00:00:00');
        const totalDays = Math.max(1, Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)));
        const data = { animal_id: animalId, accommodation_type: type, kennel_number: number, daily_rate: daily, checkin_date: inDate, checkout_date: outDate, payment_method: document.getElementById('payment-method').value, total_days: totalDays, total_value: totalDays * daily, status: 'ATIVA' };
        try { if (this.currentReservationId) await db.updateReservation(this.currentReservationId, data); else await db.addReservation(data); window.hotelPetApp.closeAllModals(); await this.loadReservations(); } catch (e) { console.error(e); }
    }

    applyFilters() {
        const search = document.getElementById('reservation-search')?.value.toLowerCase() || '';
        const filtered = this.reservations.filter(r => r.animal_name?.toLowerCase().includes(search) || r.tutor_name?.toLowerCase().includes(search));
        this.renderReservationsList(filtered);
    }

    renderReservationsList(data) {
        const container = document.querySelector('#reservations .table-container');
        if (!container) return;
        if (data.length === 0) { container.innerHTML = '<p class="text-center p-4">Vazio.</p>'; return; }
        container.innerHTML = data.map(r => `
            <div class="reservation-expandable-card">
                <div class="res-card-header">
                    <div class="res-summary-left">
                        <div class="res-pet-thumb"><img src="${r.photo_url || ''}" onerror="this.style.display='none'"><i class="fas fa-paw" style="${r.photo_url ? 'display:none' : ''}"></i></div>
                        <div class="res-pet-info"><strong class="res-name">${r.animal_name}</strong><span class="res-period">${this.formatDateShort(r.checkin_date)} - ${this.formatDateShort(r.checkout_date)}</span></div>
                    </div>
                    <div class="res-summary-right"><span class="status-badge-compact ${r.status.toLowerCase()}">${r.status}</span><i class="fas fa-chevron-down expansion-arrow"></i></div>
                </div>
                <div class="res-card-body">
                    <div class="res-details-grid">
                        <div class="res-detail-item"><label>Tutor</label><span>${r.tutor_name}</span></div>
                        <div class="res-detail-item"><label>Local</label><span>${r.accommodation_type} ${r.kennel_number}</span></div>
                        <div class="res-detail-item"><label>Check-in</label><span>${this.formatDate(r.checkin_date)}</span></div>
                        <div class="res-detail-item"><label>Check-out</label><span>${this.formatDate(r.checkout_date)}</span></div>
                        <div class="res-detail-item"><label>Total</label><strong class="res-total-val">${this.formatCurrency(r.total_value)}</strong></div>
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
        if (action === 'edit') await this.editReservation(id); else if (action === 'finalize') await this.finalizeReservation(id); else if (action === 'whatsapp') await this.shareReceipt(id);
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
            await this.populateKennelNumbers(res.accommodation_type, res.kennel_number);
            document.getElementById('reservation-kennel-number').value = res.kennel_number;
            this.calculateTotalValue();
        }, 300);
    }

    async finalizeReservation(id) { if (confirm('Finalizar?')) { await db.updateReservation(id, { status: 'FINALIZADA' }); await this.loadReservations(); } }
    async shareReceipt(id) { const res = this.reservations.find(r => r.id == id); const text = encodeURIComponent(`Recibo Pet: ${res.animal_name}\nTotal: ${this.formatCurrency(res.total_value)}`); window.open(`https://wa.me/55${res.tutor_phone.replace(/\D/g,'')}?text=${text}`, '_blank'); }
    openReservationModal() { this.currentReservationId = null; document.getElementById('reservation-form')?.reset(); this.loadAnimalsDropdown(); document.getElementById('reservation-modal').classList.add('active'); document.body.style.overflow = 'hidden'; }
    formatDate(d) { return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR'); }
    formatDateShort(d) { return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); }
    formatCurrency(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
    updateAvailability() { this.calculateTotalValue(); }
}
window.ReservationsManager = ReservationsManager;