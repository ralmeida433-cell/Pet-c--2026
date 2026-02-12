class DriveSyncManager {
    constructor() {
        this.CLIENT_ID = 'SEU_CLIENT_ID_AQUI.apps.googleusercontent.com'; // O usuário deve substituir
        this.SCOPES = 'https://www.googleapis.com/auth/drive.file';
        this.accessToken = null;
        this.tokenClient = null;
        this.BACKUP_FILENAME = 'HotelPet_Backup_Cloud.json';
        this.isInitialized = false;

        this.init();
    }

    init() {
        this.bindEvents();
        this.checkLoginStatus();

        // --- BACKUP AO FECHAR O APP ---
        // Dispara quando o usuário fecha a aba ou minimiza o app no celular
        window.addEventListener('beforeunload', () => this.syncData(true));

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.syncData(true);
            }
        });
    }

    bindEvents() {
        const loginBtn = document.getElementById('btn-google-login');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.handleAuthClick());
        }
    }

    checkLoginStatus() {
        const savedToken = localStorage.getItem('petca_drive_token');
        if (savedToken) {
            this.accessToken = savedToken;
            this.updateUI(true, localStorage.getItem('petca_user_email'));
        }
    }

    handleAuthClick() {
        if (!window.google) {
            showNotification('Erro: Script do Google não carregado.', 'error');
            return;
        }

        if (!this.tokenClient) {
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: this.CLIENT_ID,
                scope: this.SCOPES,
                callback: (response) => {
                    if (response.error !== undefined) {
                        throw (response);
                    }
                    this.accessToken = response.access_token;
                    localStorage.setItem('petca_drive_token', this.accessToken);
                    this.getUserInfo();
                },
            });
        }

        if (this.accessToken) {
            // Se já tem, vamos direto ao backup/informação
            this.getUserInfo();
        } else {
            // Pede permissão
            this.tokenClient.requestAccessToken({ prompt: 'consent' });
        }
    }

    async getUserInfo() {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });
            const data = await response.json();
            const email = data.email || 'Usuário Conectado';

            localStorage.setItem('petca_user_email', email);
            this.updateUI(true, email);
            showNotification(`Conectado ao Drive: ${email}`, 'success');

            // Após login com sucesso, tenta o primeiro backup
            this.syncData();
        } catch (err) {
            console.error('Erro ao pegar info usuario:', err);
            this.accessToken = null;
            this.updateUI(false);
        }
    }

    updateUI(isConnected, email = '') {
        const btn = document.getElementById('btn-google-login');
        const status = document.getElementById('drive-status');
        const emailSpan = document.getElementById('user-email');
        const statusLabel = document.getElementById('drive-status-label');

        if (isConnected) {
            if (window.settingsManager) {
                window.settingsManager.showDriveConnected(email);
                return;
            }
            // Fallback se o manager não estiver pronto
            if (btn) btn.style.display = 'none';
            if (status) status.style.display = 'block';
            if (emailSpan) emailSpan.textContent = email;
            if (statusLabel) statusLabel.textContent = 'Sincronização Ativa';
        } else {
            if (btn) {
                btn.style.display = 'inline-flex';
                btn.innerHTML = '<i class="fab fa-google"></i> Conectar Drive';
            }
            if (status) status.style.display = 'none';
            if (statusLabel) statusLabel.textContent = 'Backup automático desativado';
        }
    }

    async syncData(isAuto = false) {
        if (!this.accessToken) return;

        // Evitar sincronizações simultâneas
        if (this.isSyncing) return;

        // Cooldown para sincronização automática (30 segundos)
        const now = Date.now();
        if (isAuto && this.lastSyncTime && (now - this.lastSyncTime < 30000)) {
            return;
        }

        this.isSyncing = true;

        if (!isAuto) showNotification('Sincronizando com a nuvem...', 'info');

        try {
            this.lastSyncTime = now;
            // 1. Preparar dados
            const animals = await db.getAnimals();
            const reservations = await db.getReservations();

            // Buscar histórico de todos os animais para o backup ser completo
            const fullAnimals = [];
            for (let a of animals) {
                const history = await db.getAnimalHistory(a.id);
                fullAnimals.push({ ...a, history });
            }

            const backupData = {
                app: 'Hotel Pet',
                version: '2.5',
                timestamp: new Date().toISOString(),
                data: { animals: fullAnimals, reservations }
            };

            // 2. Procurar se arquivo já existe no Drive
            const fileId = await this.findBackupFile();

            if (fileId) {
                await this.updateFile(fileId, backupData);
            } else {
                await this.createFile(backupData);
            }

            if (!isAuto) showNotification('Backup salvo no Google Drive!', 'success');
            console.log('✅ Sincronização em nuvem concluída');
        } catch (error) {
            console.error('Erro na sincronização:', error);
            if (!isAuto) showNotification('Falha ao sincronizar com Drive.', 'error');
        } finally {
            this.isSyncing = false;
        }
    }

    async findBackupFile() {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${this.BACKUP_FILENAME}' and trashed=false`,
            { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
        );
        const data = await response.json();
        return data.files && data.files.length > 0 ? data.files[0].id : null;
    }

    async createFile(content) {
        const metadata = {
            name: this.BACKUP_FILENAME,
            mimeType: 'application/json'
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([JSON.stringify(content)], { type: 'application/json' }));

        await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.accessToken}` },
            body: form
        });
    }

    async updateFile(fileId, content) {
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(content)
        });
    }
}

// Iniciar Globalmente
window.driveSync = new DriveSyncManager();
