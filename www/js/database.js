class Database {
    constructor() {
        this.db = null;
        this.isInitialized = false;
    }

    async init() {
        try {
            // Inicializar serviço de armazenamento
            if (window.storageService) {
                await window.storageService.init();
            }

            const SQL = await initSqlJs({
                locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
            });

            let data = null;

            // Tentar carregar do arquivo primeiro (Prioridade 1)
            if (window.storageService) {
                console.log('Tentando carregar do arquivo...');
                data = await window.storageService.loadDatabase();
            }

            // Se não tiver arquivo, tentar do localStorage (Prioridade 2 - Migração)
            if (!data) {
                console.log('Arquivo não encontrado, verificando localStorage...');
                const localData = localStorage.getItem('hotelPetDB');
                if (localData) {
                    data = new Uint8Array(JSON.parse(localData));
                    console.log('Dados carregados do localStorage (Migração)');
                }
            }

            if (data) {
                this.db = new SQL.Database(data);
                console.log('Database loaded from persistence successfully');
            } else {
                console.log('Criando novo banco de dados...');
                this.db = new SQL.Database();
                await this.createTables();
                await this.insertSampleData();
            }

            this.isInitialized = true;

            // Salvar imediatamente no novo formato se carregou do localStorage ou criou novo
            this.saveData();

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
        // ESTRUTURA COMPLETA COM TODAS AS COLUNAS NECESSÁRIAS
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

        // Migração simples para colunas novas se a tabela já existir
        try {
            this.db.run(`ALTER TABLE reservations ADD COLUMN whatsapp_receipt BOOLEAN DEFAULT 0`);
        } catch (e) {
            // Coluna já existe, não faz nada
        }

        this.db.run(`
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                brand TEXT,
                animals TEXT, -- Array JSON
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

        this.saveData();
        console.log('Tabelas criadas com sucesso');
    }

    async insertSampleData() {
        console.log('Inserindo dados de exemplo...');

        const sampleAnimals = [
            ['PANQUECA', 'CÃO', 'MARISTELA', '31992089660', null],
            ['BOB', 'CÃO', 'MIRIAM', '31986336833', null],
            ['THEO', 'CÃO', 'EDNA', '31985685911', null],
            ['MAKI', 'CÃO', 'SOLANGE', '31988672867', null],
            ['CISSA', 'CÃO', 'VALERIA', '31997373957', null],
            ['AMORA', 'CÃO', 'VALERIA', '31997373957', null],
            ['LOLA', 'CÃO', 'VERA', '31986993086', null],
            ['LUMA', 'CÃO', 'DAYANE', '31988163017', null],
            ['THOR', 'CÃO', 'RODRIGO CHOCOLATES', '31999779474', null],
            ['KYRA', 'CÃO', 'RODRIGO CHOCOLATES', '31999779474', null],
            ['AUGUSTO', 'CÃO', 'MARCIA', '31991979422', null],
            ['BELL', 'CÃO', 'BERENICE', '31985128285', null],
            ['FRED', 'CÃO', 'BERENICE', '31985128285', null],
            ['BRANQUINHO', 'CÃO', 'SAULO', '31987501520', null],
            ['LOLA', 'CÃO', 'FERNANDO', '31983512011', null],
            ['BARTO', 'CÃO', 'FERNANDO', '31983512011', null],
            ['BELA', 'CÃO', 'GRAZIELA', '31988340824', null],
            ['NINA', 'CÃO', 'FABRICIO', '31983104724', null],
            ['AMORA', 'CÃO', 'FABRICIA', '31989698878', null],
            ['TANCINHA', 'CÃO', 'CHIQUINHO', '31992694246', null],
            ['ZEUS', 'CÃO', 'VANESSA', '31996841686', null],
            ['DUCK', 'CÃO', 'FABIOLA', '31988075000', null],
            ['JOAQUIM', 'GATO', 'ELVIO', '31995524326', null]
        ];

        sampleAnimals.forEach(animal => {
            this.db.run(`INSERT INTO animals (name, species, tutor_name, tutor_phone, photo_url) VALUES (?, ?, ?, ?, ?)`, animal);
        });

        const sampleReservations = [
            [1, '2024-01-02', '2024-01-06', '14:00', '12:00', 'INTERNO', 1, 30.00, 4, 0, 0, 0, 0, 120.00, 'DEBITO', 'FINALIZADA'],
            [2, '2024-01-02', '2024-01-08', '15:30', '11:00', 'INTERNO', 2, 45.00, 6, 0, 0, 1, 40.00, 310.00, 'CREDITO', 'FINALIZADA'],
            [3, '2024-01-03', '2024-01-12', '16:00', '10:30', 'INTERNO', 3, 45.00, 9, 1, 30.00, 1, 70.00, 484.00, 'CREDITO', 'FINALIZADA'],
            [4, '2024-01-02', '2024-01-12', '14:00', '12:00', 'INTERNO', 4, 45.00, 10, 0, 0, 0, 0, 450.00, 'PIX', 'FINALIZADA'],
            [5, '2024-02-09', '2024-02-15', '15:00', '11:00', 'EXTERNO', 1, 45.00, 6, 1, 24.00, 0, 0, 294.00, 'CREDITO', 'FINALIZADA'],
            [11, '2024-03-28', '2024-04-01', '16:00', '12:00', 'EXTERNO', 2, 45.00, 4, 1, 24.00, 1, 45.00, 249.00, 'CREDITO', 'FINALIZADA'],
            [18, '2024-04-25', '2024-04-30', '14:30', '11:30', 'EXTERNO', 3, 45.00, 5, 1, 14.00, 1, 45.00, 284.00, 'CREDITO', 'FINALIZADA'],
            [21, '2025-05-30', '2025-06-02', '15:30', '12:00', 'GATIL', 1, 50.00, 3, 0, 0, 1, 50.00, 200.00, 'DEBITO', 'FINALIZADA'],
            [12, '2025-06-18', '2025-06-23', '14:00', '12:00', 'INTERNO', 1, 50.00, 5, 0, 0, 0, 0, 250.00, 'CREDITO', 'ATIVA'],
            [18, '2025-06-25', '2025-06-30', '15:00', '11:30', 'EXTERNO', 2, 50.00, 5, 1, 28.00, 0, 0, 278.00, 'CREDITO', 'ATIVA'],
            [9, '2025-06-27', '2025-07-02', '16:30', '12:30', 'EXTERNO', 3, 50.00, 5, 1, 32.00, 1, 60.00, 342.00, 'PIX', 'ATIVA'],
            [23, '2025-06-28', '2025-07-03', '14:30', '11:00', 'GATIL', 1, 45.00, 5, 0, 0, 0, 0, 225.00, 'PIX', 'ATIVA']
        ];

        sampleReservations.forEach(reservation => {
            this.db.run(`INSERT INTO reservations (animal_id, checkin_date, checkout_date, checkin_time, checkout_time, accommodation_type, kennel_number, daily_rate, total_days, transport_service, transport_value, bath_service, bath_value, total_value, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, reservation);
        });

        this.saveData();
        console.log('Dados de exemplo inseridos com sucesso');
    }

    async saveData() {
        if (this.db) {
            try {
                const data = this.db.export();

                // 1. Tentar salvar no arquivo (Principal)
                if (window.storageService) {
                    await window.storageService.saveDatabase(data);
                }

                // 2. Fallback/Cache no localStorage (apenas se for pequeno o suficiente ou como backup)
                // Opcional: remover se o banco for muito grande
                try {
                    localStorage.setItem('hotelPetDB', JSON.stringify(Array.from(data)));
                } catch (e) {
                    console.warn('LocalStorage cheio ou indisponível (normal para App):', e);
                }
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
        this.saveData();
    }

    async updateAnimal(id, animal) {
        this.db.run(`UPDATE animals SET name = ?, species = ?, tutor_name = ?, tutor_phone = ?, photo_url = ? WHERE id = ?`,
            [animal.name, animal.species, animal.tutor_name, animal.tutor_phone, animal.photo_url, id]);
        this.saveData();
    }

    async deleteAnimal(id) {
        const activeReservations = this.executeQuerySingle(`SELECT COUNT(*) as count FROM reservations WHERE animal_id = ? AND status = 'ATIVA'`, [id]);
        if (activeReservations && activeReservations.count > 0) {
            throw new Error('Não é possível excluir animal com reservas ativas');
        }
        this.db.run('DELETE FROM animals WHERE id = ?', [id]);
        this.saveData();
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
        this.saveData();
    }

    async updateReservation(id, reservation) {
        this.db.run(`UPDATE reservations SET animal_id = ?, checkin_date = ?, checkout_date = ?, checkin_time = ?, checkout_time = ?, accommodation_type = ?, kennel_number = ?, daily_rate = ?, total_days = ?, transport_service = ?, transport_value = ?, bath_service = ?, bath_value = ?, total_value = ?, payment_method = ?, status = ? WHERE id = ?`,
            [reservation.animal_id, reservation.checkin_date, reservation.checkout_date, reservation.checkin_time, reservation.checkout_time, reservation.accommodation_type, reservation.kennel_number, reservation.daily_rate, reservation.total_days, reservation.transport_service ? 1 : 0, reservation.transport_value || 0, reservation.bath_service ? 1 : 0, reservation.bath_value || 0, reservation.total_value, reservation.payment_method, reservation.status, id]);
        this.saveData();
    }

    async deleteReservation(id) {
        this.db.run('DELETE FROM reservations WHERE id = ?', [id]);
        this.saveData();
    }

    async getOccupiedKennels(checkin, checkout) {
        return this.executeQuery(`SELECT accommodation_type, kennel_number FROM reservations WHERE status = 'ATIVA' AND NOT (checkout_date <= ? OR checkin_date >= ?)`, [checkin, checkout]);
    }

    async getDashboardStats() {
        const totalAnimals = this.executeQuerySingle('SELECT COUNT(*) as count FROM animals');
        const activeReservations = this.executeQuerySingle(`SELECT COUNT(*) as count FROM reservations WHERE status = 'ATIVA'`);
        const monthlyRevenue = this.executeQuerySingle(`SELECT COALESCE(SUM(total_value), 0) as revenue FROM reservations WHERE strftime('%Y-%m', checkin_date) = strftime('%Y-%m', 'now') AND status IN ('ATIVA', 'FINALIZADA')`);

        const totalAccommodations = 5 + 6 + 4; // Interno + Externo + Gatil
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
            SELECT r.*, a.name as animal_name, a.species as animal_species, a.tutor_name 
            FROM reservations r 
            JOIN animals a ON r.animal_id = a.id 
            ORDER BY r.created_at DESC 
            LIMIT ?
        `, [limit]);
    }

    // --- Métodos de Estoque ---

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
        this.saveData();
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
        this.saveData();
    }

    async deleteProduct(id) {
        this.db.run('DELETE FROM products WHERE id = ?', [id]);
        this.saveData();
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
        this.saveData();
    }
}

window.db = new Database();
