// Serviço de Armazenamento Nativo - Hotel Pet CÁ
const STORAGE_FOLDER = 'HotelPet_Data';
const DB_FILENAME = 'database.sqlite';
const PHOTOS_FOLDER = 'photos';

class StorageService {
    constructor() {
        this.fs = null;
        this.directory = null;
    }

    async init() {
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            this.fs = window.Capacitor.Plugins.Filesystem;
            // Alterado de Documents para Data (App Private Storage) para evitar problemas de permissão no Android
            this.directory = window.Capacitor.Plugins.Filesystem.Directory.Data;

            try {
                // Tenta criar a pasta raiz no diretório privado do aplicativo
                await this.fs.mkdir({
                    path: STORAGE_FOLDER,
                    directory: this.directory,
                    recursive: true
                });
                // Cria pasta para fotos separada
                await this.fs.mkdir({
                    path: `${STORAGE_FOLDER}/${PHOTOS_FOLDER}`,
                    directory: this.directory,
                    recursive: true
                });
                console.log('✅ Estrutura de armazenamento persistente inicializada');
            } catch (e) {
                console.log('Pasta já existente ou erro de inicialização local:', e);
            }
        }
    }

    async saveDatabase(uint8Array) {
        if (!this.fs) return false;
        try {
            const base64Data = this.uint8ToBase64(uint8Array);
            await this.fs.writeFile({
                path: `${STORAGE_FOLDER}/${DB_FILENAME}`,
                data: base64Data,
                directory: this.directory,
                encoding: window.Capacitor.Plugins.Filesystem.Encoding.UTF8 // Para garantir compatibilidade com base64 string
            });
            console.log('💾 Banco SQLite salvo no armazenamento interno do dispositivo');
            return true;
        } catch (e) {
            console.error('Erro ao gravar arquivo SQLite:', e);
            return false;
        }
    }

    async loadDatabase() {
        if (!this.fs) return null;
        try {
            const result = await this.fs.readFile({
                path: `${STORAGE_FOLDER}/${DB_FILENAME}`,
                directory: this.directory
            });
            return this.base64ToUint8(result.data);
        } catch (e) {
            console.log('Nenhum banco físico encontrado, iniciando limpo.');
            return null;
        }
    }

    async saveImage(base64Data) {
        if (!this.fs || !base64Data.startsWith('data:image')) return base64Data;
        
        try {
            const fileName = `pet_${Date.now()}.jpg`;
            const path = `${STORAGE_FOLDER}/${PHOTOS_FOLDER}/${fileName}`;
            const cleanData = base64Data.split(',')[1];

            await this.fs.writeFile({
                path: path,
                data: cleanData,
                directory: this.directory
            });
            
            const uri = await this.fs.getUri({
                path: path,
                directory: this.directory
            });
            
            return window.Capacitor.convertFileSrc(uri.uri);
        } catch (e) {
            console.error('Erro ao salvar imagem no disco:', e);
            return base64Data;
        }
    }

    uint8ToBase64(u8) {
        let b = "";
        for (let i = 0; i < u8.length; i++) b += String.fromCharCode(u8[i]);
        return btoa(b);
    }

    base64ToUint8(b64) {
        const b = atob(b64);
        const u = new Uint8Array(b.length);
        for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
        return u;
    }
}

window.storageService = new StorageService();