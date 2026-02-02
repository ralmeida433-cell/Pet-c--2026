class ReservationsManager {
    constructor() {
        this.currentReservationId = null;
        this.reservations = [];
        this.filteredReservations = [];
        this.animals = [];
        this.isInitialized = false;
        this.accommodationTypes = {
            'INTERNO': { species: 'CÃO' },
            'EXTERNO': { species: 'CÃO' },
            'GATIL': { species: 'GATO' }
        };
        this.allKennels = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.createDetailModal();
        console.log('Reservations Manager: Iniciado');
    }

    bindEvents() {
        const addBtn = document.getElementById('add-reservation-btn');
        if (addBtn) addBtn.onclick = () => this.openReservationModal();

        const form = document.getElementById('reservation-form');
        if (form) form.onsubmit = (e) => { e.preventDefault(); this.saveReservation(); };

        document.getElementById('reservation-accommodation-type')?.addEventListener('change', (e) => {
            this.populateKennelNumbers(e.target.value);
        });

        document.getElementById('checkin-date')?.addEventListener('change', () => this.updateAvailability());
        document.getElementById('checkout-date')?.addEventListener('change', () => this.updateAvailability());
        
        document.getElementById('daily-rate')?.addEventListener('input', () => this.calculateTotalValue());
        
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

        document.getElementById('reservation-search')?.addEventListener('input', () => this.applyFilters());
        document.getElementById('status-filter')?.addEventListener('change', () => this.applyFilters());
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
        await this.updateAccommodationList();
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
        
        const compatibleTypes = Object.entries(this.accommodationTypes)
            .filter(([type, info]) => info.species === species)
            .map(([type]) => type);

        select.innerHTML = '<option value="">Selecione</option>';
        compatibleTypes.forEach(type => {
            select.innerHTML += `<option value="${type}">${type === 'GATIL' ? 'Gatil' : 'Canil ' + type.toLowerCase()}</option>`;
        });
        
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

        try {
            const occupied = await db.getOccupiedKennels(checkin, checkout);
            const occupiedNumbers = occupied
                .filter(o => o.accommodation_type === accommodationType)
                .map(o => o.kennel_number);

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
        } catch (e) { console.error(e); }
    }

    calculateTotalDays() {
        const d1 = new Date(document.getElementById('checkin-date').value);
        const d2 = new Date(document.getElementById('checkout-date').value);
        if (d1 && d2 && d2 > d1) {
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
            
            if (document.getElementById('transport-service')?.checked) total += parseFloat(document.getElementById('transport-value')?.value) || 0;
            if (document.getElementById('bath-service')?.checked) total += parseFloat(document.getElementById('bath-value')?.value) || 0;

            document.getElementById('total-value').value = this.formatCurrency(total);
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
            const date = new Date(dateStr + 'T00:00:00');
            return date.toLocaleDateString('pt-BR');
        } catch (error) { return dateStr; }
    }

    openReservationModal(data = null) {
        const modal = document.getElementById('reservation-modal');
        const form = document.getElementById('reservation-form');
        if (!modal || !form) return;

        form.reset();
        this.currentReservationId = null;
        this.loadAnimalsDropdown();

        document.getElementById('transport-value').disabled = true;
        document.getElementById('bath-value').disabled = true;
        document.getElementById('total-value').value = this.formatCurrency(0);
        document.getElementById('reservation-modal-title').textContent = 'Nova Reserva';

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        document.getElementById('checkin-date').valueAsDate = today;
        document.getElementById('checkout-date').valueAsDate = tomorrow;
        
        this.calculateTotalValue();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    async editReservation(id) {
        const res = await db.getReservationById(id);
        if (!res) return;
        this.currentReservationId = id;
        const modal = document.getElementById('reservation-modal');
        document.getElementById('reservation-modal-title').textContent = 'Editar Reserva';
        await this.loadAnimalsDropdown();
        document.getElementById('reservation-animal').value = res.animal_id;
        this.filterAccommodationBySpecies(res.animal_species);
        document.getElementById('reservation-accommodation-type').value = res.accommodation_type;
        document.getElementById('daily-rate').value = res.daily_rate;
        document.getElementById('checkin-date').value = res.checkin_date;
        document.getElementById('checkout-date').value = res.checkout_date;
        document.getElementById('payment-method').value = res.payment_method;
        document.getElementById('transport-service').checked = res.transport_service;
        document.getElementById('transport-value').value = res.transport_value || '';
        document.getElementById('bath-service').checked = res.bath_service;
        document.getElementById('bath-value').value = res.bath_value || '';
        await this.populateKennelNumbers(res.accommodation_type, res.kennel_number);
        document.getElementById('reservation-kennel-number').value = res.kennel_number;
        this.calculateTotalValue();
        modal.classList.add('active');
        this.closeDetailModal();
    }

    async saveReservation() {
        const data = {
            animal_id: document.getElementById('reservation-animal').value,
            accommodation_type: document.getElementById('reservation-accommodation-type').value,
            kennel_number: document.getElementById('reservation-kennel-number').value,
            daily_rate: parseFloat(document.getElementById('daily-rate').value),
            checkin_date: document.getElementById('checkin-date').value,
            checkout_date: document.getElementById('checkout-date').value,
            payment_method: document.getElementById('payment-method').value,
            transport_service: document.getElementById('transport-service').checked,
            transport_value: parseFloat(document.getElementById('transport-value').value) || 0,
            bath_service: document.getElementById('bath-service').checked,
            bath_value: parseFloat(document.getElementById('bath-value').value) || 0,
            status: 'ATIVA'
        };

        const d1 = new Date(data.checkin_date);
        const d2 = new Date(data.checkout_date);
        data.total_days = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
        data.total_value = (data.total_days * data.daily_rate) + data.transport_value + data.bath_value;

        if (this.currentReservationId) await db.updateReservation(this.currentReservationId, data);
        else await db.addReservation(data);
        
        window.hotelPetApp.closeAllModals();
        this.loadReservations();
    }

    applyFilters() {
        const s = document.getElementById('reservation-search').value.toLowerCase();
        const status = document.getElementById('status-filter').value;
        const filtered = this.reservations.filter(r => (r.animal_name?.toLowerCase().includes(s) || r.tutor_name?.toLowerCase().includes(s)) && (!status || r.status === status));
        this.renderReservationsList(filtered);
    }

    renderReservationsList(data) {
        const container = document.querySelector('#reservations .table-container');
        if (!container) return;
        container.innerHTML = `<div id="reservations-list-cards" class="reservations-list-cards"></div>`;
        const listContainer = document.getElementById('reservations-list-cards');
        if (data.length === 0) { listContainer.innerHTML = '<p style="text-align:center; padding:2rem; color:#64748b;">Nenhuma reserva encontrada.</p>'; return; }
        listContainer.innerHTML = data.map(r => `
            <div class="reservation-card" onclick="window.reservationsManager.openDetailModal(${r.id})">
                <div class="card-header">
                    <div class="animal-info-summary">
                        <div class="animal-thumb"><img src="${r.photo_url || ''}" onerror="this.style.display='none'"></div>
                        <div class="text-info"><strong class="animal-name">${r.animal_name}</strong><span class="tutor-name">Tutor: ${r.tutor_name}</span></div>
                    </div>
                    <div class="status-and-actions"><span class="status-badge ${r.status.toLowerCase()}">${r.status}</span></div>
                </div>
                <div class="card-details">
                    <div class="detail-item"><i class="fas fa-home"></i><span>${r.accommodation_type} ${r.kennel_number}</span></div>
                    <div class="detail-item"><i class="fas fa-calendar-alt"></i><span>${this.formatDate(r.checkin_date)} - ${this.formatDate(r.checkout_date)}</span></div>
                    <div class="detail-item"><i class="fas fa-dollar-sign"></i><strong>${this.formatCurrency(r.total_value)}</strong></div>
                </div>
            </div>
        `).join('');
    }

    createDetailModal() {
        if (document.getElementById('reservation-detail-modal')) return;
        const modalHTML = `
            <div id="reservation-detail-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header"><h3>Detalhes da Reserva</h3><button class="close-modal">&times;</button></div>
                    <div id="detail-content" class="detail-content"></div>
                    <div class="detail-actions">
                        <button class="btn btn-secondary" id="detail-edit-btn"><i class="fas fa-edit"></i> Editar</button>
                        <button class="btn btn-success" id="detail-whatsapp-btn"><i class="fab fa-whatsapp"></i> Compartilhar</button>
                        <button class="btn btn-danger" id="detail-finalize-btn"><i class="fas fa-check-circle"></i> Finalizar Agora</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.getElementById('detail-edit-btn')?.addEventListener('click', () => this.handleDetailAction('edit'));
        document.getElementById('detail-whatsapp-btn')?.addEventListener('click', () => this.handleDetailAction('whatsapp'));
        document.getElementById('detail-finalize-btn')?.addEventListener('click', () => this.handleDetailAction('finalize'));
    }

    async openDetailModal(id) {
        const res = await db.getReservationById(id);
        if (!res) return;
        this.currentReservationId = id;
        const content = document.getElementById('detail-content');
        content.innerHTML = `
            <div class="detail-profile-summary">
                <div class="detail-photo-area"><img src="${res.photo_url || ''}" class="detail-photo"></div>
                <div class="detail-info-main"><h3>${res.animal_name}</h3><p>Tutor: <strong>${res.tutor_name}</strong></p><span class="status-badge ${res.status.toLowerCase()}">${res.status}</span></div>
            </div>
            <div class="detail-grid">
                <div class="detail-item"><span class="label">Entrada:</span><span class="value">${this.formatDate(res.checkin_date)}</span></div>
                <div class="detail-item"><span class="label">Saída Prevista:</span><span class="value">${this.formatDate(res.checkout_date)}</span></div>
                <div class="detail-item"><span class="label">Diárias:</span><span class="value">${res.total_days}</span></div>
                <div class="detail-item"><span class="label">Alojamento:</span><span class="value">${res.accommodation_type} ${res.kennel_number}</span></div>
            </div>
            <div class="detail-total"><span class="label">VALOR TOTAL:</span><span class="value">${this.formatCurrency(res.total_value)}</span></div>
        `;
        document.getElementById('detail-finalize-btn').style.display = res.status === 'ATIVA' ? 'inline-flex' : 'none';
        document.getElementById('reservation-detail-modal').classList.add('active');
    }

    closeDetailModal() { document.getElementById('reservation-detail-modal')?.classList.remove('active'); }

    handleDetailAction(action) {
        if (action === 'edit') this.editReservation(this.currentReservationId);
        else if (action === 'finalize') this.finalizeReservation(this.currentReservationId);
        else if (action === 'whatsapp') this.shareReceipt(this.currentReservationId);
    }

    // Lógica de encerramento antecipado solicitada
    async finalizeReservation(id) {
        const res = await db.getReservationById(id);
        const today = new Date().toISOString().split('T')[0];
        let infoMessage = 'Deseja finalizar esta reserva?';
        let updatedRes = { ...res };

        if (today < res.checkout_date && today >= res.checkin_date) {
            const d1 = new Date(res.checkin_date);
            const d2 = new Date(today);
            const actualDays = Math.max(1, Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)));
            const newValue = (actualDays * res.daily_rate) + (res.transport_service ? res.transport_value : 0) + (res.bath_service ? res.bath_value : 0);
            infoMessage = `ENCERRAMENTO ANTECIPADO DETECTADO!\n\n` +
                          `Período Original: ${res.total_days} dias (${this.formatCurrency(res.total_value)})\n` +
                          `Período Realizado: ${actualDays} dias\n` +
                          `Novo Valor Total: ${this.formatCurrency(newValue)}\n\n` +
                          `Deseja confirmar o desconto e finalizar?`;
            
            updatedRes.total_days = actualDays;
            updatedRes.checkout_date = today;
            updatedRes.total_value = newValue;
        }

        if (confirm(infoMessage)) {
            updatedRes.status = 'FINALIZADA';
            await db.updateReservation(id, updatedRes);
            await db.addAnimalHistory({
                animal_id: res.animal_id,
                type: 'HOSPEDAGEM',
                date: today,
                description: `Reserva encerrada. Permanência: ${updatedRes.total_days} dias. Valor pago: ${this.formatCurrency(updatedRes.total_value)}.`
            });
            window.hotelPetApp.showNotification('Reserva finalizada com sucesso!', 'success');
            this.closeDetailModal();
            this.loadReservations();
            if (window.kennelVisualization) window.kennelVisualization.refresh();
        }
    }

    async shareReceipt(id) {
        const res = await db.getReservationById(id);
        if (!res) return;

        // 1. Abrir diálogo de impressão para gerar PDF (conforme solicitado "em pdf")
        // O usuário pode escolher "Salvar como PDF" na impressora do sistema.
        if (window.printReceipt) window.printReceipt(id);

        // 2. Preparar mensagem formatada para WhatsApp
        const cleanPhone = res.tutor_phone ? res.tutor_phone.replace(/\D/g, '') : '';
        const message = encodeURIComponent(
            `*RECIBO DE HOSPEDAGEM - HOTEL PET CÁ*\n` +
            `Aqui seu pet é bem cuidado.\n\n` +
            `🐾 *Pet:* ${res.animal_name}\n` +
            `👤 *Tutor:* ${res.tutor_name}\n` +
            `🏠 *Alojamento:* ${res.accommodation_type} ${res.kennel_number}\n` +
            `📅 *Entrada:* ${this.formatDate(res.checkin_date)}\n` +
            `📅 *Saída:* ${this.formatDate(res.checkout_date)}\n` +
            `⏳ *Diárias:* ${res.total_days}\n` +
            `💰 *Valor Total:* ${this.formatCurrency(res.total_value)}\n\n` +
            `*Status:* ${res.status === 'FINALIZADA' ? '✅ PAGO E ENCERRADO' : '⏳ EM ANDAMENTO'}\n\n` +
            `Obrigado pela confiança!`
        );

        if (cleanPhone) window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
        else window.hotelPetApp.showNotification('WhatsApp enviado, mas tutor sem telefone cadastrado.', 'info');
    }
}
window.ReservationsManager = ReservationsManager;