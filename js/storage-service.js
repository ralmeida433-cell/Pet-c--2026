// Serviço de Armazenamento Nativo - Hotel Pet CÁ
const STORAGE_FOLDER = 'HotelPet_Data';
const DB_FILENAME = 'hotel_pet_v1.sqlite';
const PHOTOS_FOLDER = 'photos';

class StorageService {
    constructor() {
        this.fs = null;
        this.directory = null;
    }

    async init() {
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            this.fs = window.Capacitor.Plugins.Filesystem;
            this.directory = window.Capacitor.Plugins.Filesystem.Directory.Documents;

            try {
                // Criar pasta raiz
                await this.fs.mkdir({
                    path: STORAGE_FOLDER,
                    directory: this.directory,
                    recursive: true
                });
                // Criar pasta de fotos
                await this.fs.mkdir({
                    path: `${STORAGE_FOLDER}/${PHOTOS_FOLDER}`,
                    directory: this.directory,
                    recursive: true
                });
                console.log('✅ Pastas criadas no armazenamento do celular');
            } catch (e) {
                console.log('Pastas já existem ou erro: ', e);
            }
        }
    }

    async saveDatabase(uint8Array) {
        if (!this.fs) return false;
        try {
            const base64 = this.uint8ToBase64(uint8Array);
            await this.fs.writeFile({
                path: `${STORAGE_FOLDER}/${DB_FILENAME}`,
                data: base64,
                directory: this.directory
            });
            console.log('💾 Banco SQLite persistido no disco do celular');
            return true;
        } catch (e) {
            console.error('❌ Erro ao persistir banco em disco:', e);
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
            console.log('ℹ️ Nenhum banco encontrado no disco, iniciando novo.');
            return null;
        }
    }

    async saveImage(base64Data) {
        if (!this.fs || !base64Data.startsWith('data:image')) return base64Data;
        
        const fileName = `pet_${Date.now()}.jpg`;
        const path = `${STORAGE_FOLDER}/${PHOTOS_FOLDER}/${fileName}`;
        const data = base64Data.split(',')[1];

        try {
            await this.fs.writeFile({
                path: path,
                data: data,
                directory: this.directory
            });
            
            const uri = await this.fs.getUri({
                path: path,
                directory: this.directory
            });
            
            return window.Capacitor.convertFileSrc(uri.uri);
        } catch (e) {
            console.error('Erro ao salvar foto no disco:', e);
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