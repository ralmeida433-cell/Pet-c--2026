// Sincronizado para APK
const STORAGE_FOLDER = 'HotelPet_Data';
const DB_FILENAME = 'hotel_pet_v1.sqlite';
const PHOTOS_FOLDER = 'photos';
class StorageService {
    constructor() { this.fs = null; this.directory = null; }
    async init() {
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            this.fs = window.Capacitor.Plugins.Filesystem;
            this.directory = window.Capacitor.Plugins.Filesystem.Directory.Documents;
            try {
                await this.fs.mkdir({ path: STORAGE_FOLDER, directory: this.directory, recursive: true });
                await this.fs.mkdir({ path: `${STORAGE_FOLDER}/${PHOTOS_FOLDER}`, directory: this.directory, recursive: true });
            } catch (e) {}
        }
    }
    async saveDatabase(u8) {
        if (!this.fs) return false;
        try {
            await this.fs.writeFile({ path: `${STORAGE_FOLDER}/${DB_FILENAME}`, data: this.uint8ToBase64(u8), directory: this.directory });
            return true;
        } catch (e) { return false; }
    }
    async loadDatabase() {
        if (!this.fs) return null;
        try {
            const res = await this.fs.readFile({ path: `${STORAGE_FOLDER}/${DB_FILENAME}`, directory: this.directory });
            return this.base64ToUint8(res.data);
        } catch (e) { return null; }
    }
    async saveImage(b64) {
        if (!this.fs || !b64.startsWith('data:image')) return b64;
        try {
            const fileName = `pet_${Date.now()}.jpg`;
            const path = `${STORAGE_FOLDER}/${PHOTOS_FOLDER}/${fileName}`;
            await this.fs.writeFile({ path, data: b64.split(',')[1], directory: this.directory });
            const uri = await this.fs.getUri({ path, directory: this.directory });
            return window.Capacitor.convertFileSrc(uri.uri);
        } catch (e) { return b64; }
    }
    uint8ToBase64(u8) { let b = ""; for (let i = 0; i < u8.length; i++) b += String.fromCharCode(u8[i]); return btoa(b); }
    base64ToUint8(b64) { const b = atob(b64); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
}
window.storageService = new StorageService();