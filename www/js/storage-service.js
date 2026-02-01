// Sincronizado para APK
const STORAGE_FOLDER = 'HotelPet_Data';
const DB_FILENAME = 'database.sqlite';
const PHOTOS_FOLDER = 'photos';
class StorageService {
    constructor() { this.baseDir = 'DOCUMENTS'; this.fs = null; }
    async init() {
        if (window.Capacitor && window.Capacitor.Plugins.Filesystem) {
            this.fs = window.Capacitor.Plugins.Filesystem; this.Directory = window.Capacitor.Plugins.Filesystem.Directory;
            try {
                await this.fs.mkdir({ path: STORAGE_FOLDER, directory: this.Directory.Documents, recursive: true });
                await this.fs.mkdir({ path: `${STORAGE_FOLDER}/${PHOTOS_FOLDER}`, directory: this.Directory.Documents, recursive: true });
            } catch (e) { this.baseDir = 'DATA'; }
        }
    }
    async saveDatabase(data) {
        if (!this.fs) return false;
        try {
            await this.fs.writeFile({ path: `${STORAGE_FOLDER}/${DB_FILENAME}`, data: this.uint8ToBase64(data), directory: this.baseDir === 'DOCUMENTS' ? this.Directory.Documents : this.Directory.Data });
            return true;
        } catch (e) { return false; }
    }
    async loadDatabase() {
        if (!this.fs) return null;
        try {
            const res = await this.fs.readFile({ path: `${STORAGE_FOLDER}/${DB_FILENAME}`, directory: this.baseDir === 'DOCUMENTS' ? this.Directory.Documents : this.Directory.Data });
            return this.base64ToUint8(res.data);
        } catch (e) { return null; }
    }
    async saveImage(base64) {
        if (!this.fs || !base64.startsWith('data:image')) return base64;
        try {
            const fileName = `pet_${Date.now()}.jpg`;
            const path = `${STORAGE_FOLDER}/${PHOTOS_FOLDER}/${fileName}`;
            await this.fs.writeFile({ path, data: base64.split(',')[1], directory: this.baseDir === 'DOCUMENTS' ? this.Directory.Documents : this.Directory.Data });
            const uri = await this.fs.getUri({ path, directory: this.baseDir === 'DOCUMENTS' ? this.Directory.Documents : this.Directory.Data });
            return window.Capacitor.convertFileSrc(uri.uri);
        } catch (e) { return base64; }
    }
    uint8ToBase64(u8) { let b = ""; for (let i = 0; i < u8.length; i++) b += String.fromCharCode(u8[i]); return btoa(b); }
    base64ToUint8(b64) { const b = atob(b64); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
}
window.storageService = new StorageService();