class HotelPetApp {
    constructor() {
        this.currentSection = 'overview';
        this.isInitialized = false;
        this.managers = {};
        this.init();
    }

    async init() {
        try {
            // Mostrar loading
            this.showLoading();

            // Inicializar banco de dados
            await this.initializeDatabase();

            // Inicializar managers
            this.initializeManagers();

            // PWA Install Prompt
            this.deferredPrompt = null;
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                this.deferredPrompt = e;
                this.showInstallBanner();
            });

            // Configurar eventos globais
            this.bindGlobalEvents();

            // Carregar seção inicial
            await this.loadInitialSection();

            // Ocultar loading
            this.hideLoading();

            this.isInitialized = true;
            console.log('Hotel Pet App initialized successfully');
        } catch (error) {
            console.error('Error initializing app:', error);
            this.showError('Erro ao inicializar aplicação');
        }
    }

    async initializeDatabase() {
        if (!window.db) {
            throw new Error('Database not available');
        }
        await window.db.init();
        console.log('Database initialized');
    }

    initializeManagers() {
        // Inicializar gerenciadores de módulos
        this.managers.animals = new AnimalsManager();
        this.managers.reservations = new ReservationsManager();
        this.managers.dashboard = new DashboardManager();
        this.managers.reports = new ReportsManager();

        // NOVO: Inicializar gerenciador de estoque
        if (typeof InventoryManager !== 'undefined') {
            this.managers.inventory = new InventoryManager();
            window.inventoryManager = this.managers.inventory;
        }

        // Inicializar visualização de canis
        if (typeof KennelVisualization !== 'undefined') {
            this.managers.kennels = new KennelVisualization();
            window.kennelVisualization = this.managers.kennels;
        }

        // Disponibilizar globalmente para compatibilidade
        window.animalsManager = this.managers.animals;
        window.reservationsManager = this.managers.reservations;
        window.dashboardManager = this.managers.dashboard;
        window.reportsManager = this.managers.reports;

        console.log('Managers initialized');
    }

    bindGlobalEvents() {
        // Navegação do menu
        this.bindNavigationEvents();

        // Eventos de responsividade
        this.bindResponsiveEvents();

        // Eventos de teclado
        this.bindKeyboardEvents();

        // Eventos de notificação
        this.bindNotificationEvents();

        // Eventos de modal global
        this.bindModalEvents();

        console.log('Global events bound');
    }

    bindNavigationEvents() {
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                if (section && section !== this.currentSection) {
                    this.navigateToSection(section);
                }
            });
        });
    }

    bindResponsiveEvents() {
        const menuToggle = document.querySelector('.menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        const overlay = this.createOverlay();

        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

        // Fechar sidebar ao clicar no overlay (mobile)
        overlay.addEventListener('click', () => {
            this.closeSidebar();
        });

        // Redimensionamento da janela
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize();
        }, 250));
    }

    bindKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            // ESC para fechar modais
            if (e.key === 'Escape') {
                this.closeAllModals();
            }

            // Ctrl/Cmd + K para busca rápida
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.focusSearch();
            }

            // Navegação por teclado no menu
            if (e.altKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.navigateToSection('overview');
                        break;
                    case '2':
                        e.preventDefault();
                        this.navigateToSection('dashboard');
                        break;
                    case '3':
                        e.preventDefault();
                        this.navigateToSection('animals');
                        break;
                    case '4':
                        e.preventDefault();
                        this.navigateToSection('reservations');
                        break;
                    case '5':
                        e.preventDefault();
                        this.navigateToSection('inventory');
                        break;
                    case '6':
                        e.preventDefault();
                        this.navigateToSection('reports');
                        break;
                }
            }
        });
    }

    bindNotificationEvents() {
        // Auto-remover notificações antigas
        setInterval(() => {
            this.cleanupNotifications();
        }, 5000);
    }

    bindModalEvents() {
        // Eventos globais de modal
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                // Fechar modal ao clicar no backdrop
                this.closeModal(e.target);
            }
        });
    }

    async navigateToSection(sectionName) {
        if (!this.isInitialized) return;

        try {
            // Remover classe ativa do menu atual
            document.querySelector('.menu-item.active')?.classList.remove('active');

            // Ocultar seção atual
            document.querySelector('.content-section.active')?.classList.remove('active');

            // Ativar novo item do menu
            const newMenuItem = document.querySelector(`[data-section="${sectionName}"]`);
            if (newMenuItem) {
                newMenuItem.classList.add('active');
            }

            // Mostrar nova seção
            const newSection = document.getElementById(sectionName);
            if (newSection) {
                newSection.classList.add('active');
            }

            // Atualizar título da página
            this.updatePageTitle(sectionName);

            // Carregar dados da seção
            await this.loadSectionData(sectionName);

            // Atualizar seção atual
            this.currentSection = sectionName;

            // Fechar sidebar em mobile
            if (window.innerWidth <= 1024) {
                this.closeSidebar();
            }

            // Scroll para o topo
            window.scrollTo(0, 0);
        } catch (error) {
            console.error('Error navigating to section:', error);
            this.showNotification('Erro ao navegar para seção', 'error');
        }
    }

    async loadInitialSection() {
        await this.loadSectionData('overview');
    }

    async loadSectionData(sectionName) {
        try {
            switch (sectionName) {
                case 'overview':
                    // Carregar visualização de canis
                    if (this.managers.kennels) {
                        await this.managers.kennels.refresh();
                    }
                    break;

                case 'dashboard':
                    if (this.managers.dashboard) {
                        await this.managers.dashboard.loadDashboard();
                    }
                    break;

                case 'animals':
                    if (this.managers.animals) {
                        await this.managers.animals.loadAnimals();
                    }
                    break;

                case 'reservations':
                    if (this.managers.reservations) {
                        await this.managers.reservations.loadReservations();
                        await this.managers.reservations.loadAnimalsDropdown();
                    }
                    break;

                case 'inventory':
                    // NOVO: Carregar módulo de estoque
                    if (this.managers.inventory) {
                        await this.managers.inventory.loadInventory();
                    }
                    break;

                case 'reports':
                    if (this.managers.reports) {
                        await this.managers.reports.loadReports();
                    }
                    break;
            }
        } catch (error) {
            console.error(`Error loading section ${sectionName}:`, error);
            this.showNotification(`Erro ao carregar ${sectionName}`, 'error');
        }
    }

    updatePageTitle(sectionName) {
        const titles = {
            overview: 'Visão Geral',
            dashboard: 'Dashboard',
            animals: 'Animais',
            reservations: 'Reservas',
            inventory: 'Controle de Estoque',  // NOVO
            reports: 'Relatórios'
        };

        const pageTitle = document.querySelector('.page-title');
        if (pageTitle) {
            pageTitle.textContent = titles[sectionName] || sectionName;
        }

        // Atualizar título do documento
        document.title = `${titles[sectionName] || sectionName} - Hotel Pet CÁ`;
    }

    // Sidebar Management
    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');

        if (sidebar.classList.contains('open')) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    openSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');

        sidebar.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');

        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    createOverlay() {
        let overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 999;
                display: none;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(overlay);
        }
        return overlay;
    }

    handleResize() {
        if (window.innerWidth > 1024) {
            this.closeSidebar();
        }

        // Recalcular layouts se necessário
        if (this.currentSection === 'dashboard' && this.managers.dashboard) {
            this.managers.dashboard.handleResize();
        }
    }

    // Modal Management
    closeAllModals() {
        const modals = document.querySelectorAll('.modal.active');
        modals.forEach(modal => {
            this.closeModal(modal);
        });
    }

    closeModal(modal) {
        if (modal && modal.classList.contains('active')) {
            modal.classList.remove('active');
            document.body.style.overflow = '';

            // Limpar formulários se necessário
            const forms = modal.querySelectorAll('form');
            forms.forEach(form => {
                if (form.dataset.clearOnClose !== 'false') {
                    form.reset();
                }
            });
        }
    }

    // Search Management
    focusSearch() {
        const searchInputs = [
            '#animal-search',
            '#reservation-search',
            '#product-search'  // NOVO: busca de produtos
        ];

        const currentSectionSearch = document.querySelector(`#${this.currentSection} input[type="text"]`);
        if (currentSectionSearch) {
            currentSectionSearch.focus();
            currentSectionSearch.select();
        }
    }

    // Notification System
    showNotification(message, type = 'info', duration = 3000) {
        const notification = this.createNotification(message, type);
        document.body.appendChild(notification);

        // Animar entrada
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Auto-remover
        setTimeout(() => {
            this.removeNotification(notification);
        }, duration);

        return notification;
    }

    createNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        return notification;
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    removeNotification(notification) {
        if (notification && notification.parentNode) {
            notification.classList.add('removing');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }

    cleanupNotifications() {
        const notifications = document.querySelectorAll('.notification');
        notifications.forEach(notification => {
            if (!notification.classList.contains('removing')) {
                const age = Date.now() - (notification.dataset.created || 0);
                if (age > 10000) { // Remove após 10 segundos
                    this.removeNotification(notification);
                }
            }
        });
    }

    // Loading Management
    showLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'flex';
            loading.classList.remove('fade-out');
        }
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('fade-out');
            setTimeout(() => {
                loading.style.display = 'none';
                // Mostrar app
                const app = document.getElementById('app');
                if (app) {
                    app.classList.remove('hidden');
                    app.classList.add('visible');
                }
            }, 800);
        }
    }

    showError(message) {
        this.showNotification(message, 'error', 5000);
    }

    showSuccess(message) {
        this.showNotification(message, 'success', 3000);
    }

    // Utility Methods
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

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value || 0);
    }

    formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('pt-BR');
        } catch (error) {
            return dateStr;
        }
    }

    // API Methods para compatibilidade
    async refreshData() {
        await this.loadSectionData(this.currentSection);
    }

    getCurrentSection() {
        return this.currentSection;
    }

    getManager(managerName) {
        return this.managers[managerName];
    }

    // Métodos para integração com outros módulos
    updateStats() {
        if (this.managers.dashboard) {
            this.managers.dashboard.loadDashboardStats();
        }
    }

    refreshKennels() {
        if (this.managers.kennels) {
            this.managers.kennels.refresh();
        }
    }

    // Cleanup
    destroy() {
        // Limpar event listeners
        window.removeEventListener('resize', this.handleResize);

        // Destruir managers
        Object.values(this.managers).forEach(manager => {
            if (manager && typeof manager.destroy === 'function') {
                manager.destroy();
            }
        });

        // Limpar notificações
        const notifications = document.querySelectorAll('.notification');
        notifications.forEach(notification => notification.remove());

        console.log('Hotel Pet App destroyed');
    }

    // PWA Support Methods
    showInstallBanner() {
        if (!this.deferredPrompt) return;

        const banner = this.showNotification(
            'Instalar Hotel Pet CÁ no seu celular?',
            'info',
            10000
        );

        const btn = document.createElement('button');
        btn.textContent = 'INSTALAR';
        btn.className = 'btn btn-sm btn-primary';
        btn.style.marginLeft = '10px';
        btn.onclick = () => this.installApp();

        const content = banner.querySelector('.notification-content');
        if (content) content.appendChild(btn);
    }

    async installApp() {
        if (!this.deferredPrompt) return;

        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('Usuário aceitou a instalação');
        } else {
            console.log('Usuário recusou a instalação');
        }

        this.deferredPrompt = null;
    }
}

// Inicializar aplicação quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.hotelPetApp = new HotelPetApp();
});

// Disponibilizar globalmente
window.HotelPetApp = HotelPetApp;

// Funções globais para compatibilidade
function navigateToSection(sectionName) {
    if (window.hotelPetApp) {
        window.hotelPetApp.navigateToSection(sectionName);
    }
}

function showNotification(message, type = 'info') {
    if (window.hotelPetApp) {
        window.hotelPetApp.showNotification(message, type);
    }
}

function refreshData() {
    if (window.hotelPetApp) {
        window.hotelPetApp.refreshData();
    }
}

// Exportar para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HotelPetApp;
}
