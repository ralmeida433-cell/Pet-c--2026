class AuthManager {
    constructor() {
        this.supabase = window.supabase;
        // Espera o DOM carregar para binders
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        console.log('🔐 Inicializando Auth Manager...');

        // Verifica sessão atual
        const { data: { session } } = await this.supabase.auth.getSession();
        this.updateUI(session);

        // Escuta mudanças de estado (Login/Logout)
        this.supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth Event:', event);
            this.updateUI(session);
        });

        // Bind form events
        this.bindEvents();
    }

    updateUI(session) {
        const overlay = document.getElementById('login-overlay');
        if (!overlay) return;

        if (session) {
            overlay.classList.remove('active');
            // Carregar dados iniciais se necessário
            if (window.hotelPetApp && window.hotelPetApp.init) {
                // window.hotelPetApp.init(); // app.js já roda no load, mas talvez recarregar dados
            }
        } else {
            overlay.classList.add('active');
        }
    }

    bindEvents() {
        // Toggle Tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.auth-form-container').forEach(f => f.classList.remove('active'));

                tab.classList.add('active');
                const targetId = tab.dataset.target;
                document.getElementById(targetId).classList.add('active');
            });
        });

        // Forms de Login e Cadastro
        const loginForm = document.getElementById('auth-login-form');
        if (loginForm) {
            loginForm.onsubmit = async (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                await this.login(email, password);
            };
        }

        const registerForm = document.getElementById('auth-register-form');
        if (registerForm) {
            registerForm.onsubmit = async (e) => {
                e.preventDefault();
                const email = document.getElementById('reg-email').value;
                const password = document.getElementById('reg-password').value;
                await this.register(email, password);
            };
        }

        // Botão Logout (se existir no DOM principal)
        const logoutBtn = document.getElementById('app-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    async login(email, password) {
        if (!email || !password) return alert('Preencha todos os campos');

        this.setLoading(true);
        const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
        this.setLoading(false);

        if (error) {
            alert('Erro ao entrar: ' + error.message);
        }
    }

    async register(email, password) {
        if (!email || !password) return alert('Preencha todos os campos');

        this.setLoading(true);
        const { data, error } = await this.supabase.auth.signUp({ email, password });
        this.setLoading(false);

        if (error) {
            alert('Erro ao cadastrar: ' + error.message);
        } else {
            alert('Cadastro realizado! Se o login não for automático, verifique seu e-mail.');
        }
    }

    async logout() {
        await this.supabase.auth.signOut();
        window.location.reload();
    }

    setLoading(isLoading) {
        if (window.hotelPetApp && window.hotelPetApp.showLoading) {
            isLoading ? window.hotelPetApp.showLoading() : window.hotelPetApp.hideLoading();
        }
    }
}

// Inicializa
window.authManager = new AuthManager();
