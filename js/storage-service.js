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
            // Directory.Data é o local mais seguro e persistente para APKs sem pedir permissões
            this.directory = window.Capacitor.Plugins.Filesystem.Directory.Data;

            try {
                await this.fs.mkdir({
                    path: STORAGE_FOLDER,
                    directory: this.directory,
                    recursive: true
                });
                await this.fs.mkdir({
                    path: `${STORAGE_FOLDER}/${PHOTOS_FOLDER}`,
                    directory: this.directory,
                    recursive: true
                });
                console.log('✅ Sistema de arquivos Android inicializado');
            } catch (e) {
                console.log('Pastas já existem ou erro silencioso.');
            }
        }
    }

    async saveDatabase(uint8Array) {
        if (!this.fs) return false;
        try {
            // Conversão robusta para Base64 para evitar estouro de pilha
            let binary = '';
            const bytes = new Uint8Array(uint8Array);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const base64Data = window.btoa(binary);

            await this.fs.writeFile({
                path: `${STORAGE_FOLDER}/${DB_FILENAME}`,
                data: base64Data,
                directory: this.directory
                // Removido Encoding para que o Capacitor trate como Base64 puro
            });
            console.log('💾 Banco SQLite persistido no hardware');
            return true;
        } catch (e) {
            console.error('Erro fatal ao salvar no hardware:', e);
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
            
            // Conversão inversa robusta
            const binary = window.atob(result.data);
            const len = binary.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return bytes;
        } catch (e) {
            console.log('Nenhum banco anterior no hardware, iniciando novo.');
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
            
            const uri = await this.fs.getUri({ path: path, directory: this.directory });
            return window.Capacitor.convertFileSrc(uri.uri);
        } catch (e) {
            return base64Data;
        }
    }
}

window.storageService = new StorageService();