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
                    data = new Uint8Array(JSON.parse(localData));
                }
            }

            if (data) {
                this.db = new SQL.Database(data);
            } else {
                this.db = new SQL.Database();
                await this.createTables();
                await this.insertSampleData();
            }

            this.isInitialized = true;
            await this.saveData();

        } catch (error) {
            console.error('Error initializing database:', error);
            throw error;
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
        this.db.run(`
            CREATE TABLE IF NOT EXISTS animals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                species TEXT NOT NULL DEFAULT 'CÃO',
                tutor_name TEXT NOT NULL,
                tutor_phone TEXT NOT NULL,
                photo_url TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS reservations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                animal_id INTEGER NOT NULL,
                checkin_date DATE NOT NULL,
                checkout_date DATE NOT NULL,
                checkin_time TIME DEFAULT '14:00',
                checkout_time TIME DEFAULT '12:00',
                accommodation_type TEXT NOT NULL DEFAULT 'INTERNO',
                kennel_number INTEGER NOT NULL DEFAULT 1,
                daily_rate DECIMAL(10,2) NOT NULL,
                total_days INTEGER NOT NULL,
                transport_service BOOLEAN DEFAULT 0,
                transport_value DECIMAL(10,2) DEFAULT 0,
                bath_service BOOLEAN DEFAULT 0,
                bath_value DECIMAL(10,2) DEFAULT 0,
                total_value DECIMAL(10,2) NOT NULL,
                payment_method TEXT NOT NULL,
                status TEXT DEFAULT 'ATIVA' CHECK(status IN ('ATIVA', 'FINALIZADA', 'CANCELADA')),
                whatsapp_receipt BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (animal_id) REFERENCES animals (id)
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                brand TEXT,
                animals TEXT,
                cost_price DECIMAL(10,2) NOT NULL,
                sale_price DECIMAL(10,2) NOT NULL,
                current_stock INTEGER NOT NULL,
                min_stock INTEGER NOT NULL,
                weight DECIMAL(10,3),
                expiry_date DATE,
                supplier TEXT,
                description TEXT,
                image_url TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS sales (
                id TEXT PRIMARY KEY,
                product_id TEXT NOT NULL,
                product_name TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(10,2) NOT NULL,
                total_price DECIMAL(10,2) NOT NULL,
                cost_price DECIMAL(10,2) NOT NULL,
                total_cost DECIMAL(10,2) NOT NULL,
                profit DECIMAL(10,2) NOT NULL,
                date DATE NOT NULL,
                customer TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products (id)
            )
        `);

        await this.saveData();
    }

    async insertSampleData() {
        const sampleAnimals = [
            ['PANQUECA', 'CÃO', 'MARISTELA', '31992089660', null],
            ['JOAQUIM', 'GATO', 'ELVIO', '31995524326', null]
        ];
        sampleAnimals.forEach(animal => {
            this.db.run(`INSERT INTO animals (name, species, tutor_name, tutor_phone, photo_url) VALUES (?, ?, ?, ?, ?)`, animal);
        });
        await this.saveData();
    }

    async saveData() {
        if (this.db) {
            try {
                const data = this.db.export();
                if (window.storageService) {
                    await window.storageService.saveDatabase(data);
                }
                try {
                    localStorage.setItem('hotelPetDB', JSON.stringify(Array.from(data)));
                } catch (e) {}
            } catch (error) {
                console.warn('Erro ao salvar dados:', error);
            }
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

    async addAnimal(animal) {
        this.db.run(`INSERT INTO animals (name, species, tutor_name, tutor_phone, photo_url) VALUES (?, ?, ?, ?, ?)`,
            [animal.name, animal.species, animal.tutor_name, animal.tutor_phone, animal.photo_url]);
        await this.saveData();
    }

    async updateAnimal(id, animal) {
        this.db.run(`UPDATE animals SET name = ?, species = ?, tutor_name = ?, tutor_phone = ?, photo_url = ? WHERE id = ?`,
            [animal.name, animal.species, animal.tutor_name, animal.tutor_phone, animal.photo_url, id]);
        await this.saveData();
    }

    async deleteAnimal(id) {
        const activeReservations = this.executeQuerySingle(`SELECT COUNT(*) as count FROM reservations WHERE animal_id = ? AND status = 'ATIVA'`, [id]);
        if (activeReservations && activeReservations.count > 0) {
            throw new Error('Não é possível excluir animal com reservas ativas');
        }
        this.db.run('DELETE FROM animals WHERE id = ?', [id]);
        await this.saveData();
    }

    async getReservations(search = '', status = '', month = '') {
        let query = `
            SELECT r.*, a.name as animal_name, a.species as animal_species, a.tutor_name 
            FROM reservations r 
            JOIN animals a ON r.animal_id = a.id 
            WHERE 1=1
        `;
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
            query += ` AND strftime('%Y-%m', r.checkin_date) = ?`;
            params.push(month);
        }
        query += ` ORDER BY r.checkin_date DESC`;
        return this.executeQuery(query, params);
    }

    async getReservationById(id) {
        return this.executeQuerySingle(`
            SELECT r.*, a.name as animal_name, a.species as animal_species, a.tutor_name 
            FROM reservations r 
            JOIN animals a ON r.animal_id = a.id 
            WHERE r.id = ?
        `, [id]);
    }

    async addReservation(reservation) {
        this.db.run(`INSERT INTO reservations (animal_id, checkin_date, checkout_date, checkin_time, checkout_time, accommodation_type, kennel_number, daily_rate, total_days, transport_service, transport_value, bath_service, bath_value, total_value, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [reservation.animal_id, reservation.checkin_date, reservation.checkout_date, reservation.checkin_time, reservation.checkout_time, reservation.accommodation_type, reservation.kennel_number, reservation.daily_rate, reservation.total_days, reservation.transport_service ? 1 : 0, reservation.transport_value || 0, reservation.bath_service ? 1 : 0, reservation.bath_value || 0, reservation.total_value, reservation.payment_method, 'ATIVA']);
        await this.saveData();
    }

    async updateReservation(id, reservation) {
        this.db.run(`UPDATE reservations SET animal_id = ?, checkin_date = ?, checkout_date = ?, checkin_time = ?, checkout_time = ?, accommodation_type = ?, kennel_number = ?, daily_rate = ?, total_days = ?, transport_service = ?, transport_value = ?, bath_service = ?, bath_value = ?, total_value = ?, payment_method = ?, status = ? WHERE id = ?`,
            [reservation.animal_id, reservation.checkin_date, reservation.checkout_date, reservation.checkin_time, reservation.checkout_time, reservation.accommodation_type, reservation.kennel_number, reservation.daily_rate, reservation.total_days, reservation.transport_service ? 1 : 0, reservation.transport_value || 0, reservation.bath_service ? 1 : 0, reservation.bath_value || 0, reservation.total_value, reservation.payment_method, reservation.status, id]);
        await this.saveData();
    }

    async deleteReservation(id) {
        this.db.run('DELETE FROM reservations WHERE id = ?', [id]);
        await this.saveData();
    }

    async getOccupiedKennels(checkin, checkout) {
        return this.executeQuery(`SELECT accommodation_type, kennel_number FROM reservations WHERE status = 'ATIVA' AND NOT (checkout_date <= ? OR checkin_date >= ?)`, [checkin, checkout]);
    }

    async getDashboardStats() {
        const totalAnimals = this.executeQuerySingle('SELECT COUNT(*) as count FROM animals');
        const activeReservations = this.executeQuerySingle(`SELECT COUNT(*) as count FROM reservations WHERE status = 'ATIVA'`);
        const monthlyRevenue = this.executeQuerySingle(`SELECT COALESCE(SUM(total_value), 0) as revenue FROM reservations WHERE strftime('%Y-%m', checkin_date) = strftime('%Y-%m', 'now') AND status IN ('ATIVA', 'FINALIZADA')`);
        const totalAccommodations = 5 + 6 + 4;
        const occupancyRate = totalAccommodations > 0 ? (activeReservations.count / totalAccommodations) * 100 : 0;
        return {
            totalAnimals: totalAnimals?.count || 0,
            activeReservations: activeReservations?.count || 0,
            monthlyRevenue: monthlyRevenue?.revenue || 0,
            occupancyRate: Math.round(occupancyRate)
        };
    }

    async getMonthlyData() {
        return this.executeQuery(`
            SELECT strftime('%Y-%m', checkin_date) as month, COUNT(*) as reservations, SUM(total_value) as revenue 
            FROM reservations 
            WHERE checkin_date >= date('now', '-12 months') 
            GROUP BY month 
            ORDER BY month
        `);
    }

    async getKennelTypeData() {
        return this.executeQuery(`
            SELECT accommodation_type, COUNT(*) as count 
            FROM reservations 
            WHERE status = 'ATIVA' 
            GROUP BY accommodation_type
        `);
    }

    async getRecentReservations(limit = 5) {
        return this.executeQuery(`
            SELECT r.*, a.name as animal_name, a.species as animal_species, a.tutor_name, a.photo_url
            FROM reservations r 
            JOIN animals a ON r.animal_id = a.id 
            ORDER BY r.created_at DESC 
            LIMIT ?
        `, [limit]);
    }

    async getProducts() {
        const products = this.executeQuery('SELECT * FROM products ORDER BY name');
        return products.map(p => ({
            ...p,
            animals: JSON.parse(p.animals || '[]'),
            costPrice: p.cost_price,
            salePrice: p.sale_price,
            currentStock: p.current_stock,
            minStock: p.min_stock,
            expiryDate: p.expiry_date,
            imageUrl: p.image_url
        }));
    }

    async addProduct(product) {
        this.db.run(`
            INSERT INTO products (id, name, category, brand, animals, cost_price, sale_price, current_stock, min_stock, weight, expiry_date, supplier, description, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            product.id, product.name, product.category, product.brand, JSON.stringify(product.animals),
            product.costPrice, product.salePrice, product.currentStock, product.minStock,
            product.weight, product.expiryDate, product.supplier, product.description, product.imageUrl
        ]);
        await this.saveData();
    }

    async updateProduct(id, product) {
        this.db.run(`
            UPDATE products SET name = ?, category = ?, brand = ?, animals = ?, cost_price = ?, sale_price = ?, current_stock = ?, min_stock = ?, weight = ?, expiry_date = ?, supplier = ?, description = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            product.name, product.category, product.brand, JSON.stringify(product.animals),
            product.costPrice, product.salePrice, product.currentStock, product.minStock,
            product.weight, product.expiryDate, product.supplier, product.description, product.imageUrl, id
        ]);
        await this.saveData();
    }

    async deleteProduct(id) {
        this.db.run('DELETE FROM products WHERE id = ?', [id]);
        await this.saveData();
    }

    async getSales() {
        const sales = this.executeQuery('SELECT * FROM sales ORDER BY date DESC');
        return sales.map(s => ({
            ...s,
            productId: s.product_id,
            productName: s.product_name,
            unitPrice: s.unit_price,
            totalPrice: s.total_price,
            costPrice: s.cost_price,
            totalCost: s.total_cost
        }));
    }

    async addSale(sale) {
        this.db.run(`
            INSERT INTO sales (id, product_id, product_name, quantity, unit_price, total_price, cost_price, total_cost, profit, date, customer)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            sale.id, sale.productId, sale.productName, sale.quantity, sale.unitPrice,
            sale.totalPrice, sale.costPrice, sale.totalCost, sale.profit, sale.date, sale.customer
        ]);
        await this.saveData();
    }
}

window.db = new Database();