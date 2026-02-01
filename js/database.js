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

            // Tentar carregar banco do disco (Android/iOS)
            let data = null;
            if (window.storageService) {
                data = await window.storageService.loadDatabase();
            }

            // Fallback para LocalStorage se estiver no PC/Browser
            if (!data) {
                const localData = localStorage.getItem('hotelPetDB');
                if (localData) {
                    data = new Uint8Array(JSON.parse(localData));
                }
            }

            this.db = data ? new SQL.Database(data) : new SQL.Database();
            
            if (!data) {
                await this.createTables();
                await this.insertSampleData();
            }

            this.isInitialized = true;
            console.log('✅ Banco de Dados SQLite operacional');
        } catch (error) {
            console.error('Falha crítica no banco:', error);
            alert('Erro ao carregar banco de dados: ' + error.message);
        }
    }

    async saveData() {
        if (!this.db) return;
        try {
            const data = this.db.export();
            
            // Persistência Nativa (Celular)
            if (window.storageService && window.Capacitor && window.Capacitor.isNativePlatform()) {
                await window.storageService.saveDatabase(data);
            }

            // Persistência Web (Backup leve)
            if (data.length < 5000000) {
                localStorage.setItem('hotelPetDB', JSON.stringify(Array.from(data)));
            }
        } catch (error) {
            console.error('Erro ao persistir dados:', error);
        }
    }

    // Métodos de Animais
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

    async deleteAnimal(id) {
        this.db.run('DELETE FROM animals WHERE id = ?', [id]);
        await this.saveData();
        return true;
    }

    async getAnimals(search = '') {
        const q = search ? 
            [`SELECT * FROM animals WHERE name LIKE ? OR tutor_name LIKE ? ORDER BY name`, [`%${search}%`, `%${search}%`]] :
            [`SELECT * FROM animals ORDER BY name`, []];
        
        return this.executeQuery(q[0], q[1]);
    }

    async getAnimalById(id) {
        const res = this.executeQuery(`SELECT * FROM animals WHERE id = ?`, [id]);
        return res[0] || null;
    }

    // Auxiliares
    executeQuery(q, p = []) {
        try {
            const stmt = this.db.prepare(q);
            stmt.bind(p);
            const res = [];
            while (stmt.step()) res.push(stmt.getAsObject());
            stmt.free();
            return res;
        } catch (e) { return []; }
    }

    async createTables() {
        this.db.run(`CREATE TABLE IF NOT EXISTS animals (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, species TEXT, tutor_name TEXT, tutor_phone TEXT, photo_url TEXT)`);
        this.db.run(`CREATE TABLE IF NOT EXISTS reservations (id INTEGER PRIMARY KEY AUTOINCREMENT, animal_id INTEGER, checkin_date DATE, checkout_date DATE, status TEXT DEFAULT 'ATIVA')`);
        await this.saveData();
    }

    async insertSampleData() {
        this.db.run(`INSERT INTO animals (name, species, tutor_name, tutor_phone) VALUES ('PANQUECA', 'CÃO', 'MARISTELA', '31992089660')`);
        await this.saveData();
    }

    // Reservas e Dashboard
    async getReservations() { return this.executeQuery(`SELECT r.*, a.name as animal_name, a.tutor_name FROM reservations r JOIN animals a ON r.animal_id = a.id ORDER BY r.checkin_date DESC`); }
    async addReservation(r) { this.db.run(`INSERT INTO reservations (animal_id, checkin_date, checkout_date) VALUES (?,?,?)`, [r.animal_id, r.checkin_date, r.checkout_date]); await this.saveData(); }
    async getDashboardStats() {
        const animals = this.executeQuery(`SELECT COUNT(*) as count FROM animals`);
        const active = this.executeQuery(`SELECT COUNT(*) as count FROM reservations WHERE status = 'ATIVA'`);
        return { totalAnimals: animals[0]?.count || 0, activeReservations: active[0]?.count || 0, monthlyRevenue: 0, occupancyRate: 0 };
    }
}

window.db = new Database();