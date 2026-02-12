class SettingsManager {
    constructor() {
        this.init();
    }

    init() {
        this.loadPreferences();
        this.bindEvents();
        console.log('Settings Manager initialized');
    }

    bindEvents() {
        // Dark Mode Toggle
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('change', (e) => this.toggleDarkMode(e.target.checked));
        }

        // API Key Visibility
        // (Já tratado inline no HTML com onclick="togglePassword")

        // API Key Save (Auto-save on blur + Button)
        const apiKeyInput = document.getElementById('ai-api-key');
        if (apiKeyInput) {
            apiKeyInput.addEventListener('blur', (e) => this.saveApiKey(e.target.value, false));
        }

        const btnSaveApi = document.getElementById('btn-save-api');
        if (btnSaveApi) {
            btnSaveApi.addEventListener('click', () => {
                const val = document.getElementById('ai-api-key').value;
                this.saveApiKey(val, true);
            });
        }

        // Provider Selector
        const providers = document.querySelectorAll('.provider-pill');
        providers.forEach(p => {
            p.addEventListener('click', () => {
                providers.forEach(opt => opt.classList.remove('active'));
                p.classList.add('active');
                this.saveProvider(p.dataset.provider);
                this.updateProviderUI(p.dataset.provider);
            });
        });

    }

    loadPreferences() {
        // Dark Mode
        const isDark = localStorage.getItem('petca_dark_mode') === 'true';
        const toggle = document.getElementById('dark-mode-toggle');
        if (toggle) toggle.checked = isDark;
        if (isDark) document.body.classList.add('dark-mode');

        // API Key
        const apiKey = localStorage.getItem('petca_api_key');
        const keyInput = document.getElementById('ai-api-key');
        if (apiKey && keyInput) keyInput.value = apiKey;

        // Provider
        const provider = localStorage.getItem('petca_ai_provider') || 'gemini';
        const providers = document.querySelectorAll('.provider-pill');
        providers.forEach(p => {
            if (p.dataset.provider === provider) p.classList.add('active');
            else p.classList.remove('active');
        });
        this.updateProviderUI(provider);

        // Auth Status
        const userEmail = localStorage.getItem('petca_user_email');
        if (userEmail) {
            this.showDriveConnected(userEmail);
        }
    }

    toggleDarkMode(isDark) {
        if (isDark) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        localStorage.setItem('petca_dark_mode', isDark);
    }

    saveApiKey(key, showNotif = false) {
        if (key && key.trim()) {
            localStorage.setItem('petca_api_key', key.trim());
            if (showNotif && window.hotelPetApp) {
                window.hotelPetApp.showNotification('Chave API salva com sucesso!', 'success');
            }
        }
    }

    saveProvider(provider) {
        localStorage.setItem('petca_ai_provider', provider);
    }

    updateProviderUI(provider) {
        // Show/Hide Key Input based on provider
        const keyContainer = document.getElementById('api-key-container');
        if (keyContainer) {
            if (provider === 'pollinations') {
                keyContainer.style.display = 'none';
            } else {
                keyContainer.style.display = 'block';
            }
        }

        const link = document.querySelector('.help-link');
        if (!link) return;

        if (provider === 'gemini') {
            link.href = 'https://aistudio.google.com/app/apikey';
            link.innerHTML = 'Obter chave no Google AI Studio <i class="fas fa-external-link-alt"></i>';
        } else if (provider === 'huggingface') {
            link.href = 'https://huggingface.co/settings/tokens';
            link.innerHTML = 'Obter chave no Hugging Face (Gratuito) <i class="fas fa-external-link-alt"></i>';
        } else if (provider === 'pollinations') {
            // No key needed
            link.innerHTML = '';
        } else {
            // OpenRouter fallback
            link.href = 'https://openrouter.ai/keys';
            link.innerHTML = 'Obter chave no OpenRouter <i class="fas fa-external-link-alt"></i>';
        }
    }


    showDriveConnected(email) {
        const btn = document.getElementById('btn-google-login');
        const status = document.getElementById('drive-status');
        const emailSpan = document.getElementById('user-email');
        const statusLabel = document.getElementById('drive-status-label');

        if (btn) btn.style.display = 'none';
        if (status) status.style.display = 'block';
        if (emailSpan) emailSpan.textContent = email;
        if (statusLabel) {
            statusLabel.textContent = 'Sincronização Ativa';
            statusLabel.style.color = '#10b981';
            statusLabel.style.fontWeight = '700';
        }
    }
}

// Funções Globais Auxiliares
window.togglePassword = function (id) {
    const input = document.getElementById(id);
    const btn = input.nextElementSibling;
    if (input.type === "password") {
        input.type = "text";
        btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        input.type = "password";
        btn.innerHTML = '<i class="fas fa-eye"></i>';
    }
};

window.SettingsManager = SettingsManager;
