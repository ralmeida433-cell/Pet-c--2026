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
                } else if (this.isSidebarOpen()) {
                    this.closeSidebar();
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
        window.animalsManager = new AnimalsManager();
        window.reservationsManager = new ReservationsManager();
        window.dashboardManager = new DashboardManager();
        window.reportsManager = new ReportsManager();
        window.animalProfileManager = new AnimalProfileManager();

        if (typeof KennelVisualization !== 'undefined') {
            window.kennelVisualization = new KennelVisualization();
        }

        window.animalsManager.init();
        window.reservationsManager.init();
        window.animalProfileManager.init();
    }

    bindGlobalEvents() {
        // Fechar modal ao clicar no X
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

        // Fechar sidebar ao clicar no overlay
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('sidebar-overlay')) {
                this.closeSidebar();
            }
        });

        this.initFabMenu();
    }

    isSidebarOpen() {
        return document.getElementById('sidebar')?.classList.contains('open');
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        if (sidebar && overlay) {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        }
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        if (sidebar && overlay) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        }
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
        
        // Fechar sidebar ao navegar (em mobile)
        if (window.innerWidth <= 1024) {
            this.closeSidebar();
        }

        document.querySelector('.menu-item.active')?.classList.remove('active');
        document.querySelector('.content-section.active')?.classList.remove('active');

        document.querySelector(`[data-section="${sectionName}"]`)?.classList.add('active');
        const newSection = document.getElementById(sectionName);
        if (newSection) newSection.classList.add('active');

        this.currentSection = sectionName;
        await this.loadSectionData(sectionName);

        window.scrollTo(0, 0);

        const mobileTitle = document.getElementById('mobile-page-title');
        if (mobileTitle) {
            const titles = { 
                overview: 'Visão Geral', 
                dashboard: 'Dashboard', 
                animals: 'Animais', 
                reservations: 'Reservas', 
                reports: 'Relatórios', 
                'animal-profile': 'Perfil do Pet' 
            };
            mobileTitle.textContent = titles[sectionName] || 'Hotel Pet CÁ';
        }
    }

    async loadInitialSection() {
        await this.loadSectionData('overview');
    }

    async loadSectionData(sectionName) {
        switch (sectionName) {
            case 'overview': 
                if (window.kennelVisualization) await window.kennelVisualization.refresh(); 
                break;
            case 'dashboard': 
                if (window.dashboardManager) await window.dashboardManager.loadDashboard(); 
                break;
            case 'animals': 
                if (window.animalsManager) await window.animalsManager.loadAnimals(); 
                break;
            case 'reservations': 
                if (window.reservationsManager) { 
                    await window.reservationsManager.loadReservations(); 
                    await window.reservationsManager.loadAnimalsDropdown(); 
                } 
                break;
            case 'reports': 
                if (window.reportsManager) await window.reportsManager.loadReports(); 
                break;
            case 'animal-profile': 
                /* O carregamento é feito via animalProfileManager.loadProfile(id) */ 
                break;
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

    showLoading() { 
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'flex'; 
    }
    
    hideLoading() { 
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none'; 
    }
    
    initFabMenu() {
        const fabMain = document.getElementById('fab-main');
        const fabContainer = document.getElementById('fab-container');
        if (fabMain) fabMain.onclick = () => fabContainer.classList.toggle('active');
    }

    goBack() {}
    goForward() {}
}

// Funções globais para o HTML
window.toggleSidebar = function() {
    window.hotelPetApp.toggleSidebar();
};

window.closeSidebar = function() {
    window.hotelPetApp.closeSidebar();
};

window.navigateToSection = function(sectionName) { 
    if (window.hotelPetApp) window.hotelPetApp.navigateToSection(sectionName); 
};

window.hotelPetApp = new HotelPetApp();