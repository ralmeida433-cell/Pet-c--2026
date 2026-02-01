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
            
            if (!data) {
                await this.createTables();
                await this.insertSampleData();
            }

            this.isInitialized = true;
            console.log('✅ Banco SQLite inicializado com sucesso');
        } catch (error) {
            console.error('Erro ao inicializar banco:', error);
            alert('Erro crítico no banco: ' + error.message);
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
            console.log('💾 Dados salvos no dispositivo');
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
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
        this.db.run(`CREATE TABLE IF NOT EXISTS animals (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            name TEXT NOT NULL, 
            species TEXT NOT NULL, 
            tutor_name TEXT NOT NULL, 
            tutor_phone TEXT, 
            photo_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        this.db.run(`CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            animal_id INTEGER,
            accommodation_type TEXT,
            kennel_number INTEGER,
            daily_rate REAL,
            checkin_date DATE,
            checkout_date DATE,
            checkin_time TEXT DEFAULT '14:00',
            checkout_time TEXT DEFAULT '12:00',
            total_days INTEGER,
            transport_service BOOLEAN DEFAULT 0,
            transport_value REAL DEFAULT 0,
            bath_service BOOLEAN DEFAULT 0,
            bath_value REAL DEFAULT 0,
            payment_method TEXT,
            total_value REAL,
            status TEXT DEFAULT 'ATIVA',
            whatsapp_receipt BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (animal_id) REFERENCES animals (id)
        )`);
        await this.saveData();
    }

    async insertSampleData() {
        // Animal de exemplo
        this.db.run(`INSERT OR IGNORE INTO animals (name, species, tutor_name, tutor_phone) 
                     VALUES ('PANQUECA', 'CÃO', 'MARISTELA', '31992089660')`);
        await this.saveData();
    }

    // ===== MÉTODOS DE ANIMALS =====
    async addAnimal(animalData) {
        if (!this.isInitialized) throw new Error('Banco não inicializado');
        const query = `INSERT INTO animals (name, species, tutor_name, tutor_phone, photo_url) VALUES (?, ?, ?, ?, ?)`;
        this.db.run(query, [
            animalData.name || '',
            animalData.species || 'CÃO',
            animalData.tutor_name || '',
            animalData.tutor_phone || '',
            animalData.photo_url || null
        ]);
        await this.saveData();
        console.log('✅ Animal adicionado:', animalData.name);
        return true;
    }

    async updateAnimal(id, animalData) {
        if (!this.isInitialized) throw new Error('Banco não inicializado');
        const query = `UPDATE animals SET name = ?, species = ?, tutor_name = ?, tutor_phone = ?, photo_url = ? WHERE id = ?`;
        this.db.run(query, [
            animalData.name || '',
            animalData.species || 'CÃO',
            animalData.tutor_name || '',
            animalData.tutor_phone || '',
            animalData.photo_url || null,
            id
        ]);
        await this.saveData();
        console.log('✅ Animal atualizado ID:', id);
        return true;
    }

    async deleteAnimal(id) {
        if (!this.isInitialized) throw new Error('Banco não inicializado');
        this.db.run('DELETE FROM animals WHERE id = ?', [id]);
        await this.saveData();
        console.log('🗑️ Animal deletado ID:', id);
        return true;
    }

    async getAnimals(search = '') {
        if (!this.isInitialized) return [];
        const query = search ? 
            `SELECT * FROM animals WHERE name LIKE ? OR tutor_name LIKE ? ORDER BY name ASC` :
            `SELECT * FROM animals ORDER BY name ASC`;
        const params = search ? [`%${search}%`, `%${search}%`] : [];
        return this.executeQuery(query, params);
    }

    async getAnimalById(id) {
        if (!this.isInitialized) return null;
        const results = this.executeQuery('SELECT * FROM animals WHERE id = ?', [id]);
        return results[0] || null;
    }

    // ===== MÉTODOS DE RESERVAS (básicos) =====
    async getReservations(search = '', status = '', month = '') {
        let query = `SELECT r.*, a.name as animal_name, a.species as animal_species, a.tutor_name 
                     FROM reservations r LEFT JOIN animals a ON r.animal_id = a.id 
                     WHERE 1=1`;
        const params = [];

        if (search) {
            query += ` AND (a.name LIKE ? OR a.tutor_name LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }
        if (status) {
            query += ` AND r.status = ?`;
            params.push(status);
        }
        if (month) {
            query += ` AND r.checkin_date LIKE ?`;
            params.push(`${month}%`);
        }
        query += ` ORDER BY r.checkin_date DESC`;

        return this.executeQuery(query, params);
    }

    async addReservation(reservationData) {
        const query = `INSERT INTO reservations (
            animal_id, accommodation_type, kennel_number, daily_rate, checkin_date, checkout_date,
            total_days, transport_service, transport_value, bath_service, bath_value,
            payment_method, total_value, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        this.db.run(query, [
            reservationData.animal_id,
            reservationData.accommodation_type,
            reservationData.kennel_number,
            reservationData.daily_rate,
            reservationData.checkin_date,
            reservationData.checkout_date,
            reservationData.total_days,
            reservationData.transport_service ? 1 : 0,
            reservationData.transport_value || 0,
            reservationData.bath_service ? 1 : 0,
            reservationData.bath_value || 0,
            reservationData.payment_method,
            reservationData.total_value,
            'ATIVA'
        ]);
        await this.saveData();
        return true;
    }

    // Outros métodos...
    async getDashboardStats() {
        const totalAnimals = this.executeQuery('SELECT COUNT(*) as count FROM animals')[0]?.count || 0;
        const activeReservations = this.executeQuery("SELECT COUNT(*) as count FROM reservations WHERE status = 'ATIVA'")[0]?.count || 0;
        return { totalAnimals, activeReservations, monthlyRevenue: 0, occupancyRate: 0 };
    }
}

window.db = new Database();