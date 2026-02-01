class HotelPetApp {
    constructor() { this.currentSection = 'overview'; this.isInitialized = false; this.managers = {}; this.history = []; this.historyIndex = -1; this.isNavigatingHistory = false; this.init(); }
    async init() {
        try {
            await this.initializeNativeBridge();
            await this.initializeDatabase();
            this.initializeManagers();
            this.bindGlobalEvents();
            await this.loadInitialSection();
            this.isInitialized = true;
            document.getElementById('loading').style.display = 'none';
            document.getElementById('app').classList.remove('hidden');
        } catch (e) {}
    }
    async initializeNativeBridge() {
        if (window.Capacitor?.isNativePlatform()) {
            Capacitor.Plugins.App.addListener('backButton', () => {
                if (document.querySelectorAll('.modal.active').length > 0) this.closeAllModals();
                else if (this.currentSection !== 'overview') this.navigateToSection('overview');
            });
        }
    }
    async initializeDatabase() { await window.db.init(); }
    initializeManagers() {
        this.managers.animals = new AnimalsManager();
        this.managers.reservations = new ReservationsManager();
        this.managers.dashboard = new DashboardManager();
        this.managers.reports = new ReportsManager();
        window.animalsManager = this.managers.animals;
        window.reservationsManager = this.managers.reservations;
    }
    bindGlobalEvents() {
        document.addEventListener('click', (e) => { if (e.target.closest('.close-modal')) this.closeAllModals(); });
        const fab = document.getElementById('fab-main');
        if (fab) fab.onclick = () => document.getElementById('fab-container').classList.toggle('active');
    }
    closeAllModals() { document.querySelectorAll('.modal.active').forEach(m => { m.classList.remove('active'); document.body.style.overflow=''; }); }
    async navigateToSection(s, add = true) {
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
        document.getElementById(s).classList.add('active');
        this.currentSection = s;
        this.loadSectionData(s);
    }
    async loadInitialSection() { this.navigateToSection('overview'); }
    async loadSectionData(s) {
        if (s === 'animals') this.managers.animals.loadAnimals();
        if (s === 'reservations') this.managers.reservations.loadReservations();
    }
    showNotification(m, t) { alert(m); }
    showLoading() {}
    hideLoading() {}
    goBack() {}
    goForward() {}
}
window.hotelPetApp = new HotelPetApp();
function navigateToSection(s) { window.hotelPetApp.navigateToSection(s); }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }