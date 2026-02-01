// Sincronizado para APK
class Database {
    constructor() { this.db = null; this.isInitialized = false; }
    async init() {
        if (window.storageService) await window.storageService.init();
        const SQL = await initSqlJs({ locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${f}` });
        let data = window.storageService ? await window.storageService.loadDatabase() : null;
        if (!data) { const ld = localStorage.getItem('hotelPetDB'); if (ld) data = new Uint8Array(JSON.parse(ld)); }
        this.db = data ? new SQL.Database(data) : new SQL.Database();
        if (!data) await this.createTables();
        this.isInitialized = true;
    }
    async saveData() {
        if (!this.db) return;
        const d = this.db.export();
        if (window.storageService && window.Capacitor?.isNativePlatform()) await window.storageService.saveDatabase(d);
        if (d.length < 5000000) localStorage.setItem('hotelPetDB', JSON.stringify(Array.from(d)));
    }
    async addAnimal(a) { this.db.run(`INSERT INTO animals (name, species, tutor_name, tutor_phone, photo_url) VALUES (?,?,?,?,?)`, [a.name, a.species, a.tutor_name, a.tutor_phone, a.photo_url]); await this.saveData(); }
    async updateAnimal(id, a) { this.db.run(`UPDATE animals SET name=?, species=?, tutor_name=?, tutor_phone=?, photo_url=? WHERE id=?`, [a.name, a.species, a.tutor_name, a.tutor_phone, a.photo_url, id]); await this.saveData(); }
    async getAnimals(s = '') { let q = `SELECT * FROM animals WHERE name LIKE ? OR tutor_name LIKE ? ORDER BY name`; return this.executeQuery(q, [`%${s}%`, `%${s}%`]); }
    async getAnimalById(id) { const r = this.executeQuery(`SELECT * FROM animals WHERE id=?`, [id]); return r[0]; }
    async deleteAnimal(id) { this.db.run('DELETE FROM animals WHERE id=?', [id]); await this.saveData(); }
    executeQuery(q, p = []) { const s = this.db.prepare(q); s.bind(p); const r = []; while (s.step()) r.push(s.getAsObject()); s.free(); return r; }
    async createTables() { this.db.run(`CREATE TABLE IF NOT EXISTS animals (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, species TEXT, tutor_name TEXT, tutor_phone TEXT, photo_url TEXT)`); this.db.run(`CREATE TABLE IF NOT EXISTS reservations (id INTEGER PRIMARY KEY AUTOINCREMENT, animal_id INTEGER, checkin_date DATE, checkout_date DATE, status TEXT DEFAULT 'ATIVA')`); }
}
window.db = new Database();