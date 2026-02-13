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

        // Escuta mudanças de estado (Login/Logout/Recovery)
        this.supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth Event:', event);

            if (event === 'PASSWORD_RECOVERY') {
                this.showUpdatePasswordForm();
            } else {
                this.updateUI(session);
            }
        });

        // Bind form events
        this.bindEvents();
    }

    updateUI(session) {
        const overlay = document.getElementById('login-overlay');
        if (!overlay) return;

        // Se estiver logado, esconde overlay
        if (session) {
            overlay.classList.remove('active');
        } else {
            // Se não estiver logado, mostra overlay
            overlay.classList.add('active');

            // Garante que o form de login esteja visível se não estiver em outro fluxo
            const activeForm = document.querySelector('.auth-form-container.active');
            if (!activeForm || activeForm.id === 'auth-update-pass') {
                document.querySelector('.auth-tab[data-target="auth-login"]')?.click();
            }
        }
    }

    bindEvents() {
        // Toggle Tabs (Login/Cadastro)
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active de todos
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.auth-form-container').forEach(f => f.classList.remove('active'));

                // Ativa atual
                tab.classList.add('active');
                const targetId = tab.dataset.target || 'auth-login'; // Fallback
                const targetEl = document.getElementById(targetId);
                if (targetEl) targetEl.classList.add('active');
            });
        });

        // Form: Login
        const loginForm = document.getElementById('auth-login-form');
        if (loginForm) {
            loginForm.onsubmit = async (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                await this.login(email, password);
            };
        }

        // Form: Register
        const registerForm = document.getElementById('auth-register-form');
        if (registerForm) {
            registerForm.onsubmit = async (e) => {
                e.preventDefault();
                const email = document.getElementById('reg-email').value;
                const password = document.getElementById('reg-password').value;
                await this.register(email, password);
            };
        }

        // Form: Forgot Password
        const forgotForm = document.getElementById('auth-forgot-form');
        if (forgotForm) {
            forgotForm.onsubmit = async (e) => {
                e.preventDefault();
                const email = document.getElementById('forgot-email').value;
                await this.sendPasswordReset(email);
            };
        }

        // Form: Update Password (Reset)
        const updatePassForm = document.getElementById('auth-update-pass-form');
        if (updatePassForm) {
            updatePassForm.onsubmit = async (e) => {
                e.preventDefault();
                const newPass = document.getElementById('new-password').value;
                await this.updateUserPassword(newPass);
            };
        }

        // Botão Logout
        const logoutBtn = document.getElementById('app-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    // --- ACTIONS ---

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

    async sendPasswordReset(email) {
        if (!email) return alert('Digite seu e-mail');
        this.setLoading(true);

        try {
            // URL Base sem hash
            const redirectUrl = window.location.href.split('#')[0];
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: redirectUrl
            });

            if (error) throw error;

            alert('Enviado! Verifique seu e-mail para redefinir a senha.');
            // Voltar para aba de login
            const loginTab = document.querySelector('.auth-tab:first-child');
            if (loginTab) loginTab.click();

        } catch (err) {
            alert('Erro: ' + err.message);
        } finally {
            this.setLoading(false);
        }
    }

    async updateUserPassword(newPassword) {
        if (!newPassword) return alert('Digite a nova senha');
        this.setLoading(true);

        try {
            const { error } = await this.supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;

            alert('Senha atualizada com sucesso!');
            window.location.reload(); // Recarrega para limpar estado
        } catch (err) {
            alert('Erro ao atualizar senha: ' + err.message);
        } finally {
            this.setLoading(false);
        }
    }

    async logout() {
        await this.supabase.auth.signOut();
        window.location.reload();
    }

    // --- UI HELPERS ---

    showUpdatePasswordForm() {
        console.log('🔄 Exibindo formulário de nova senha...');
        const overlay = document.getElementById('login-overlay');
        if (!overlay) return;

        overlay.classList.add('active'); // Garante visibilidade

        // Esconde outros forms
        document.querySelectorAll('.auth-form-container').forEach(e => e.classList.remove('active'));

        // Mostra form de update
        const updateForm = document.getElementById('auth-update-pass');
        if (updateForm) updateForm.classList.add('active');
    }

    setLoading(isLoading) {
        if (window.hotelPetApp && window.hotelPetApp.showLoading) {
            isLoading ? window.hotelPetApp.showLoading() : window.hotelPetApp.hideLoading();
        }
    }
}

// Inicializa
window.authManager = new AuthManager();
