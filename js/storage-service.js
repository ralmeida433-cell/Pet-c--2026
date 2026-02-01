// Serviço de Armazenamento Persistente usando Capacitor Filesystem
const STORAGE_FOLDER = 'HotelPet_Data';
const DB_FILENAME = 'database.sqlite';
const PHOTOS_FOLDER = 'photos';

class StorageService {
    constructor() {
        this.baseDir = 'DOCUMENTS';
        this.fs = null;
    }

    async init() {
        if (window.Capacitor && window.Capacitor.Plugins.Filesystem) {
            this.fs = window.Capacitor.Plugins.Filesystem;
            this.Directory = window.Capacitor.Plugins.Filesystem.Directory;

            try {
                await this.fs.mkdir({
                    path: STORAGE_FOLDER,
                    directory: this.Directory.Documents,
                    recursive: true
                });
                await this.fs.mkdir({
                    path: `${STORAGE_FOLDER}/${PHOTOS_FOLDER}`,
                    directory: this.Directory.Documents,
                    recursive: true
                });
                console.log('Pastas nativas prontas.');
            } catch (e) {
                console.warn('Erro ao criar pastas, tentando fallback...');
                this.baseDir = 'DATA';
            }
        }
    }

    async saveDatabase(dataArray) {
        if (!this.fs) return false;
        try {
            const base64String = this.uint8ToBase64(dataArray);
            await this.fs.writeFile({
                path: `${STORAGE_FOLDER}/${DB_FILENAME}`,
                data: base64String,
                directory: this.baseDir === 'DOCUMENTS' ? this.Directory.Documents : this.Directory.Data
            });
            return true;
        } catch (e) {
            console.error('Erro ao salvar DB nativo:', e);
            return false;
        }
    }

    async loadDatabase() {
        if (!this.fs) return null;
        try {
            const result = await this.fs.readFile({
                path: `${STORAGE_FOLDER}/${DB_FILENAME}`,
                directory: this.baseDir === 'DOCUMENTS' ? this.Directory.Documents : this.Directory.Data
            });
            if (result && result.data) return this.base64ToUint8(result.data);
        } catch (e) {
            return null;
        }
    }

    // Salva imagem em disco e retorna o caminho
    async saveImage(base64Data) {
        if (!this.fs || !base64Data || !base64Data.startsWith('data:image')) return base64Data;

        const fileName = `pet_${Date.now()}.jpg`;
        const path = `${STORAGE_FOLDER}/${PHOTOS_FOLDER}/${fileName}`;
        const dataOnly = base64Data.split(',')[1];

        try {
            await this.fs.writeFile({
                path: path,
                data: dataOnly,
                directory: this.baseDir === 'DOCUMENTS' ? this.Directory.Documents : this.Directory.Data
            });

            const uriResult = await this.fs.getUri({
                path: path,
                directory: this.baseDir === 'DOCUMENTS' ? this.Directory.Documents : this.Directory.Data
            });

            return window.Capacitor.convertFileSrc(uriResult.uri);
        } catch (e) {
            console.error('Erro ao salvar imagem física:', e);
            return base64Data;
        }
    }

    uint8ToBase64(u8Arr) {
        let bin = "";
        for (let i = 0; i < u8Arr.length; i++) bin += String.fromCharCode(u8Arr[i]);
        return btoa(bin);
    }

    base64ToUint8(base64) {
        const bin = atob(base64);
        const u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        return u8;
    }
}

window.storageService = new StorageService();