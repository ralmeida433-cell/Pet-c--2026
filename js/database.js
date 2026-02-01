class Database {
    constructor() {
        this.db = null;
        this.isInitialized = false;
    }

    async init() {
        try {
            if (window.storageService) await window.storageService.init();

            const SQL = await initSqlJs({
                locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
            });

            let data = null;
            if (window.storageService) data = await window.storageService.loadDatabase();

            if (!data) {
                const localData = localStorage.getItem('hotelPetDB');
                if (localData) {
                    try {
                        data = new Uint8Array(JSON.parse(localData));
                    } catch (e) {}
                }
            }

            this.db = data ? new SQL.Database(data) : new SQL.Database();
            if (!data) {
                await this.createTables();
                await this.insertSampleData();
            }

            this.isInitialized = true;
            console.log('Banco de dados pronto.');
        } catch (error) {
            alert('Erro crítico no banco: ' + error.message);
        }
    }

    async saveData() {
        if (!this.db) return;
        try {
            const data = this.db.export();
            
            // Salva no arquivo do celular (Nativo)
            if (window.storageService && window.Capacitor && window.Capacitor.isNativePlatform()) {
                await window.storageService.saveDatabase(data);
            }

            // Salva no LocalStorage apenas se for pequeno (< 3MB)
            if (data.length < 3000000) {
                localStorage.setItem('hotelPetDB', JSON.stringify(Array.from(data)));
            }
        } catch (error) {
            console.error('Falha ao persistir dados:', error);
        }
    }

    async addAnimal(a) {
        this.db.run(`INSERT INTO animals (name, species, tutor_name, tutor_phone, photo_url) VALUES (?, ?, ?, ?, ?)`,
            [a.name, a.species, a.tutor_name, a.tutor_phone, a.photo_url]);
        await this.saveData();
        return true;
    }

    async updateAnimal(id, a) {
        this.db.run(`UPDATE animals SET name = ?, species = ?, tutor_name = ?, tutor_phone = ?, photo_url = ? WHERE id = ?`,
            [a.name, a.species, a.tutor_name, a.tutor_phone, a.photo_url, id]);
        await this.saveData();
        return true;
    }

    async getAnimals(search = '', species = '') {
        let q = `SELECT * FROM animals WHERE 1=1`;
        const p = [];
        if (search) { q += ` AND (name LIKE ? OR tutor_name LIKE ?)`; p.push(`%${search}%`, `%${search}%`); }
        if (species) { q += ` AND species = ?`; p.push(species); }
        q += ` ORDER BY name`;
        return this.executeQuery(q, p);
    }

    async getAnimalById(id) { return this.executeQuerySingle('SELECT * FROM animals WHERE id = ?', [id]); }
    
    async deleteAnimal(id) {
        this.db.run('DELETE FROM animals WHERE id = ?', [id]);
        await this.saveData();
    }

    executeQuery(q, p = []) {
        try {
            const s = this.db.prepare(q);
            s.bind(p);
            const r = [];
            while (s.step()) r.push(s.getAsObject());
            s.free();
            return r;
        } catch (e) { return []; }
    }

    executeQuerySingle(q, p = []) {
        const r = this.executeQuery(q, p);
        return r.length > 0 ? r[0] : null;
    }

    async createTables() {
        this.db.run(`CREATE TABLE IF NOT EXISTS animals (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, species TEXT, tutor_name TEXT, tutor_phone TEXT, photo_url TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        this.db.run(`CREATE TABLE IF NOT EXISTS reservations (id INTEGER PRIMARY KEY AUTOINCREMENT, animal_id INTEGER, checkin_date DATE, checkout_date DATE, accommodation_type TEXT, kennel_number INTEGER, daily_rate DECIMAL, total_days INTEGER, total_value DECIMAL, status TEXT DEFAULT 'ATIVA')`);
        await this.saveData();
    }

    async insertSampleData() {
        this.db.run(`INSERT INTO animals (name, species, tutor_name, tutor_phone) VALUES ('PANQUECA', 'CÃO', 'MARISTELA', '31992089660')`);
        await this.saveData();
    }

    // Reservas e Dashboard
    async getReservations() { return this.executeQuery(`SELECT r.*, a.name as animal_name, a.tutor_name FROM reservations r JOIN animals a ON r.animal_id = a.id ORDER BY r.checkin_date DESC`); }
    async addReservation(r) { this.db.run(`INSERT INTO reservations (animal_id, checkin_date, checkout_date, accommodation_type, kennel_number, daily_rate, total_days, total_value) VALUES (?,?,?,?,?,?,?,?)`, [r.animal_id, r.checkin_date, r.checkout_date, r.accommodation_type, r.kennel_number, r.daily_rate, r.total_days, r.total_value]); await this.saveData(); }
    async getDashboardStats() {
        const animals = this.executeQuerySingle('SELECT COUNT(*) as count FROM animals');
        const active = this.executeQuerySingle(`SELECT COUNT(*) as count FROM reservations WHERE status = 'ATIVA'`);
        return { totalAnimals: animals?.count || 0, activeReservations: active?.count || 0, monthlyRevenue: 0, occupancyRate: 0 };
    }
}

window.db = new Database();