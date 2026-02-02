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
        // Criamos as instâncias e as tornamos globais
        window.animalsManager = new AnimalsManager();
        window.reservationsManager = new ReservationsManager();
        window.dashboardManager = new DashboardManager();
        window.reportsManager = new ReportsManager();
        window.animalProfileManager = new AnimalProfileManager(); // NOVO MANAGER

        if (typeof KennelVisualization !== 'undefined') {
            window.kennelVisualization = new KennelVisualization();
        }

        // Chamamos o init de cada um para bindar eventos do DOM
        window.animalsManager.init();
        window.reservationsManager.init();
        window.animalProfileManager.init(); // Inicializa o novo manager
        // Dashboard, Reports e Inventory gerenciam seus inits internamente ou via DOM
    }

    bindGlobalEvents() {
        // CORREÇÃO: Listener Global para botões de fechar "X"
        document.addEventListener('click', (e) => {
            if (e.target.closest('.close-modal')) {
                this.closeAllModals();
            }
        });

        // Fechar modal ao clicar no fundo escuro
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        });

        this.initFabMenu();
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal.active');
        modals.forEach(modal => {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    async navigateToSection(sectionName, addToHistory = true) {
        if (!this.isInitialized) return;
        
        document.querySelector('.menu-item.active')?.classList.remove('active');
        document.querySelector('.content-section.active')?.classList.remove('active');

        document.querySelector(`[data-section="${sectionName}"]`)?.classList.add('active');
        const newSection = document.getElementById(sectionName);
        if (newSection) newSection.classList.add('active');

        this.currentSection = sectionName;
        await this.loadSectionData(sectionName);

        if (window.innerWidth <= 1024) {
            document.getElementById('sidebar').classList.remove('open');
            document.querySelector('.sidebar-overlay').classList.remove('active');
        }
        window.scrollTo(0, 0);

        const mobileTitle = document.getElementById('mobile-page-title');
        if (mobileTitle) {
            const titles = { overview: 'Visão Geral', dashboard: 'Dashboard', animals: 'Animais', reservations: 'Reservas', reports: 'Relatórios', 'animal-profile': 'Perfil do Pet' };
            mobileTitle.textContent = titles[sectionName] || 'Hotel Pet CÁ';
        }
    }

    async loadInitialSection() {
        await this.loadSectionData('overview');
    }

    async loadSectionData(sectionName) {
        switch (sectionName) {
            case 'overview': if (window.kennelVisualization) await window.kennelVisualization.refresh(); break;
            case 'dashboard': if (window.dashboardManager) await window.dashboardManager.loadDashboard(); break;
            case 'animals': if (window.animalsManager) await window.animalsManager.loadAnimals(); break;
            case 'reservations': if (window.reservationsManager) { await window.reservationsManager.loadReservations(); await window.reservationsManager.loadAnimalsDropdown(); } break;
            case 'reports': if (window.reportsManager) await window.reportsManager.loadReports(); break;
            case 'animal-profile': /* O carregamento é feito via animalProfileManager.loadProfile(id) */ break;
        }
    }

    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.add('removing');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    showLoading() { document.getElementById('loading').style.display = 'flex'; }
    hideLoading() { document.getElementById('loading').style.display = 'none'; }
    
    initFabMenu() {
        const fabMain = document.getElementById('fab-main');
        const fabContainer = document.getElementById('fab-container');
        if (fabMain) fabMain.onclick = () => fabContainer.classList.toggle('active');
    }

    goBack() {}
    goForward() {}
}

window.hotelPetApp = new HotelPetApp();