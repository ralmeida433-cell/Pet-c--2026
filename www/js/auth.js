class AuthManager {
    constructor() {
        this.supabase = window.supabase;
        this.tempAvatarBase64 = null; // Armazena avatar temporariamente

        // Espera o DOM carregar para binders
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        console.log('🔐 Inicializando Auth Manager...');

        // 1. Vincular eventos primeiro para garantir que automações funcionem
        this.bindEvents();

        // 2. Tenta carregar perfil salvo anteriormente
        this.loadUserProfile();

        // 3. Verifica sessão atual
        const { data: { session } } = await this.supabase.auth.getSession();
        this.updateUI(session);

        // 4. Escuta mudanças de estado (Login/Logout/Recovery)
        this.supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth Event:', event);

            if (event === 'PASSWORD_RECOVERY') {
                this.showUpdatePasswordForm();
            } else {
                this.updateUI(session);
            }
        });
    }

    loadUserProfile() {
        try {
            const stored = localStorage.getItem('user_profile');
            if (stored) {
                const profile = JSON.parse(stored);
                this.renderUserProfile(profile);
            }
        } catch (e) {
            console.error('Erro ao carregar perfil:', e);
        }
    }

    renderUserProfile(profile) {
        // Updated to target header profile (top right of overview)
        const header = document.getElementById('header-user-profile');
        const avatar = document.getElementById('header-user-avatar');
        const name = document.getElementById('header-user-name');

        // Mobile Profile
        const mobileProfile = document.getElementById('mobile-user-profile');
        const mobileAvatar = document.getElementById('mobile-user-avatar');

        if (profile) {
            // Desktop
            if (header) {
                header.style.display = 'flex';
                if (name) name.textContent = profile.name || 'Usuário';

                if (avatar) {
                    if (profile.avatar) {
                        avatar.src = profile.avatar;
                    } else {
                        avatar.src = 'css/logo.png';
                    }
                    avatar.style.display = 'block';
                }
            }

            // Mobile
            if (mobileProfile) {
                mobileProfile.style.display = 'flex';
                if (mobileAvatar) {
                    if (profile.avatar) {
                        mobileAvatar.src = profile.avatar;
                    } else {
                        mobileAvatar.src = 'css/logo.png';
                    }
                    mobileAvatar.style.display = 'block';
                }
            }
        }

        // Global Dropdown
        const menuName = document.getElementById('menu-dropdown-name');
        const menuEmail = document.getElementById('menu-dropdown-email');
        const menuAvatar = document.getElementById('menu-dropdown-avatar');

        if (profile) {
            if (menuName) menuName.textContent = profile.name || 'Usuário';
            if (menuEmail) menuEmail.textContent = profile.email || '';
            if (menuAvatar) {
                menuAvatar.src = profile.avatar || 'css/logo.png';
            }
        }
    }

    toggleProfileMenu(e) {
        if (e) e.stopPropagation();
        const menu = document.getElementById('global-profile-menu');
        if (menu) {
            menu.classList.toggle('active');
        }
    }

    closeProfileMenu() {
        const menu = document.getElementById('global-profile-menu');
        if (menu) menu.classList.remove('active');
    }

    openEditProfile() {
        this.closeProfileMenu();
        const profile = JSON.parse(localStorage.getItem('user_profile') || '{}');

        const nameInput = document.getElementById('edit-profile-name');
        if (nameInput) nameInput.value = profile.name || '';

        // Setup Avatar Preview
        this.tempEditAvatarBase64 = null; // Reset temp
        const preview = document.getElementById('edit-profile-preview');
        const placeholder = document.getElementById('edit-profile-placeholder');
        const fileInput = document.getElementById('edit-profile-avatar-file');

        if (fileInput) fileInput.value = ''; // Reset file input

        if (profile.avatar) {
            if (preview) {
                preview.src = profile.avatar;
                preview.style.display = 'block';
            }
            if (placeholder) placeholder.style.display = 'none';
        } else {
            if (preview) preview.style.display = 'none';
            if (placeholder) placeholder.style.display = 'block';
        }

        const modal = document.getElementById('profile-edit-modal');
        if (modal) {
            modal.style.display = 'block';
            setTimeout(() => modal.classList.add('active'), 10);
        }
    }

    handleAvatarChange(input) {
        if (input.files && input.files[0]) {
            const file = input.files[0];
            if (file.size > 2 * 1024 * 1024) {
                alert('A imagem deve ter no máximo 2MB');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                this.tempEditAvatarBase64 = e.target.result;
                const preview = document.getElementById('edit-profile-preview');
                const placeholder = document.getElementById('edit-profile-placeholder');

                if (preview) {
                    preview.src = this.tempEditAvatarBase64;
                    preview.style.display = 'block';
                }
                if (placeholder) placeholder.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    }

    cancelEditProfile() {
        // Close Edit Profile Modal
        const editModal = document.getElementById('profile-edit-modal');
        if (editModal) {
            editModal.classList.remove('active');
            setTimeout(() => editModal.style.display = 'none', 300);
        }

        // Close Change Password Modal
        const passModal = document.getElementById('password-change-modal');
        if (passModal) {
            passModal.classList.remove('active');
            setTimeout(() => passModal.style.display = 'none', 300);
        }
    }

    openChangePassword() {
        this.closeProfileMenu();
        const modal = document.getElementById('password-change-modal');
        if (modal) {
            modal.style.display = 'block';
            setTimeout(() => modal.classList.add('active'), 10);
        }
    }

    updateUI(session) {

        const overlay = document.getElementById('login-overlay');
        if (!overlay) return;

        // Se estiver logado, esconde overlay
        if (session) {
            overlay.classList.remove('active');

            // Verifica e atualiza perfil
            const stored = localStorage.getItem('user_profile');
            let profile = stored ? JSON.parse(stored) : null;

            // Se não tem perfil salvo mas tem sessão (login em outro device ou cache limpo)
            if (!profile && session.user) {
                profile = {
                    name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
                    email: session.user.email,
                    avatar: null // Usa default
                };
                // Salva fallback
                localStorage.setItem('user_profile', JSON.stringify(profile));
            }

            if (profile) this.renderUserProfile(profile);

        } else {
            // Se não estiver logado, mostra overlay
            overlay.classList.add('active');

            // Garante que o form de login esteja visível
            const activeForm = document.querySelector('.auth-form-container.active');
            if (!activeForm || activeForm.id === 'auth-update-pass') {
                document.querySelector('.auth-tab[data-target="auth-login"]')?.click();
            }
        }
    }

    bindEvents() {
        console.log('🔗 Vinculando eventos de Auth...');

        // Close Profile Menu on Click Outside
        document.addEventListener('click', (e) => {
            const menu = document.getElementById('global-profile-menu');
            const profileHeader = document.getElementById('header-user-profile');
            const profileMobile = document.getElementById('mobile-user-profile');

            if (menu && menu.classList.contains('active')) {
                if (!menu.contains(e.target) &&
                    !profileHeader?.contains(e.target) &&
                    !profileMobile?.contains(e.target)) {
                    this.closeProfileMenu();
                }
            }
        });

        // Toggle Tabs (Login/Cadastro)
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.onclick = () => { // Usando onclick direto para evitar múltiplos listeners
                const targetId = tab.getAttribute('data-target');
                console.log('Tab acionada:', targetId);

                // Reset de classes
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.auth-form-container').forEach(f => f.classList.remove('active'));

                // Ativar selecionados
                tab.classList.add('active');
                const targetEl = document.getElementById(targetId);
                if (targetEl) {
                    targetEl.classList.add('active');
                    console.log('Formulário exibido:', targetId);
                } else {
                    console.warn('⚠️ Target não encontrado:', targetId);
                }
            };
        });

        // PHOTO UPLOAD PREVIEW
        const photoInput = document.getElementById('reg-photo-input');
        if (photoInput) {
            photoInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (file.size > 2 * 1024 * 1024) {
                        alert('A imagem deve ter no máximo 2MB');
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = (readerEvent) => {
                        this.tempAvatarBase64 = readerEvent.target.result;
                        const previewBox = document.getElementById('reg-photo-preview');
                        const img = document.getElementById('reg-preview-img');
                        const icon = previewBox.querySelector('.auth-photo-icon');

                        if (img) {
                            img.src = this.tempAvatarBase64;
                            img.style.display = 'block';
                        }
                        if (icon) icon.style.display = 'none';
                    };
                    reader.readAsDataURL(file);
                }
            };
        }

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

        // Form: Register (UPDATED)
        const registerForm = document.getElementById('auth-register-form');
        if (registerForm) {
            registerForm.onsubmit = async (e) => {
                e.preventDefault();
                const email = document.getElementById('reg-email').value;
                const password = document.getElementById('reg-password').value;
                const name = document.getElementById('reg-name').value;
                const inviteCode = document.getElementById('reg-invite-code').value;

                await this.register(email, password, name, inviteCode);
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

        // Form: Update Password
        const updatePassForm = document.getElementById('auth-update-pass-form');
        if (updatePassForm) {
            updatePassForm.onsubmit = async (e) => {
                e.preventDefault();
                const newPass = document.getElementById('new-password').value;
                await this.updateUserPassword(newPass);
            };
        }

        // Form: Edit Profile (Added)
        const editProfileForm = document.getElementById('auth-edit-profile-form');
        if (editProfileForm) {
            editProfileForm.onsubmit = async (e) => {
                e.preventDefault();
                const name = document.getElementById('edit-profile-name').value;
                // If a new file was selected, use it. Otherwise, pass null/undefined to keep existing or handle inside updateProfile
                await this.updateProfile(name, this.tempEditAvatarBase64);
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
        } else {
            // Login com sucesso, o updateUI será chamado pelo onAuthStateChange
            // Mas podemos forçar atualização do perfil se necessário
            // Para login simples, assumimos que perfil já está no localStorage ou será criado fallback no updateUI
        }
    }

    async register(email, password, name, inviteCode) {
        // Validação Código Convite
        const INVITE_CODE = "aop1ciaindp2";
        // Convert to string and trim to avoid issues
        const codeClean = (inviteCode || '').trim();

        if (codeClean !== INVITE_CODE) {
            alert('Código de convite inválido! Solicite o código ao administrador.');
            return;
        }

        if (!email || !password || !name) return alert('Preencha Nome, Email e Senha');

        this.setLoading(true);

        // 1. Criar Auth no Supabase
        const { data, error } = await this.supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name }
            }
        });

        this.setLoading(false);

        if (error) {
            alert('Erro ao cadastrar: ' + error.message);
        } else {
            // 2. Persistir Perfil Localmente (Sessão)
            const profile = {
                name: name,
                email: email,
                avatar: this.tempAvatarBase64 // Base64 image
            };

            try {
                localStorage.setItem('user_profile', JSON.stringify(profile));
            } catch (e) {
                console.error('Storage full or error', e);
                // Fallback avatar null to save space
                profile.avatar = null;
                localStorage.setItem('user_profile', JSON.stringify(profile));
            }

            // Se auto-confirmed (dev mode) ou session ativa
            if (data.session) {
                this.updateUI(data.session); // Force UI update
                alert('Bem-vindo, ' + name + '!');
            } else {
                alert('Cadastro realizado! Se necessário, verifique seu e-mail.');
                // Mesmo sem sessão ativa imediata, salvamos o perfil. 
                // Quando ele logar, o email baterá e usaremos os dados.
            }
        }
    }

    async updateProfile(name, avatar) {
        if (!name) return alert('Nome é obrigatório');
        this.setLoading(true);

        try {
            const { data, error } = await this.supabase.auth.updateUser({
                data: { full_name: name, avatar_url: avatar }
            });

            if (error) throw error;

            // Update local storage
            const profile = {
                name: name,
                email: this.session?.user?.email,
                avatar: avatar
            };
            localStorage.setItem('user_profile', JSON.stringify(profile));
            this.renderUserProfile(profile);

            if (window.hotelPetApp && window.hotelPetApp.showNotification) {
                window.hotelPetApp.showNotification('Perfil atualizado com sucesso!', 'success');
            } else {
                alert('Perfil atualizado!');
            }
            this.cancelEditProfile();

        } catch (err) {
            console.error('Erro ao atualizar perfil:', err);
            window.hotelPetApp?.showNotification('Erro: ' + err.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async sendPasswordReset(email) {
        if (!email) return alert('Digite seu e-mail');
        this.setLoading(true);

        try {
            const redirectUrl = window.location.href.split('#')[0];
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: redirectUrl
            });

            if (error) throw error;
            alert('Enviado! Verifique seu e-mail.');
            document.querySelector('.auth-tab:first-child')?.click();

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

            window.hotelPetApp?.showNotification('Senha atualizada com sucesso!', 'success');
            this.cancelEditProfile();
        } catch (err) {
            alert('Erro ao atualizar senha: ' + err.message);
        } finally {
            this.setLoading(false);
        }
    }

    async logout() {
        await this.supabase.auth.signOut();
        localStorage.removeItem('user_profile'); // Limpa perfil ao sair
        window.location.reload();
    }

    // --- UI HELPERS ---

    showUpdatePasswordForm() {
        const overlay = document.getElementById('login-overlay');
        if (!overlay) return;
        overlay.classList.add('active');
        document.querySelectorAll('.auth-form-container').forEach(e => e.classList.remove('active'));
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
