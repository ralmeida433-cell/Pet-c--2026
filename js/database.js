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
            if (window.storageService) {
                data = await window.storageService.loadDatabase();
            }
            if (!data) {
                const localData = localStorage.getItem('hotelPetDB');
                if (localData) data = new Uint8Array(JSON.parse(localData));
            }

            this.db = data ? new SQL.Database(data) : new SQL.Database();
            
            await this.createTables();
            this.isInitialized = true;
            console.log('✅ Banco SQLite inicializado');
        } catch (error) {
            console.error('Erro ao inicializar banco:', error);
        }
    }

    async saveData() {
        if (!this.db || !this.isInitialized) return;
        try {
            const data = this.db.export();
            if (window.storageService && window.Capacitor?.isNativePlatform()) {
                await window.storageService.saveDatabase(data);
            }
            if (data.length < 5000000) {
                localStorage.setItem('hotelPetDB', JSON.stringify(Array.from(data)));
            }
        } catch (error) {
            console.error('Erro ao salvar:', error);
        }
    }

    executeQuery(query, params = []) {
        try {
            const stmt = this.db.prepare(query);
            stmt.bind(params);
            const results = [];
            while (stmt.step()) {
                results.push(stmt.getAsObject());
            }
            stmt.free();
            return results;
        } catch (error) {
            console.error('Erro na query:', query, error);
            return [];
        }
    }

    async createTables() {
        // Tabela Animais
        this.db.run(`CREATE TABLE IF NOT EXISTS animals (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            name TEXT, species TEXT, tutor_name TEXT, tutor_phone TEXT, photo_url TEXT,
            weight TEXT, vaccination_status TEXT, allergies TEXT, medication TEXT, vet_notes TEXT
        )`);

        // Tabela Reservas
        this.db.run(`CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            animal_id INTEGER,
            accommodation_type TEXT,
            kennel_number INTEGER,
            daily_rate REAL,
            checkin_date DATE,
            checkout_date DATE,
            checkin_time TEXT,
            checkout_time TEXT,
            total_days INTEGER,
            transport_service BOOLEAN,
            transport_value REAL,
            bath_service BOOLEAN,
            bath_value REAL,
            payment_method TEXT,
            total_value REAL,
            status TEXT DEFAULT 'ATIVA'
        )`);
        
        // Tabela Alojamentos
        this.db.run(`CREATE TABLE IF NOT EXISTS kennels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            number INTEGER NOT NULL,
            description TEXT,
            UNIQUE(type, number)
        )`);

        // Tabela Histórico Expandida (Migração automática via IF NOT EXISTS e ALTER)
        this.db.run(`CREATE TABLE IF NOT EXISTS animal_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            animal_id INTEGER,
            type TEXT,
            date DATE,
            description TEXT,
            vac_name TEXT,
            vac_dose TEXT,
            vac_lote TEXT,
            vac_lab TEXT,
            vac_vet TEXT,
            next_date DATE,
            vac_reactions TEXT,
            price REAL
        )`);

        // Garantir novas colunas se o banco já existia
        const historyCols = this.executeQuery("PRAGMA table_info(animal_history)").map(c => c.name);
        if (!historyCols.includes('vac_name')) this.db.run(`ALTER TABLE animal_history ADD COLUMN vac_name TEXT`);
        if (!historyCols.includes('next_date')) this.db.run(`ALTER TABLE animal_history ADD COLUMN next_date DATE`);
        if (!historyCols.includes('vac_dose')) this.db.run(`ALTER TABLE animal_history ADD COLUMN vac_dose TEXT`);

        await this.saveData();
    }

    // --- MÉTODOS DE ANIMALS ---
    async addAnimal(a) { 
        this.db.run(`INSERT INTO animals (name, species, tutor_name, tutor_phone, photo_url, weight, vaccination_status, allergies, medication, vet_notes) VALUES (?,?,?,?,?,?,?,?,?,?)`, 
        [a.name, a.species, a.tutor_name, a.tutor_phone, a.photo_url, a.weight, a.vaccination_status, a.allergies, a.medication, a.vet_notes]); 
        await this.saveData(); 
    }
    async updateAnimal(id, a) { 
        this.db.run(`UPDATE animals SET name=?, species=?, tutor_name=?, tutor_phone=?, photo_url=?, weight=?, vaccination_status=?, allergies=?, medication=?, vet_notes=? WHERE id=?`, 
        [a.name, a.species, a.tutor_name, a.tutor_phone, a.photo_url, a.weight, a.vaccination_status, a.allergies, a.medication, a.vet_notes, id]); 
        await this.saveData(); 
    }
    async deleteAnimal(id) { 
        this.db.run('DELETE FROM animals WHERE id=?', [id]); 
        this.db.run('DELETE FROM animal_history WHERE animal_id=?', [id]); 
        await this.saveData(); 
    }
    async getAnimals(s = '') { return this.executeQuery(`SELECT * FROM animals WHERE name LIKE ? OR tutor_name LIKE ? ORDER BY name`, [`%${s}%`, `%${s}%`]); }
    async getAnimalById(id) { const r = this.executeQuery(`SELECT * FROM animals WHERE id=?`, [id]); return r[0]; }

    // --- MÉTODOS DE HISTÓRICO ---
    async addAnimalHistory(h) {
        this.db.run(`INSERT INTO animal_history (animal_id, type, date, description, vac_name, vac_dose, vac_lote, vac_lab, vac_vet, next_date, vac_reactions, price) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, 
            [h.animal_id, h.type, h.date, h.description, h.vac_name, h.vac_dose, h.vac_lote, h.vac_lab, h.vac_vet, h.next_date, h.vac_reactions, h.price]);
        await this.saveData();
    }
    async getAnimalHistory(animalId) {
        return this.executeQuery(`SELECT * FROM animal_history WHERE animal_id = ? ORDER BY date DESC`, [animalId]);
    }
    async deleteAnimalHistory(id) {
        this.db.run('DELETE FROM animal_history WHERE id=?', [id]);
        await this.saveData();
    }

    // --- MÉTODOS DE RESERVAS ---
    async getReservations(search = '', status = '', month = '') {
        let q = `SELECT r.*, a.name as animal_name, a.species as animal_species, a.tutor_name, a.tutor_phone, a.photo_url 
                 FROM reservations r LEFT JOIN animals a ON r.animal_id = a.id WHERE 1=1`;
        const p = [];
        if (search) { q += ` AND (a.name LIKE ? OR a.tutor_name LIKE ?)`; p.push(`%${search}%`, `%${search}%`); }
        if (status) { q += ` AND r.status = ?`; p.push(status); }
        if (month) { q += ` AND r.checkin_date LIKE ?`; p.push(`${month}%`); }
        q += ` ORDER BY r.checkin_date DESC`;
        return this.executeQuery(q, p);
    }
    async getReservationById(id) {
        const q = `SELECT r.*, a.name as animal_name, a.species as animal_species, a.tutor_name, a.tutor_phone, a.photo_url 
                   FROM reservations r LEFT JOIN animals a ON r.animal_id = a.id WHERE r.id = ?`;
        const r = this.executeQuery(q, [id]);
        return r[0];
    }
    async addReservation(r) {
        const q = `INSERT INTO reservations (animal_id, accommodation_type, kennel_number, daily_rate, checkin_date, checkout_date, total_days, transport_service, transport_value, bath_service, bath_value, payment_method, total_value, status) 
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?, 'ATIVA')`;
        this.db.run(q, [r.animal_id, r.accommodation_type, r.kennel_number, r.daily_rate, r.checkin_date, r.checkout_date, r.total_days, r.transport_service, r.transport_value, r.bath_service, r.bath_value, r.payment_method, r.total_value]);
        await this.saveData();
    }
    async updateReservation(id, r) {
        const q = `UPDATE reservations SET animal_id=?, accommodation_type=?, kennel_number=?, daily_rate=?, checkin_date=?, checkout_date=?, total_days=?, transport_service=?, transport_value=?, bath_service=?, bath_value=?, payment_method=?, total_value=?, status=? WHERE id=?`;
        this.db.run(q, [r.animal_id, r.accommodation_type, r.kennel_number, r.daily_rate, r.checkin_date, r.checkout_date, r.total_days, r.transport_service, r.transport_value, r.bath_service, r.bath_value, r.payment_method, r.total_value, r.status, id]);
        await this.saveData();
    }
    async deleteReservation(id) { this.db.run('DELETE FROM reservations WHERE id=?', [id]); await this.saveData(); }
    async getOccupiedKennels(start, end) {
        const q = `SELECT accommodation_type, kennel_number FROM reservations WHERE status = 'ATIVA' AND ((checkin_date BETWEEN ? AND ?) OR (checkout_date BETWEEN ? AND ?) OR (? BETWEEN checkin_date AND checkout_date))`;
        return this.executeQuery(q, [start, end, start, end, start]);
    }

    // --- MÉTODOS DE KENNELS ---
    async getAllKennels() { return this.executeQuery(`SELECT * FROM kennels ORDER BY type, number`); }
    async addKennel(type, number, description) { this.db.run(`INSERT INTO kennels (type, number, description) VALUES (?, ?, ?)`, [type, number, description]); await this.saveData(); }
    async deleteKennel(id) { this.db.run('DELETE FROM kennels WHERE id=?', [id]); await this.saveData(); }
    async getNextKennelNumber(type) { const result = this.executeQuery(`SELECT MAX(number) as max_number FROM kennels WHERE type = ?`, [type]); return (result[0]?.max_number || 0) + 1; }

    // --- MÉTODOS DE DASHBOARD ---
    async getDashboardStats() {
        const totalAnimals = this.executeQuery('SELECT COUNT(*) as count FROM animals')[0]?.count || 0;
        const activeRes = this.executeQuery("SELECT COUNT(*) as count FROM reservations WHERE status = 'ATIVA'")[0]?.count || 0;
        const totalKennels = this.executeQuery('SELECT COUNT(*) as count FROM kennels')[0]?.count || 0;
        const revenue = this.executeQuery("SELECT SUM(total_value) as sum FROM reservations WHERE status = 'ATIVA'")[0]?.sum || 0;
        const occupancyRate = totalKennels > 0 ? Math.round((activeRes / totalKennels) * 100) : 0;
        return { totalAnimals, activeReservations: activeRes, monthlyRevenue: revenue, occupancyRate, totalKennels };
    }
    async getRecentReservations(limit = 5) { return this.executeQuery(`SELECT r.*, a.name as animal_name, a.photo_url FROM reservations r LEFT JOIN animals a ON r.animal_id = a.id ORDER BY r.id DESC LIMIT ?`, [limit]); }
    async getMonthlyData() { return this.executeQuery(`SELECT strftime('%Y-%m', checkin_date) as month, COUNT(*) as reservations, SUM(total_value) as revenue FROM reservations GROUP BY month ORDER BY month DESC LIMIT 12`); }
    async getKennelTypeData() { return this.executeQuery(`SELECT accommodation_type as kennel_type, COUNT(*) as count FROM reservations WHERE status = 'ATIVA' GROUP BY kennel_type`); }
}
window.db = new Database();