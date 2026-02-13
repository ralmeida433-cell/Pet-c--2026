class NotificationService {
    constructor() {
        this.notifications = [];
        this.isInitialized = false;
        this.mobileDropdown = null;
        this.desktopDropdown = null;
    }

    init() {
        if (this.isInitialized) return;
        this.bindEvents();
        this.checkNotifications();
        // Check every 1 hour
        setInterval(() => this.checkNotifications(), 3600000);
        this.isInitialized = true;
    }

    bindEvents() {

        // Support multiple notification buttons (desktop & mobile)
        const btns = document.querySelectorAll('.header-notification-btn');
        // We do not cache dropdown here, we find it dynamically

        btns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Find relative dropdown inside closest wrapper
                const wrapper = btn.closest('.notification-wrapper');
                const dropdown = wrapper ? wrapper.querySelector('.notification-dropdown') : null;

                if (dropdown) {
                    const isActive = dropdown.classList.contains('active');

                    // Close ALL other dropdowns
                    document.querySelectorAll('.notification-dropdown').forEach(d => {
                        if (d !== dropdown) d.classList.remove('active');
                    });

                    if (isActive) {
                        dropdown.classList.remove('active');
                    } else {
                        dropdown.classList.add('active');
                        this.markAllAsRead();
                    }
                }
            });
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.notification-wrapper') && !e.target.closest('.header-notification-btn')) {
                document.querySelectorAll('.notification-dropdown').forEach(d => d.classList.remove('active'));
            }
        });

        // Handle Clear Buttons (multiple)
        const clearBtns = document.querySelectorAll('.btn-clear-notifications');
        clearBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.notifications = [];
                this.renderNotifications();
                this.updateBadge(); // Update all badges
            });
        });
    }

    async checkNotifications() {
        this.notifications = [];

        // 1. Check Reservations ending today
        if (window.db) {
            const today = new Date().toISOString().split('T')[0];
            const reservations = await window.db.getReservations('', 'ATIVA');

            reservations.forEach(res => {
                if (res.checkout_date === today) {
                    this.notifications.push({
                        id: 'res-' + res.id,
                        type: 'reserva',
                        title: 'Checkout Hoje',
                        message: `O pet <strong>${res.animal_name}</strong> libera a acomodação hoje.`,
                        time: 'Hoje',
                        action: () => window.navigateToSection('reservations'),
                        unread: true
                    });
                }
            });

            // 2. Check Vaccines due or coming soon
            const animals = await window.db.getAnimals();
            for (const animal of animals) {
                const history = await window.db.getAnimalHistory(animal.id);
                const vaccines = history.filter(h => h.type === 'VACINAÇÃO');

                vaccines.forEach(vac => {
                    let v = {};
                    try { v = JSON.parse(vac.description); } catch (e) { }
                    if (v.nextDate) {
                        const nextDate = new Date(v.nextDate + 'T12:00:00');
                        const now = new Date();
                        const diffDays = Math.ceil((nextDate - now) / (1000 * 60 * 60 * 24));

                        if (diffDays <= 7 && diffDays >= 0) {
                            this.notifications.push({
                                id: 'vac-' + vac.id,
                                type: 'vacina',
                                title: 'Retorno de Vacina',
                                message: `<strong>${animal.name}</strong> precisa do reforço de <strong>${v.name}</strong> em ${diffDays} dias.`,
                                time: nextDate.toLocaleDateString('pt-BR'),
                                action: () => {
                                    window.hotelPetApp.navigateToSection('animal-profile');
                                    window.animalProfileManager.loadProfile(animal.id);
                                },
                                unread: true
                            });
                        } else if (diffDays < 0 && diffDays > -30) {
                            this.notifications.push({
                                id: 'vac-' + vac.id,
                                type: 'vacina',
                                title: 'VACINA VENCIDA!',
                                message: `O reforço de <strong>${v.name}</strong> para <strong>${animal.name}</strong> está atrasado.`,
                                time: nextDate.toLocaleDateString('pt-BR'),
                                action: () => {
                                    window.hotelPetApp.navigateToSection('animal-profile');
                                    window.animalProfileManager.loadProfile(animal.id);
                                },
                                unread: true
                            });
                        }
                    }
                });
            }
        }

        this.renderNotifications();
        this.updateBadge();
    }

    renderNotifications() {
        const lists = document.querySelectorAll('.notification-list');
        if (lists.length === 0) return;

        lists.forEach(list => {
            if (this.notifications.length === 0) {
                list.innerHTML = '<p class="empty-notifications">Nenhuma notificação no momento.</p>';
            } else {
                list.innerHTML = this.notifications.map(n => `
            <div class="notification-item ${n.unread ? 'unread' : ''}" onclick="window.notificationService.handleAction('${n.id}')">
                <div class="notification-icon ${n.type}">
                    <i class="fas ${n.type === 'vacina' ? 'fa-syringe' : n.type === 'reserva' ? 'fa-calendar-day' : 'fa-bell'}"></i>
                </div>
                <div class="notification-content">
                    <p>${n.message}</p>
                    <span class="notification-time">${n.time}</span>
                </div>
            </div>
        `).join('');
            }
        });
    }


    handleAction(id) {
        const n = this.notifications.find(notif => notif.id === id);
        if (n && n.action) {
            n.unread = false;
            this.updateBadge();
            n.action();
            document.getElementById('notification-dropdown')?.classList.remove('active');

            // Se for reserva, tenta filtrar pelo nome do pet
            if (n.type === 'reserva') {
                const petName = n.message.match(/<strong>(.*?)<\/strong>/)[1];
                setTimeout(() => {
                    const searchInput = document.getElementById('reservation-search');
                    if (searchInput) {
                        searchInput.value = petName;
                        window.reservationsManager.applyFilters();
                    }
                }, 500);
            }
        }
    }

    markAllAsRead() {
        this.notifications.forEach(n => n.unread = false);
        this.updateBadge();
        // Delay render to keep highlight while looking
        setTimeout(() => this.renderNotifications(), 1000);
    }

    updateBadge() {
        const count = this.notifications.filter(n => n.unread).length;
        const badges = document.querySelectorAll('.notification-badge');

        badges.forEach(badge => {
            badge.innerText = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        });
    }
}

window.notificationService = new NotificationService();
