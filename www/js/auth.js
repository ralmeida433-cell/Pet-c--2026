class AuthManager {
    constructor() {
        this.sessionKey = 'petca_session_token';
        this.userKey = 'petca_user_data';
        this.isAuthenticated = false;
        this.client = null;
        this.init();
    }

    init() {
        // Inicializar Supabase se estiver em modo nuvem
        if (window.AppConfig?.useCloud && window.supabase) {
            this.client = window.supabase.createClient(
                window.AppConfig.supabase.url,
                window.AppConfig.supabase.key
            );
            console.log('☁️ Cliente Supabase conectado');
        }

        this.checkAuth();
        this.bindEvents();
    }

    async checkAuth() {
        if (window.AppConfig?.useCloud && this.client) {
            const { data: { session } } = await this.client.auth.getSession();
            if (session) {
                this.isAuthenticated = true;
                document.getElementById('login-overlay').classList.remove('active');
            } else {
                document.getElementById('login-overlay').classList.add('active');
            }
            return;
        }

        const token = localStorage.getItem(this.sessionKey);
        if (token) {
            this.isAuthenticated = true;
            document.getElementById('login-overlay').classList.remove('active');
        } else {
            document.getElementById('login-overlay').classList.add('active');
        }
    }

    bindEvents() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        if (loginForm) {
            loginForm.onsubmit = (e) => {
                e.preventDefault();
                this.handleLogin();
            };
        }

        if (registerForm) {
            registerForm.onsubmit = (e) => {
                e.preventDefault();
                this.handleRegister();
            };
        }
    }

    switchTab(tab) {
        document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

        if (tab === 'login') {
            document.getElementById('tab-login').classList.add('active');
            document.getElementById('login-form').classList.add('active');
        } else if (tab === 'register') {
            document.getElementById('tab-register').classList.add('active');
            document.getElementById('register-form').classList.add('active');
        } else if (tab === 'confirmation') {
            document.getElementById('email-confirmation').classList.add('active');
        }
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;

        window.hotelPetApp?.showLoading();

        try {
            if (window.AppConfig?.useCloud && this.client) {
                const { data, error } = await this.client.auth.signInWithPassword({
                    email: email,
                    password: pass
                });

                if (error) throw error;

                window.hotelPetApp?.showNotification('Bem-vindo!', 'success');
                document.getElementById('login-overlay').classList.remove('active');
                if (window.hotelPetApp) window.hotelPetApp.init();
            } else {
                // Simulação de login (Modo Local)
                setTimeout(() => {
                    localStorage.setItem(this.sessionKey, 'mock_token_' + Date.now());
                    localStorage.setItem(this.userKey, JSON.stringify({ email: email, name: 'Usuário PetCá' }));
                    window.hotelPetApp?.showNotification('Bem-vindo (Modo Local)!', 'success');
                    document.getElementById('login-overlay').classList.remove('active');
                    if (window.hotelPetApp) window.hotelPetApp.init();
                }, 1000);
            }
        } catch (error) {
            window.hotelPetApp?.showNotification(error.message, 'error');
        } finally {
            window.hotelPetApp?.hideLoading();
        }
    }

    async handleRegister() {
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-password').value;

        window.hotelPetApp?.showLoading();

        try {
            if (window.AppConfig?.useCloud && this.client) {
                const { data, error } = await this.client.auth.signUp({
                    email: email,
                    password: pass,
                    options: { data: { full_name: name } }
                });

                if (error) throw error;

                this.switchTab('confirmation');
                window.hotelPetApp?.showNotification('Link enviado para ' + email, 'info');
            } else {
                // Simulação (Modo Local)
                setTimeout(() => {
                    this.switchTab('confirmation');
                    window.hotelPetApp?.showNotification('Simulação: Link enviado para ' + email, 'info');
                }, 1000);
            }
        } catch (error) {
            window.hotelPetApp?.showNotification(error.message, 'error');
        } finally {
            window.hotelPetApp?.hideLoading();
        }
    }

    simulateConfirmation() {
        window.hotelPetApp?.showLoading();
        setTimeout(() => {
            window.hotelPetApp?.hideLoading();
            window.hotelPetApp?.showNotification('E-mail confirmado com sucesso!', 'success');
            this.switchTab('login');
        }, 1000);
    }

    async logout() {
        if (window.AppConfig?.useCloud && this.client) {
            await this.client.auth.signOut();
        }
        localStorage.removeItem(this.sessionKey);
        localStorage.removeItem(this.userKey);
        location.reload();
    }
}

window.authManager = new AuthManager();
