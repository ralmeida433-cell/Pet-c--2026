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
    }

    init() {
        if (this.isInitialized) return;
        this.bindEvents();
        this.createDetailModal();
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
        document.getElementById('date-search-filter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('show-finished-cb')?.addEventListener('change', () => this.applyFilters());

        // Novo evento para expandir/retrair o card de reserva
        document.addEventListener('click', (e) => {
            const header = e.target.closest('.reservation-card-header');
            if (header) {
                const card = header.closest('.reservation-card');
                card.classList.toggle('expanded');
            }
        });

        // Eventos do Modal de Checkout
        const checkoutModal = document.getElementById('checkout-modal');
        if (checkoutModal) {
            // Fechar no X
            checkoutModal.querySelector('.close-modal')?.addEventListener('click', () => checkoutModal.classList.remove('active'));
            // Fechar no Botão Cancelar
            checkoutModal.querySelector('.close-modal-btn')?.addEventListener('click', () => checkoutModal.classList.remove('active'));
            // Fechar ao clicar fora
            window.addEventListener('click', (e) => {
                if (e.target === checkoutModal) checkoutModal.classList.remove('active');
            });
        }
    }

    updateAvailability() {
        const type = document.getElementById('reservation-accommodation-type').value;
        if (type) this.populateKennelNumbers(type);
        this.calculateTotalDays();
    }

    async loadReservations() {
        if (!window.db || !window.db.isInitialized) return;
        this.reservations = await db.getReservations();

        // Proteção contra autocomplete do navegador que "vandaliza" o filtro
        const searchInput = document.getElementById('reservation-search');
        if (searchInput && (searchInput.value.includes('@') || searchInput.getAttribute('autocomplete') !== 'off')) {
            if (searchInput.value.includes('@')) searchInput.value = '';
            searchInput.setAttribute('autocomplete', 'off');
        }

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

        const currentValue = select.value; // Salvar seleção atual

        // Normalização agressiva para garantir match (remove acentos e uppercase)
        const normalize = (str) => str ? str.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
        const safeSpecies = normalize(species);

        let compatibleTypes = Object.entries(this.accommodationTypes)
            .filter(([type, info]) => {
                const target = normalize(info.species);
                return target === safeSpecies || (safeSpecies === 'CAO' && target === 'CAO') || (safeSpecies === 'GATO' && target === 'GATO');
            })
            .map(([type]) => type);

        if (compatibleTypes.length === 0) {
            console.warn(`Espécie '${species}' não mapeada automaticamente. Exibindo todas as opções.`);
            compatibleTypes = Object.keys(this.accommodationTypes);
        }

        select.innerHTML = '<option value="">Selecione</option>';
        compatibleTypes.forEach(type => {
            select.innerHTML += `<option value="${type}">${type === 'GATIL' ? 'Gatil' : 'Canil ' + type.toLowerCase()}</option>`;
        });

        // Tentar restaurar a seleção anterior se ainda for válida
        if (currentValue && compatibleTypes.includes(currentValue)) {
            select.value = currentValue;
        } else {
            // Se mudou a espécie e o tipo antigo não serve mais, reseta o número
            const numSelect = document.getElementById('reservation-kennel-number');
            if (numSelect) {
                numSelect.innerHTML = '<option value="">Escolha o número</option>';
                numSelect.disabled = true;
            }
        }
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
                // Permite se for o currentKennel (edição) OU se for o número passado via preenchimento (overview)
                // currentKennel pode ser string ou int, normalizar comparação
                const isSelected = currentKennel && kennel.number == currentKennel;

                // Se estiver ocupado, mas for o selecionado (edição ou forçado), permite.
                // Mas na NOVA reserva via overview, se estiver ocupado, deve avisar?
                // A visão geral só mostra botão + se estiver livre, então teoria ok.
                const isDisabled = isOccupied && !isSelected;

                options += `<option value="${kennel.number}" ${isDisabled ? 'disabled' : ''} ${isSelected ? 'selected' : ''}>
                    ${accommodationType} ${kennel.number} ${isDisabled ? '(Ocupado)' : '(Livre)'}
                </option>`;
            });

            kennelSelect.innerHTML = options;
            kennelSelect.disabled = false;
        } catch (e) { console.error(e); }
    }

    calculateTotalDays() {
        const d1 = new Date(document.getElementById('checkin-date').value + 'T00:00:00');
        const d2 = new Date(document.getElementById('checkout-date').value + 'T00:00:00');
        if (d1 && d2 && d2 > d1) {
            this.calculateTotalValue();
        }
    }

    calculateTotalValue() {
        const d1 = new Date(document.getElementById('checkin-date').value + 'T00:00:00');
        const d2 = new Date(document.getElementById('checkout-date').value + 'T00:00:00');
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

    async openReservationModal(data = null) {
        const modal = document.getElementById('reservation-modal');
        const form = document.getElementById('reservation-form');
        if (!modal || !form) return;

        form.reset();
        this.currentReservationId = null;

        // 1. Popular Tipos de Alojamento INICIALMENTE (Evita travamento "Selecione animal primeiro")
        const typeSelect = document.getElementById('reservation-accommodation-type');
        if (typeSelect) {
            typeSelect.innerHTML = '<option value="">Selecione</option>';
            Object.keys(this.accommodationTypes).forEach(type => {
                typeSelect.innerHTML += `<option value="${type}">${type === 'GATIL' ? 'Gatil' : 'Canil ' + type.toLowerCase()}</option>`;
            });
        }

        // 2. Carregar lista de animais
        await this.loadAnimalsDropdown();

        document.getElementById('transport-value').disabled = true;
        document.getElementById('bath-value').disabled = true;
        document.getElementById('total-value').value = this.formatCurrency(0);

        const modalTitle = document.getElementById('reservation-modal-title');
        if (modalTitle) modalTitle.textContent = 'Nova Reserva';

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        document.getElementById('checkin-date').valueAsDate = today;
        document.getElementById('checkout-date').valueAsDate = tomorrow;

        // 3. Aplicar dados da Visão Geral (se houver)
        if (data && data.tipo && data.numero) {
            console.log('Preenchendo reserva:', data);
            if (typeSelect) typeSelect.value = data.tipo;

            // Popula números e seleciona
            await this.populateKennelNumbers(data.tipo, data.numero);

            const numSelect = document.getElementById('reservation-kennel-number');
            if (numSelect) numSelect.value = data.numero;
        } else {
            // Reset visual apenas
            if (typeSelect) typeSelect.value = "";
            const numSelect = document.getElementById('reservation-kennel-number');
            if (numSelect) {
                numSelect.innerHTML = '<option value="">Escolha o número</option>';
                numSelect.disabled = true;
            }
        }

        this.calculateTotalValue();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    async editReservation(id) {
        const res = await db.getReservationById(id);
        if (!res) return;
        this.currentReservationId = id;
        const modal = document.getElementById('reservation-modal');

        const modalTitle = document.getElementById('reservation-modal-title');
        if (modalTitle) {
            modalTitle.textContent = 'Editar Reserva';
        }

        await this.loadAnimalsDropdown();
        document.getElementById('reservation-animal').value = res.animal_id;
        this.filterAccommodationBySpecies(res.animal_species);
        document.getElementById('reservation-accommodation-type').value = res.accommodation_type;
        document.getElementById('daily-rate').value = res.daily_rate;
        document.getElementById('checkin-date').value = res.checkin_date;
        document.getElementById('checkout-date').value = res.checkout_date;
        document.getElementById('payment-method').value = res.payment_method;

        // Verifica se os elementos de serviço existem antes de acessar
        const transportService = document.getElementById('transport-service');
        const transportValue = document.getElementById('transport-value');
        const bathService = document.getElementById('bath-service');
        const bathValue = document.getElementById('bath-value');

        if (transportService) {
            transportService.checked = res.transport_service;
        }
        if (transportValue) {
            transportValue.value = res.transport_value || '';
            transportValue.disabled = !res.transport_service;
        }
        if (bathService) {
            bathService.checked = res.bath_service;
        }
        if (bathValue) {
            bathValue.value = res.bath_value || '';
            bathValue.disabled = !res.bath_service;
        }

        await this.populateKennelNumbers(res.accommodation_type, res.kennel_number);
        document.getElementById('reservation-kennel-number').value = res.kennel_number;
        this.calculateTotalValue();

        // Adicionar botão de "Finalizar Agora" se a reserva estiver ATIVA
        const footer = modal.querySelector('.form-actions');
        // Remover botão anterior se houver para evitar duplicatas
        const oldBtn = document.getElementById('btn-modal-finalize');
        if (oldBtn) oldBtn.remove();

        if (res.status === 'ATIVA') {
            const btnFinalize = document.createElement('button');
            btnFinalize.type = 'button';
            btnFinalize.id = 'btn-modal-finalize';
            btnFinalize.className = 'btn btn-danger';
            btnFinalize.innerHTML = '<i class="fas fa-check-circle"></i> Finalizar Agora';
            btnFinalize.style.marginLeft = 'auto'; // Empurrar para direita
            btnFinalize.onclick = () => this.finalizeReservation(id);
            footer.insertBefore(btnFinalize, footer.firstChild);
        }

        modal.classList.add('active');
        this.closeDetailModal();
    }

    async saveReservation() {
        const animalId = document.getElementById('reservation-animal').value;
        const accommodationType = document.getElementById('reservation-accommodation-type').value;
        const kennelNumber = document.getElementById('reservation-kennel-number').value;
        const dailyRateStr = document.getElementById('daily-rate').value;
        const checkinDate = document.getElementById('checkin-date').value;
        const checkoutDate = document.getElementById('checkout-date').value;
        const paymentMethod = document.getElementById('payment-method').value;

        // Validação obrigatória
        if (!animalId || !accommodationType || !kennelNumber || !dailyRateStr || !checkinDate || !checkoutDate || !paymentMethod) {
            window.hotelPetApp.showNotification('Preencha todos os campos obrigatórios (*)', 'warning');
            return;
        }

        const data = {
            animal_id: animalId,
            accommodation_type: accommodationType,
            kennel_number: kennelNumber,
            daily_rate: parseFloat(dailyRateStr),
            checkin_date: checkinDate,
            checkout_date: checkoutDate,
            payment_method: paymentMethod,
            transport_service: document.getElementById('transport-service')?.checked || false,
            transport_value: parseFloat(document.getElementById('transport-value')?.value) || 0,
            bath_service: document.getElementById('bath-service')?.checked || false,
            bath_value: parseFloat(document.getElementById('bath-value')?.value) || 0,
            status: 'ATIVA'
        };

        const d1 = new Date(data.checkin_date + 'T00:00:00');
        const d2 = new Date(data.checkout_date + 'T00:00:00');
        data.total_days = Math.max(1, Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)));
        data.total_value = (data.total_days * data.daily_rate) + data.transport_value + data.bath_value;

        window.hotelPetApp.showLoading();
        try {
            if (this.currentReservationId) {
                await db.updateReservation(this.currentReservationId, data);
                window.hotelPetApp.showNotification('Reserva atualizada!', 'success');
            } else {
                await db.addReservation(data);
                window.hotelPetApp.showNotification('Reserva salva com sucesso!', 'success');
            }

            if (document.getElementById('whatsapp-receipt')?.checked) {
                const reservations = await db.getReservations();
                const targetRes = this.currentReservationId ? reservations.find(r => r.id == this.currentReservationId) : reservations[0];
                if (targetRes) this.shareReceipt(targetRes.id);
            }

            window.hotelPetApp.closeAllModals();
            await this.loadReservations();
            if (window.kennelVisualization) window.kennelVisualization.refresh();
        } catch (e) {
            window.hotelPetApp.showNotification('Erro ao salvar: ' + e.message, 'error');
        } finally {
            window.hotelPetApp.hideLoading();
        }
    }

    applyFilters() {
        // Usando optional chaining e nullish coalescing para evitar erros se os elementos não existirem
        const s = document.getElementById('reservation-search')?.value?.toLowerCase() || '';
        const searchDate = document.getElementById('date-search-filter')?.value || '';
        const showFinished = document.getElementById('show-finished-cb')?.checked || false;

        const filtered = this.reservations.filter(r => {
            const matchesSearch = r.animal_name?.toLowerCase().includes(s) || r.tutor_name?.toLowerCase().includes(s);

            // Filtro de Status: Se checkbox marcado, mostra tudo. Se não, só ATIVA.
            const matchesStatus = showFinished ? true : r.status === 'ATIVA';

            // Filtro de Data: Se data selecionada, verifica se ela está dentro do período da reserva
            let matchesDate = true;
            if (searchDate) {
                matchesDate = (searchDate >= r.checkin_date && searchDate <= r.checkout_date);
            }

            return matchesSearch && matchesStatus && matchesDate;
        });

        // Ordenação: 
        // 1. Status 'ATIVA' primeiro
        // 2. Cronológica (Data de Check-in)
        filtered.sort((a, b) => {
            // Prioridade para ATIVA
            if (a.status === 'ATIVA' && b.status !== 'ATIVA') return -1;
            if (a.status !== 'ATIVA' && b.status === 'ATIVA') return 1;

            // Se mesmo status, ordena por data cronológica (mais antiga -> mais nova ou vice-versa?)
            // "das mais recentes ativas seguindo ordem cronologica as finalizadas"
            // Interpretação: Ativas (Mais próxima do checkin ou do checkout?)
            // Geralmente agenda futura: Checkin Crescente. Histórico: Checkin Decrescente.

            // Vamos adotar Checkin Decrescente (Mais recente primeiro) para ambas como padrão de UI moderno
            return new Date(b.checkin_date) - new Date(a.checkin_date);
        });

        this.renderReservationsList(filtered);
    }

    renderReservationsList(data) {
        const container = document.querySelector('#reservations .table-container');
        if (!container) return;

        // Substitui a tabela por um container de cards
        container.innerHTML = `<div id="reservations-list-cards" class="reservations-list-cards"></div>`;
        const listContainer = document.getElementById('reservations-list-cards');

        if (data.length === 0) {
            const hasFilter = document.getElementById('reservation-search')?.value || document.getElementById('date-search-filter')?.value;
            listContainer.innerHTML = `
                <div class="empty-results-container">
                    <i class="fas fa-search-minus fa-3x" style="color: #cbd5e1; margin-bottom: 1rem;"></i>
                    <p style="font-weight: 600; color: #64748b;">${hasFilter ? 'Nenhuma reserva corresponde à sua busca.' : 'Nenhuma reserva encontrada.'}</p>
                    ${hasFilter ? `<button class="btn btn-sm btn-outline-primary" style="margin-top: 1rem;" onclick="document.getElementById('reservation-search').value = ''; document.getElementById('date-search-filter').value = ''; window.reservationsManager.applyFilters();">Limpar todos os filtros</button>` : ''}
                </div>
            `;
            return;
        }

        listContainer.innerHTML = data.map(r => `
            <div class="reservation-card ${r.status.toLowerCase()}">
                <div class="reservation-card-header">
                    <div class="res-pet-info">
                        <div class="res-pet-avatar" style="position: relative; width: 45px; height: 45px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); flex-shrink: 0;">
                            ${r.photo_url && r.photo_url.length > 10
                ? `<img src="${r.photo_url}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 2;" onload="this.style.display='block'; this.parentElement.querySelector('.res-pet-fallback').style.display='none'" onerror="this.style.display='none'; this.parentElement.querySelector('.res-pet-fallback').style.display='flex'">`
                : ''}
                            <div class="res-pet-fallback" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; z-index: 1;">
                                <i class="fas fa-paw" style="font-size: 1.2rem;"></i>
                            </div>
                        </div>
                        <div class="res-pet-text">
                            <strong>${r.animal_name}</strong>
                            <span class="tutor-name">Tutor: ${r.tutor_name}</span>
                        </div>
                    </div>
                    <div class="res-status-group">
                        <span class="status-badge ${r.status.toLowerCase()}">${r.status}</span>
                        <i class="fas fa-chevron-down res-expand-icon"></i>
                    </div>
                </div>
                <div class="reservation-card-details">
                    <div class="detail-grid">
                        <div class="detail-item"><span class="label"><i class="fas fa-home"></i> Alojamento:</span><span class="value">${r.accommodation_type} ${r.kennel_number}</span></div>
                        <div class="detail-item"><span class="label"><i class="fas fa-calendar-alt"></i> Check-in:</span><span class="value">${this.formatDate(r.checkin_date)}</span></div>
                        <div class="detail-item"><span class="label"><i class="fas fa-calendar-alt"></i> Check-out:</span><span class="value">${this.formatDate(r.checkout_date)}</span></div>
                        <div class="detail-item"><span class="label"><i class="fas fa-clock"></i> Diárias:</span><span class="value">${r.total_days}</span></div>
                        <div class="detail-item"><span class="label"><i class="fas fa-money-bill-wave"></i> Diária:</span><span class="value">${this.formatCurrency(r.daily_rate)}</span></div>
                        <div class="detail-item"><span class="label"><i class="fas fa-credit-card"></i> Pagamento:</span><span class="value">${r.payment_method}</span></div>
                        <div class="detail-item total-row"><span class="label">TOTAL:</span><span class="value highlight">${this.formatCurrency(r.total_value)}</span></div>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); window.reservationsManager.editReservation(${r.id})"><i class="fas fa-pen"></i> Editar</button>
                        <button class="btn btn-success btn-sm" onclick="event.stopPropagation(); window.reservationsManager.shareReceipt(${r.id})"><i class="fab fa-whatsapp"></i> Recibo</button>
                        ${r.status === 'ATIVA' ? `<button class="btn btn-success btn-sm" style="background-color: #10b981; border-color: #10b981;" onclick="event.stopPropagation(); window.reservationsManager.openFinishReservationModal(${r.id})"><i class="fas fa-check-circle"></i> Finalizar</button>` : ''}
                        ${r.status === 'FINALIZADA' ? `<button class="btn btn-vac-delete" style="width:auto; padding:0 1rem; background:#fee2e2; color:#ef4444; border:none;" onclick="event.stopPropagation(); window.reservationsManager.deleteReservation(${r.id})"><i class="fas fa-trash-alt"></i> Excluir</button>` : ''} 
                    </div>
                </div>
            </div>
        `).join('');
    }

    createDetailModal() {
        // Modal antigo removido/mantido vazio se necessário para compatibilidade, 
        // mas a lógica agora usa cards expansíveis e o novo checkout-modal no HTML
        if (document.getElementById('reservation-detail-modal')) return;
        // Inserimos o modal de detalhes apenas se necessário, mas os botões agora ficam no card
    }

    // Método alias para compatibilidade com o botão antigo se houver
    finalizeReservation(id) {
        this.openFinishReservationModal(id);
    }

    async openDetailModal(id) {
        // Este modal de detalhes não será mais usado, pois a expansão é inline no card.
        // Mantendo a função para compatibilidade, mas o renderReservationsList agora usa a expansão direta.
        // Se o usuário clicar no card, ele expande/retrai.
        const card = document.querySelector(`.reservation-card[data-reservation-id="${id}"]`);
        if (card) card.classList.toggle('expanded');
    }

    closeDetailModal() { document.getElementById('reservation-detail-modal')?.classList.remove('active'); }

    handleDetailAction(action) {
        if (action === 'edit') this.editReservation(this.currentReservationId);
        else if (action === 'finalize') this.finalizeReservation(this.currentReservationId);
        else if (action === 'whatsapp') this.shareReceipt(this.currentReservationId);
    }

    async openFinishReservationModal(id) {
        const res = await db.getReservationById(id);
        if (!res) return;

        const modal = document.getElementById('checkout-modal');
        const today = new Date().toISOString().split('T')[0];

        let days = res.total_days;
        let totalValue = res.total_value;
        let isEarly = false;

        // Cálculo de Encerramento Antecipado
        if (today < res.checkout_date && today >= res.checkin_date) {
            const d1 = new Date(res.checkin_date + 'T00:00:00');
            const d2 = new Date(today + 'T00:00:00');
            const actualDays = Math.max(1, Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)));

            // Recalcula total com serviços extras
            const extras = (res.transport_service ? res.transport_value : 0) + (res.bath_service ? res.bath_value : 0);
            const newValue = (actualDays * res.daily_rate) + extras;

            days = actualDays;
            totalValue = newValue;
            isEarly = true;
        }

        // Atualiza UI do Modal
        document.getElementById('checkout-days').innerText = days;
        document.getElementById('checkout-date-display').innerText = this.formatDate(today);
        document.getElementById('checkout-total').innerText = this.formatCurrency(totalValue);

        const warning = document.getElementById('early-checkout-warning');
        if (warning) warning.style.display = isEarly ? 'block' : 'none';

        // Configura botão de confirmação
        const confirmBtn = document.getElementById('confirm-checkout-btn');
        confirmBtn.onclick = () => {
            // Cria objeto atualizado
            const updatedRes = { ...res };
            if (isEarly) {
                updatedRes.total_days = days;
                updatedRes.checkout_date = today;
                updatedRes.total_value = totalValue;
            }
            updatedRes.status = 'FINALIZADA';

            this.processFinalization(id, updatedRes, days, totalValue);
            modal.classList.remove('active');
        };

        modal.classList.add('active');
    }

    async processFinalization(id, updatedRes, days, totalValue) {
        window.hotelPetApp.showLoading();
        try {
            await db.updateReservation(id, updatedRes);
            const today = new Date().toISOString().split('T')[0];

            await db.addAnimalHistory({
                animal_id: updatedRes.animal_id,
                type: 'HOSPEDAGEM',
                date: today,
                description: `Reserva finalizada. Dias: ${days}. Valor: ${this.formatCurrency(totalValue)}.`
            });

            window.hotelPetApp.showNotification('Reserva finalizada com sucesso!', 'success');
            await this.loadReservations();
            if (window.kennelVisualization) window.kennelVisualization.refresh();
        } catch (e) {
            window.hotelPetApp.showNotification('Erro ao finalizar: ' + e.message, 'error');
        } finally {
            window.hotelPetApp.hideLoading();
        }
    }

    async shareReceipt(id) {
        const res = await db.getReservationById(id);
        if (!res) return;

        // Abrir diálogo de impressão (Salvar PDF)
        if (window.printReceipt) window.printReceipt(id);

        const cleanPhone = res.tutor_phone ? res.tutor_phone.replace(/\D/g, '') : '';
        const message = encodeURIComponent(
            `*RECIBO - HOTEL PET CÁ*\n` +
            `Aqui seu pet é bem cuidado.\n\n` +
            `🐾 *Pet:* ${res.animal_name}\n` +
            `👤 *Tutor:* ${res.tutor_name}\n` +
            `🏠 *Alojamento:* ${res.accommodation_type} ${res.kennel_number}\n` +
            `📅 *Período:* ${this.formatDate(res.checkin_date)} até ${this.formatDate(res.checkout_date)}\n` +
            `⏳ *Dias:* ${res.total_days}\n` +
            `💰 *Total:* ${this.formatCurrency(res.total_value)}\n` +
            `💳 *Pgto:* ${res.payment_method}\n\n` +
            `*Status:* ${res.status === 'FINALIZADA' ? '✅ PAGO' : '⏳ ATIVO'}`
        );

        if (cleanPhone) window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
        else window.hotelPetApp.showNotification('Tutor sem telefone cadastrado.', 'info');
    }

    async deleteReservation(id) {
        if (confirm('Tem certeza que deseja excluir permanentemente este registro de reserva finalizada? O histórico financeiro será afetado.')) {
            await db.deleteReservation(id);
            window.hotelPetApp.showNotification('Reserva excluída.', 'success');
            await this.loadReservations();
        }
    }
}
window.ReservationsManager = ReservationsManager;