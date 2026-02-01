class HotelPetApp {
    constructor() {
        this.currentSection = 'overview';
        this.isInitialized = false;
        this.managers = {};
        this.history = [];
        this.historyIndex = -1;
        this.isNavigatingHistory = false;
        this.init();
    }

    async init() {
        try {
            this.showLoading();
            await this.initializeNativeBridge();
            await this.initializeDatabase();
            this.initializeManagers();
            this.bindGlobalEvents();
            await this.loadInitialSection();
            this.hideLoading();
            this.isInitialized = true;
            if (window.Capacitor?.isNativePlatform()) {
                await Capacitor.Plugins.SplashScreen.hide();
            }
        } catch (error) {
            console.error('Error init:', error);
            this.showError('Erro ao inicializar aplicação');
        }
    }

    async initializeNativeBridge() {
        if (window.Capacitor?.isNativePlatform()) {
            const { StatusBar, App } = Capacitor.Plugins;
            try {
                await StatusBar.setBackgroundColor({ color: '#2563eb' });
                await StatusBar.setStyle({ style: 'DARK' });
            } catch (e) {}

            App.addListener('backButton', () => {
                if (document.querySelectorAll('.modal.active').length > 0) {
                    this.closeAllModals();
                } else if (this.currentSection !== 'overview') {
                    this.navigateToSection('overview');
                } else {
                    App.exitApp();
                }
            });
        }
    }

    async initializeDatabase() {
        if (!window.db) throw new Error('Database not available');
        await window.db.init();
    }

    initializeManagers() {
        this.managers.animals = new AnimalsManager();
        this.managers.reservations = new ReservationsManager();
        this.managers.dashboard = new DashboardManager();
        this.managers.reports = new ReportsManager();
        if (typeof InventoryManager !== 'undefined') {
            this.managers.inventory = new InventoryManager();
            window.inventoryManager = this.managers.inventory;
        }
        if (typeof KennelVisualization !== 'undefined') {
            this.managers.kennels = new KennelVisualization();
            window.kennelVisualization = this.managers.kennels;
        }
        window.animalsManager = this.managers.animals;
        window.reservationsManager = this.managers.reservations;
        window.dashboardManager = this.managers.dashboard;
        window.reportsManager = this.managers.reports;
    }

    bindGlobalEvents() {
        this.bindNavigationEvents();
        this.bindResponsiveEvents();
        this.bindKeyboardEvents();
        this.bindNotificationEvents();
        this.bindModalEvents();
        this.initFabMenu();

        // CORREÇÃO: Listener Global para botões de fechar "X"
        document.addEventListener('click', (e) => {
            if (e.target.closest('.close-modal')) {
                this.closeAllModals();
            }
        });
    }

    bindModalEvents() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target);
            }
        });
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal.active');
        modals.forEach(modal => this.closeModal(modal));
    }

    closeModal(modal) {
        if (modal && modal.classList.contains('active')) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            const forms = modal.querySelectorAll('form');
            forms.forEach(form => form.reset());
        }
    }

    async navigateToSection(sectionName, addToHistory = true) {
        if (!this.isInitialized) return;
        if (this.currentSection === sectionName && !this.isNavigatingHistory) return;

        if (addToHistory) {
            if (this.historyIndex < this.history.length - 1) {
                this.history = this.history.slice(0, this.historyIndex + 1);
            }
            if (this.history[this.history.length - 1] !== sectionName) {
                this.history.push(sectionName);
                this.historyIndex++;
            }
        }

        this.updateNavigationControls();
        document.querySelector('.menu-item.active')?.classList.remove('active');
        document.querySelector('.content-section.active')?.classList.remove('active');

        document.querySelector(`[data-section="${sectionName}"]`)?.classList.add('active');
        const newSection = document.getElementById(sectionName);
        if (newSection) newSection.classList.add('active');

        this.updatePageTitle(sectionName);
        await this.loadSectionData(sectionName);
        this.currentSection = sectionName;

        if (window.innerWidth <= 1024) this.closeSidebar();
        window.scrollTo(0, 0);

        const mobileTitle = document.getElementById('mobile-page-title');
        if (mobileTitle) {
            const titles = { overview: 'Visão Geral', dashboard: 'Dashboard', animals: 'Animais', reservations: 'Reservas', inventory: 'Estoque', reports: 'Relatórios' };
            mobileTitle.textContent = titles[sectionName] || 'Hotel Pet CÁ';
        }
    }

    async loadInitialSection() {
        await this.loadSectionData('overview');
        if (this.history.length === 0) {
            this.history.push('overview');
            this.historyIndex = 0;
            this.updateNavigationControls();
        }
    }

    async loadSectionData(sectionName) {
        switch (sectionName) {
            case 'overview': if (this.managers.kennels) await this.managers.kennels.refresh(); break;
            case 'dashboard': if (this.managers.dashboard) await this.managers.dashboard.loadDashboard(); break;
            case 'animals': if (this.managers.animals) await this.managers.animals.loadAnimals(); break;
            case 'reservations': if (this.managers.reservations) { await this.managers.reservations.loadReservations(); await this.managers.reservations.loadAnimalsDropdown(); } break;
            case 'inventory': if (this.managers.inventory) await this.managers.inventory.loadInventory(); break;
            case 'reports': if (this.managers.reports) await this.managers.reports.loadReports(); break;
        }
    }

    updatePageTitle(sectionName) {
        const titles = { overview: 'Visão Geral', dashboard: 'Dashboard', animals: 'Animais', reservations: 'Reservas', inventory: 'Controle de Estoque', reports: 'Relatórios' };
        const pageTitle = document.querySelector('.page-title');
        if (pageTitle) pageTitle.textContent = titles[sectionName] || sectionName;
        document.title = `${titles[sectionName] || sectionName} - Hotel Pet CÁ`;
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        if (sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        } else {
            sidebar.classList.add('open');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeSidebar() {
        document.querySelector('.sidebar').classList.remove('open');
        document.querySelector('.sidebar-overlay').classList.remove('active');
        document.body.style.overflow = '';
    }

    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
                <span>${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.add('removing');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    showLoading() { document.getElementById('loading').style.display = 'flex'; }
    hideLoading() { document.getElementById('loading').style.display = 'none'; document.getElementById('app').classList.remove('hidden'); document.getElementById('app').classList.add('visible'); }
    showError(m) { this.showNotification(m, 'error', 5000); }
    showSuccess(m) { this.showNotification(m, 'success', 3000); }
    
    goBack() { if (this.historyIndex > 0) { this.historyIndex--; this.isNavigatingHistory = true; this.navigateToSection(this.history[this.historyIndex], false); this.isNavigatingHistory = false; } }
    goForward() { if (this.historyIndex < this.history.length - 1) { this.historyIndex++; this.isNavigatingHistory = true; this.navigateToSection(this.history[this.historyIndex], false); this.isNavigatingHistory = false; } }
    updateNavigationControls() {
        const backBtn = document.getElementById('nav-back-btn');
        const fwdBtn = document.getElementById('nav-forward-btn');
        if (backBtn) backBtn.disabled = this.historyIndex <= 0;
        if (fwdBtn) fwdBtn.disabled = this.historyIndex >= this.history.length - 1;
    }
    initFabMenu() {
        const fabMain = document.getElementById('fab-main');
        const fabContainer = document.getElementById('fab-container');
        if (fabMain) fabMain.addEventListener('click', (e) => { e.stopPropagation(); fabContainer.classList.toggle('active'); });
        document.addEventListener('click', (e) => { if (fabContainer && !fabContainer.contains(e.target)) fabContainer.classList.remove('active'); });
    }
    bindNavigationEvents() {}
    bindResponsiveEvents() {}
    bindKeyboardEvents() {}
    bindNotificationEvents() {}
}

window.hotelPetApp = new HotelPetApp();