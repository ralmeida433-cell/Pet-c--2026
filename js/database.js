class Database {
    constructor() {
        this.db = null;
        this.isInitialized = false;
    }

    async init() {
        try {
            if (window.storageService) {
                await window.storageService.init();
            }

            const SQL = await initSqlJs({
                locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
            });

            let data = null;
            if (window.storageService) {
                data = await window.storageService.loadDatabase();
            }

            if (!data) {
                const localData = localStorage.getItem('hotelPetDB');
                if (localData) {
                    try {
                        data = new Uint8Array(JSON.parse(localData));
                    } catch (e) {
                        console.error('Erro ao converter dados do localStorage');
                    }
                }
            }

            if (data) {
                this.db = new SQL.Database(data);
                console.log('Banco de dados carregado com sucesso.');
            } else {
                this.db = new SQL.Database();
                await this.createTables();
                await this.insertSampleData();
            }

            this.isInitialized = true;
            await this.saveData();

        } catch (error) {
            console.error('Erro fatal ao inicializar banco:', error);
            throw error;
        }
    }

    async saveData() {
        if (!this.db) return;
        try {
            const data = this.db.export();
            
            // 1. Prioridade: Capacitor Filesystem (Aplicativo Nativo)
            if (window.storageService && window.Capacitor && window.Capacitor.isNativePlatform()) {
                await window.storageService.saveDatabase(data);
            }

            // 2. Secundário: LocalStorage (Apenas se for pequeno o suficiente)
            // Limitamos a 4MB para evitar travamentos do navegador
            if (data.length < 4000000) {
                try {
                    localStorage.setItem('hotelPetDB', JSON.stringify(Array.from(data)));
                } catch (e) {
                    console.warn('LocalStorage cheio ou indisponível.');
                }
            }
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
        }
    }

    // --- Métodos de Animais ---
    async addAnimal(animal) {
        try {
            this.db.run(`INSERT INTO animals (name, species, tutor_name, tutor_phone, photo_url) VALUES (?, ?, ?, ?, ?)`,
                [animal.name, animal.species, animal.tutor_name, animal.tutor_phone, animal.photo_url]);
            await this.saveData();
            return true;
        } catch (e) {
            console.error('Erro no INSERT animal:', e);
            throw e;
        }
    }

    async updateAnimal(id, animal) {
        try {
            this.db.run(`UPDATE animals SET name = ?, species = ?, tutor_name = ?, tutor_phone = ?, photo_url = ? WHERE id = ?`,
                [animal.name, animal.species, animal.tutor_name, animal.tutor_phone, animal.photo_url, id]);
            await this.saveData();
            return true;
        } catch (e) {
            console.error('Erro no UPDATE animal:', e);
            throw e;
        }
    }

    async getAnimals(search = '', kennelType = '') {
        let query = `SELECT * FROM animals WHERE 1=1`;
        const params = [];
        if (search) {
            query += ` AND (name LIKE ? OR tutor_name LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }
        if (kennelType) {
            query += ` AND species = ?`;
            params.push(kennelType);
        }
        query += ` ORDER BY name`;
        return this.executeQuery(query, params);
    }

    async getAnimalById(id) {
        return this.executeQuerySingle('SELECT * FROM animals WHERE id = ?', [id]);
    }

    async deleteAnimal(id) {
        const activeReservations = this.executeQuerySingle(`SELECT COUNT(*) as count FROM reservations WHERE animal_id = ? AND status = 'ATIVA'`, [id]);
        if (activeReservations && activeReservations.count > 0) {
            throw new Error('Não é possível excluir animal com reservas ativas');
        }
        this.db.run('DELETE FROM animals WHERE id = ?', [id]);
        await this.saveData();
    }

    // --- Outros métodos ---
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
            console.error('Erro ao executar query:', error);
            return [];
        }
    }

    executeQuerySingle(query, params = []) {
        try {
            const stmt = this.db.prepare(query);
            stmt.bind(params);
            let result = null;
            if (stmt.step()) {
                result = stmt.getAsObject();
            }
            stmt.free();
            return result;
        } catch (error) {
            console.error('Erro ao executar query single:', error);
            return null;
        }
    }

    async createTables() {
        this.db.run(`CREATE TABLE IF NOT EXISTS animals (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, species TEXT, tutor_name TEXT, tutor_phone TEXT, photo_url TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        this.db.run(`CREATE TABLE IF NOT EXISTS reservations (id INTEGER PRIMARY KEY AUTOINCREMENT, animal_id INTEGER, checkin_date DATE, checkout_date DATE, checkin_time TIME, checkout_time TIME, accommodation_type TEXT, kennel_number INTEGER, daily_rate DECIMAL(10,2), total_days INTEGER, transport_service BOOLEAN, transport_value DECIMAL(10,2), bath_service BOOLEAN, bath_value DECIMAL(10,2), total_value DECIMAL(10,2), payment_method TEXT, status TEXT, whatsapp_receipt BOOLEAN, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        this.db.run(`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT, category TEXT, brand TEXT, animals TEXT, cost_price DECIMAL(10,2), sale_price DECIMAL(10,2), current_stock INTEGER, min_stock INTEGER, weight DECIMAL(10,3), expiry_date DATE, supplier TEXT, description TEXT, image_url TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        this.db.run(`CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, product_id TEXT, product_name TEXT, quantity INTEGER, unit_price DECIMAL(10,2), total_price DECIMAL(10,2), cost_price DECIMAL(10,2), total_cost DECIMAL(10,2), profit DECIMAL(10,2), date DATE, customer TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        await this.saveData();
    }

    async insertSampleData() {
        const sampleAnimals = [['PANQUECA', 'CÃO', 'MARISTELA', '31992089660', null]];
        sampleAnimals.forEach(animal => {
            this.db.run(`INSERT INTO animals (name, species, tutor_name, tutor_phone, photo_url) VALUES (?, ?, ?, ?, ?)`, animal);
        });
        await this.saveData();
    }

    // --- Métodos de Reservas ---
    async getReservations(search = '', status = '', month = '') {
        let query = `SELECT r.*, a.name as animal_name, a.species as animal_species, a.tutor_name FROM reservations r JOIN animals a ON r.animal_id = a.id WHERE 1=1`;
        const params = [];
        if (search) { query += ` AND (a.name LIKE ? OR a.tutor_name LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }
        if (status) { query += ` AND r.status = ?`; params.push(status); }
        if (month) { query += ` AND strftime('%Y-%m', r.checkin_date) = ?`; params.push(month); }
        query += ` ORDER BY r.checkin_date DESC`;
        return this.executeQuery(query, params);
    }

    async getReservationById(id) { return this.executeQuerySingle(`SELECT r.*, a.name as animal_name, a.species as animal_species, a.tutor_name FROM reservations r JOIN animals a ON r.animal_id = a.id WHERE r.id = ?`, [id]); }
    async addReservation(r) { this.db.run(`INSERT INTO reservations (animal_id, checkin_date, checkout_date, checkin_time, checkout_time, accommodation_type, kennel_number, daily_rate, total_days, transport_service, transport_value, bath_service, bath_value, total_value, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [r.animal_id, r.checkin_date, r.checkout_date, r.checkin_time, r.checkout_time, r.accommodation_type, r.kennel_number, r.daily_rate, r.total_days, r.transport_service ? 1 : 0, r.transport_value || 0, r.bath_service ? 1 : 0, r.bath_value || 0, r.total_value, r.payment_method, 'ATIVA']); await this.saveData(); }
    async updateReservation(id, r) { this.db.run(`UPDATE reservations SET animal_id = ?, checkin_date = ?, checkout_date = ?, checkin_time = ?, checkout_time = ?, accommodation_type = ?, kennel_number = ?, daily_rate = ?, total_days = ?, transport_service = ?, transport_value = ?, bath_service = ?, bath_value = ?, total_value = ?, payment_method = ?, status = ? WHERE id = ?`, [r.animal_id, r.checkin_date, r.checkout_date, r.checkin_time, r.checkout_time, r.accommodation_type, r.kennel_number, r.daily_rate, r.total_days, r.transport_service ? 1 : 0, r.transport_value || 0, r.bath_service ? 1 : 0, r.bath_value || 0, r.total_value, r.payment_method, r.status, id]); await this.saveData(); }
    async deleteReservation(id) { this.db.run('DELETE FROM reservations WHERE id = ?', [id]); await this.saveData(); }
    async getOccupiedKennels(checkin, checkout) { return this.executeQuery(`SELECT accommodation_type, kennel_number FROM reservations WHERE status = 'ATIVA' AND NOT (checkout_date <= ? OR checkin_date >= ?)`, [checkin, checkout]); }
    async getDashboardStats() {
        const totalAnimals = this.executeQuerySingle('SELECT COUNT(*) as count FROM animals');
        const activeReservations = this.executeQuerySingle(`SELECT COUNT(*) as count FROM reservations WHERE status = 'ATIVA'`);
        const monthlyRevenue = this.executeQuerySingle(`SELECT COALESCE(SUM(total_value), 0) as revenue FROM reservations WHERE strftime('%Y-%m', checkin_date) = strftime('%Y-%m', 'now') AND status IN ('ATIVA', 'FINALIZADA')`);
        return { totalAnimals: totalAnimals?.count || 0, activeReservations: activeReservations?.count || 0, monthlyRevenue: monthlyRevenue?.revenue || 0, occupancyRate: Math.round((activeReservations.count / 15) * 100) };
    }
    async getMonthlyData() { return this.executeQuery(`SELECT strftime('%Y-%m', checkin_date) as month, COUNT(*) as reservations, SUM(total_value) as revenue FROM reservations WHERE checkin_date >= date('now', '-12 months') GROUP BY month ORDER BY month`); }
    async getKennelTypeData() { return this.executeQuery(`SELECT accommodation_type, COUNT(*) as count FROM reservations WHERE status = 'ATIVA' GROUP BY accommodation_type`); }
    async getRecentReservations(limit = 5) { return this.executeQuery(`SELECT r.*, a.name as animal_name, a.species as animal_species, a.tutor_name, a.photo_url FROM reservations r JOIN animals a ON r.animal_id = a.id ORDER BY r.created_at DESC LIMIT ?`, [limit]); }
    
    // --- Métodos de Estoque ---
    async getProducts() { const products = this.executeQuery('SELECT * FROM products ORDER BY name'); return products.map(p => ({ ...p, animals: JSON.parse(p.animals || '[]'), costPrice: p.cost_price, salePrice: p.sale_price, currentStock: p.current_stock, minStock: p.min_stock, expiryDate: p.expiry_date, imageUrl: p.image_url })); }
    async addProduct(p) { this.db.run(`INSERT INTO products (id, name, category, brand, animals, cost_price, sale_price, current_stock, min_stock, weight, expiry_date, supplier, description, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [p.id, p.name, p.category, p.brand, JSON.stringify(p.animals), p.costPrice, p.salePrice, p.currentStock, p.minStock, p.weight, p.expiryDate, p.supplier, p.description, p.imageUrl]); await this.saveData(); }
    async updateProduct(id, p) { this.db.run(`UPDATE products SET name = ?, category = ?, brand = ?, animals = ?, cost_price = ?, sale_price = ?, current_stock = ?, min_stock = ?, weight = ?, expiry_date = ?, supplier = ?, description = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [p.name, p.category, p.brand, JSON.stringify(p.animals), p.costPrice, p.salePrice, p.currentStock, p.minStock, p.weight, p.expiryDate, p.supplier, p.description, p.imageUrl, id]); await this.saveData(); }
    async deleteProduct(id) { this.db.run('DELETE FROM products WHERE id = ?', [id]); await this.saveData(); }
    async getSales() { const sales = this.executeQuery('SELECT * FROM sales ORDER BY date DESC'); return sales.map(s => ({ ...s, productId: s.product_id, productName: s.product_name, unitPrice: s.unit_price, totalPrice: s.total_price, costPrice: s.cost_price, totalCost: s.total_cost })); }
    async addSale(s) { this.db.run(`INSERT INTO sales (id, product_id, product_name, quantity, unit_price, total_price, cost_price, total_cost, profit, date, customer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [s.id, s.productId, s.productName, s.quantity, s.unit_price, s.total_price, s.cost_price, s.total_cost, s.profit, s.date, s.customer]); await this.saveData(); }
}

window.db = new Database();