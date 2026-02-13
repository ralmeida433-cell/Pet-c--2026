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
                if (localData) {
                    try {
                        // Tenta primeiro carregar como Base64 (mais eficiente)
                        if (!localData.trim().startsWith('[') && !localData.trim().startsWith('{')) {
                            const binary = atob(localData);
                            data = new Uint8Array(binary.length);
                            for (let i = 0; i < binary.length; i++) data[i] = binary.charCodeAt(i);
                        } else {
                            // Suporte para dados legados (Array JSON)
                            data = new Uint8Array(JSON.parse(localData));
                        }
                    } catch (e) {
                        console.error('Erro ao carregar do localStorage:', e);
                    }
                }
            }

            this.db = data ? new SQL.Database(data) : new SQL.Database();

            if (!data) {
                await this.createTables();
                await this.insertSampleData();
            } else {
                await this.createKennelsTableIfMissing();
                await this.createAnimalHistoryTableIfMissing();
                // Check if we need to seed (if user has only the sample 'PANQUECA' or very few animals)
                const count = this.executeQuery("SELECT COUNT(*) as count FROM animals")[0]?.count || 0;
                if (count <= 1) {
                    await this.insertSampleData();
                }
            }

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
            // Fallback para localStorage (limitado a 5MB)
            if (data.length < 5000000) {
                // Conversão rápida para Base64 antes de salvar no localStorage
                let binary = '';
                const len = data.byteLength;
                for (let i = 0; i < len; i++) binary += String.fromCharCode(data[i]);
                localStorage.setItem('hotelPetDB', btoa(binary));
            }
            // Sincronização automática com Drive (se configurado)
            if (window.driveSync) window.driveSync.syncData(true);
        } catch (error) {
            console.error('Erro crítico ao salvar:', error);
            if (window.hotelPetApp) {
                window.hotelPetApp.showNotification('⚠️ Erro ao salvar dados! Verifique o armazenamento do celular.', 'error', 5000);
            }
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
            name TEXT, species TEXT, tutor_name TEXT, tutor_phone TEXT, photo_url TEXT,
            weight TEXT, vaccination_status TEXT, allergies TEXT, medication TEXT, vet_notes TEXT,
            sex TEXT DEFAULT 'M'
        )`);

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

        this.db.run(`CREATE TABLE IF NOT EXISTS kennels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            number INTEGER NOT NULL,
            description TEXT,
            UNIQUE(type, number)
        )`);

        this.db.run(`CREATE TABLE IF NOT EXISTS animal_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            animal_id INTEGER,
            type TEXT,
            date DATE,
            description TEXT
        )`);

        await this.saveData();
    }

    async createKennelsTableIfMissing() {
        try {
            this.db.run(`CREATE TABLE IF NOT EXISTS kennels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                number INTEGER NOT NULL,
                description TEXT,
                UNIQUE(type, number)
            )`);
            await this.saveData();
        } catch (e) { console.warn(e); }
    }

    async createAnimalHistoryTableIfMissing() {
        try {
            this.db.run(`CREATE TABLE IF NOT EXISTS animal_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                animal_id INTEGER,
                type TEXT,
                date DATE,
                description TEXT
            )`);
            const animalColumns = this.executeQuery("PRAGMA table_info(animals)");
            const columnNames = animalColumns.map(c => c.name);
            if (!columnNames.includes('weight')) this.db.run(`ALTER TABLE animals ADD COLUMN weight TEXT`);
            if (!columnNames.includes('vaccination_status')) this.db.run(`ALTER TABLE animals ADD COLUMN vaccination_status TEXT`);
            if (!columnNames.includes('allergies')) this.db.run(`ALTER TABLE animals ADD COLUMN allergies TEXT`);
            if (!columnNames.includes('medication')) this.db.run(`ALTER TABLE animals ADD COLUMN medication TEXT`);
            if (!columnNames.includes('vet_notes')) this.db.run(`ALTER TABLE animals ADD COLUMN vet_notes TEXT`);
            if (!columnNames.includes('sex')) this.db.run(`ALTER TABLE animals ADD COLUMN sex TEXT DEFAULT 'M'`);

            // Rodar migração de dados de sexo
            await this.migrateSexData();

            await this.saveData();
        } catch (e) { console.warn(e); }
    }

    async migrateSexData() {
        // Mapa de nomes para sexo baseado na lista fornecida
        const sexMap = {
            'AKIRA': 'M', 'ALEGRA': 'F', 'ALVIM': 'M', 'AMORA': 'F', 'APOLLO': 'M', 'ASGARD': 'M', 'ATHENA': 'F', 'AUGUSTO': 'M',
            'BABALO': 'M', 'BARTO': 'M', 'BELLA': 'F', 'BELL': 'F', 'BELA': 'F', 'BILLY': 'M', 'BISTECA': 'M', 'BOLINHA': 'M',
            'BOB': 'M', 'BORIS': 'M', 'BRANQUINHO': 'M', 'BRISA': 'F', 'BRUCE': 'M', 'CACAU': 'M', 'CARECA': 'M', 'CHANEL': 'F',
            'CHICO': 'M', 'CHOCOLATE': 'M', 'CIBBA': 'F', 'CINDY': 'F', 'COOKIE': 'M', 'DUDU': 'M', 'DUCK': 'M', 'DUKE': 'M',
            'DINHO': 'M', 'DOBBY': 'M', 'EVA': 'F', 'ESTRELA': 'F', 'FILO': 'M', 'FRED': 'M', 'GAIA': 'F', 'GALO': 'M',
            'GIBBS': 'M', 'HERON': 'M', 'HARRY': 'M', 'HULK': 'M', 'IVAN': 'M', 'IVY': 'F', 'IVIE': 'F', 'IZZY': 'F',
            'JAMANTA': 'M', 'JADE': 'F', 'JIMMY': 'M', 'JOAQUIM': 'M', 'JOCA': 'M', 'JOFFRE': 'M', 'KELVIN': 'M', 'KEVIN': 'M',
            'KIKO': 'M', 'KIRA': 'F', 'KYARA': 'F', 'KYRA': 'F', 'LEÃO': 'M', 'LEVI': 'M', 'LILICA': 'F', 'LIZ': 'F',
            'LOLA': 'F', 'LOLLA': 'F', 'LOGAN': 'M', 'LUDO': 'M', 'LULU': 'F', 'LUA': 'F', 'LUMA': 'F', 'LUNA': 'F',
            'LUPPY': 'F', 'LUP': 'F', 'LUCK': 'M', 'MADALENA': 'F', 'MAYA': 'F', 'MAKI': 'M', 'MARSHAL': 'M', 'MARIA': 'F',
            'MARLEY': 'M', 'MEDUSA': 'F', 'MEL': 'F', 'MELZINHA': 'F', 'MESSIE': 'F', 'MILI': 'F', 'MONNA': 'F', 'NICK': 'M',
            'NINA': 'F', 'NIRI': 'F', 'NOOPY': 'M', 'PANQUECA': 'F', 'PIPOCA': 'F', 'PRINCIPESSA': 'F', 'PUCA': 'F', 'RAICHU': 'F',
            'RAIO': 'M', 'RUBI': 'F', 'RYDE': 'M', 'SEAN': 'M', 'SERENA': 'F', 'SHAKIRA': 'F', 'SIDNEI': 'M', 'SOL': 'M',
            'SUSHI': 'M', 'TAISON': 'M', 'TANGUINHA': 'F', 'THEO': 'M', 'THOR': 'M', 'TOBIAS': 'M', 'TOY': 'M', 'ULISSES': 'M',
            'VALERIA': 'F', 'ZECA': 'M', 'ZE DA MANGA': 'M', 'ZEUS': 'M', 'ZION': 'M', 'ZOE': 'F', 'ZULEIKA': 'F'
        };

        const animals = await this.executeQuery("SELECT id, name, sex FROM animals");
        if (animals.length === 0) return;

        // Verifica se a migração já ocorreu (se todos são 'M' padrão e nomes femininos existem)
        // Mas como acabamos de criar a coluna, ela deve estar default 'M'. Vamos forçar update baseado no nome.

        let updates = 0;
        this.db.exec("BEGIN TRANSACTION");
        for (const a of animals) {
            const upperName = (a.name || '').toUpperCase().trim();
            // Check direct map
            if (sexMap[upperName]) {
                this.db.run("UPDATE animals SET sex = ? WHERE id = ?", [sexMap[upperName], a.id]);
                updates++;
            } else {
                // Heuristic fallback
                // Nomes terminados em A geralmente Femenino (exceto alguns), others M
                if (upperName.endsWith('A') && !['JOCA', 'LUCA', 'SIMBA', 'PANDA'].includes(upperName)) {
                    this.db.run("UPDATE animals SET sex = 'F' WHERE id = ?", [a.id]);
                }
                // Default already 'M'
            }
        }
        this.db.exec("COMMIT");
        if (updates > 0) console.log(`Migrou sexo de ${updates} animais.`);
    }

    async insertSampleData() {
        const animalsToSeed = [
            { name: 'AKIRA', species: 'CÃO', tutor: 'TIAGO', phone: '31 98891-4998' },
            { name: 'ALEGRA', species: 'CÃO', tutor: 'CARLA', phone: '' },
            { name: 'ALVIM', species: 'CÃO', tutor: 'GERALDO', phone: '' },
            { name: 'AMORA', species: 'CÃO', tutor: 'VALERIA', phone: '31 93737-3937' },
            { name: 'AMORA', species: 'CÃO', tutor: 'RACHEL', phone: '' },
            { name: 'AMORA', species: 'CÃO', tutor: 'FABRICIA', phone: '31 98960-8878' },
            { name: 'APOLLO', species: 'CÃO', tutor: 'ANGELA', phone: '31 99126-5170' },
            { name: 'ASGARD', species: 'CÃO', tutor: 'ADRIAN', phone: '31 99763-7853' },
            { name: 'ATHENA', species: 'GATO', tutor: 'LUCIANA', phone: '' },
            { name: 'AUGUSTO', species: 'CÃO', tutor: 'MARCIA', phone: '31 99187-9422' },
            { name: 'BABALO', species: 'CÃO', tutor: 'ALESSANDRA', phone: '31 99685-0229' },
            { name: 'BARTO', species: 'CÃO', tutor: 'FERNANDO', phone: '31 98351-2011' },
            { name: 'BELLA', species: 'CÃO', tutor: 'GIDON', phone: '31 99877-2856' },
            { name: 'BELL', species: 'CÃO', tutor: 'BERENICE', phone: '31 98512-8285' },
            { name: 'BELA', species: 'CÃO', tutor: 'GRAZIELA', phone: '31 98834-0824' },
            { name: 'BILLY', species: 'CÃO', tutor: 'JOYCE', phone: '' },
            { name: 'BISTECA', species: 'CÃO', tutor: 'LEO COELHO', phone: '' },
            { name: 'BOLINHA', species: 'CÃO', tutor: 'FRED', phone: '' },
            { name: 'BOB', species: 'CÃO', tutor: 'MIRIAM', phone: '31 98613-6833' },
            { name: 'BOB', species: 'CÃO', tutor: 'BRUNA', phone: '31 97123-9227' },
            { name: 'BORIS', species: 'CÃO', tutor: 'HELEN', phone: '' },
            { name: 'BRANQUINHO', species: 'CÃO', tutor: 'SAULO', phone: '31 98750-1520' },
            { name: 'BRISA', species: 'CÃO', tutor: 'LUISA', phone: '' },
            { name: 'BRUCE', species: 'CÃO', tutor: 'FRED', phone: '31 99362-3146' },
            { name: 'CACAU', species: 'CÃO', tutor: 'ELAINE', phone: '31 98817-2751' },
            { name: 'CARECA', species: 'CÃO', tutor: 'SILVIO', phone: '' },
            { name: 'CHANEL', species: 'CÃO', tutor: 'BRUNO', phone: '31 99925-4298' },
            { name: 'CHICO', species: 'CÃO', tutor: 'MARIANA', phone: '' },
            { name: 'CHOCOLATE', species: 'CÃO', tutor: 'RODRIGO', phone: '31 99977-9474' },
            { name: 'CIBBA', species: 'CÃO', tutor: 'VALERIA', phone: '31 93737-3937' },
            { name: 'CINDY', species: 'CÃO', tutor: 'NATALIA', phone: '' },
            { name: 'COOKIE', species: 'CÃO', tutor: 'JANAINA', phone: '31 97122-9580' },
            { name: 'DUDU', species: 'CÃO', tutor: 'ISABEL', phone: '' },
            { name: 'DUCK', species: 'CÃO', tutor: 'FABIOLA', phone: '31 98887-5000' },
            { name: 'DUKE', species: 'CÃO', tutor: 'PRISCILA', phone: '31 99388-3869' },
            { name: 'DINHO', species: 'CÃO', tutor: 'DÉBORA', phone: '' },
            { name: 'DOBBY', species: 'CÃO', tutor: 'VITTORIA', phone: '31 99985-7289' },
            { name: 'EVA', species: 'CÃO', tutor: 'HAROLDO', phone: '31 99208-0121' },
            { name: 'ESTRELA', species: 'CÃO', tutor: 'GISELE', phone: '31 98884-3035' },
            { name: 'FILO', species: 'CÃO', tutor: 'SILVIA', phone: '31 98673-8008' },
            { name: 'FRED', species: 'CÃO', tutor: 'BERENICE', phone: '31 98512-8285' },
            { name: 'GAIA', species: 'CÃO', tutor: 'RENATO', phone: '31 99183-7373' },
            { name: 'GALO', species: 'CÃO', tutor: 'MEIRE', phone: '' },
            { name: 'GIBBS', species: 'CÃO', tutor: 'MARGARETHE', phone: '31 99183-5456' },
            { name: 'HERON', species: 'CÃO', tutor: 'MEL', phone: '(31) 97558-3313' },
            { name: 'HARRY', species: 'CÃO', tutor: 'RUTH', phone: '' },
            { name: 'HULK', species: 'CÃO', tutor: 'KELLY', phone: '31 99314-1791' },
            { name: 'IVANI', species: 'CÃO', tutor: 'MARGARETHE', phone: '31 99183-5456' },
            { name: 'IVY', species: 'CÃO', tutor: 'RODRIGO', phone: '31 99313-2038' },
            { name: 'IVIE', species: 'CÃO', tutor: 'ROSSANA', phone: '' },
            { name: 'IZZY', species: 'CÃO', tutor: 'RODRIGO', phone: '31 99313-2038' },
            { name: 'JAMANTA', species: 'CÃO', tutor: 'SILVIA', phone: '31 98673-8008' },
            { name: 'JADE', species: 'CÃO', tutor: 'MONICA', phone: '' },
            { name: 'JADE', species: 'CÃO', tutor: 'MEIRE', phone: '' },
            { name: 'JIMMY', species: 'CÃO', tutor: 'MARIA TEREZA', phone: '' },
            { name: 'JOAQUIM', species: 'GATO', tutor: 'ELVIO', phone: '31 99552-1326' },
            { name: 'JOCA', species: 'CÃO', tutor: 'ALESSANDRA', phone: '31 99685-0229' },
            { name: 'JOFFRE', species: 'CÃO', tutor: 'JÔ', phone: '' },
            { name: 'KELVIN', species: 'CÃO', tutor: 'RODOLFO', phone: '' },
            { name: 'KEVIN', species: 'CÃO', tutor: 'RODOLFO', phone: '31 98345-3822' },
            { name: 'KIKO', species: 'CÃO', tutor: 'HORTENCIA', phone: '' },
            { name: 'KIRA', species: 'CÃO', tutor: 'PAOLLA', phone: '' },
            { name: 'KYARA', species: 'CÃO', tutor: 'MARCIO', phone: '35412701' },
            { name: 'KYRA', species: 'CÃO', tutor: 'RODRIGO CHOCOLATES', phone: '31 99977-9474' },
            { name: 'LEÃO', species: 'CÃO', tutor: 'RAFAEL', phone: '31 99232-3726' },
            { name: 'LEVI', species: 'CÃO', tutor: 'ANDREIA', phone: '' },
            { name: 'LILICA', species: 'CÃO', tutor: 'MELISSA', phone: '31 98651-9159' },
            { name: 'LIZ', species: 'CÃO', tutor: 'MARCIO', phone: '' },
            { name: 'LOLA', species: 'CÃO', tutor: 'VERA', phone: '31 98689-3086' },
            { name: 'LOLLA', species: 'CÃO', tutor: 'FABRICIA', phone: '' },
            { name: 'LOGAN', species: 'CÃO', tutor: 'JOYCE', phone: '' },
            { name: 'LUDO', species: 'CÃO', tutor: 'FERNANDA', phone: '' },
            { name: 'LULU', species: 'CÃO', tutor: 'MELISSA', phone: '31 98651-9159' },
            { name: 'LUA', species: 'CÃO', tutor: 'VIVI', phone: '31 98482-3741' },
            { name: 'LUMA', species: 'CÃO', tutor: 'DAYANE', phone: '31 98818-3017' },
            { name: 'LUNA', species: 'CÃO', tutor: 'SAMUEL', phone: '31 99221-3652' },
            { name: 'LUNA', species: 'CÃO', tutor: 'KARINA', phone: '' },
            { name: 'LUPPY', species: 'CÃO', tutor: 'FERNANDA', phone: '31 98807-5771' },
            { name: 'LUP', species: 'CÃO', tutor: 'FERNANDA', phone: '' },
            { name: 'LUCK', species: 'CÃO', tutor: 'THAMYS', phone: '31 99158-2496' },
            { name: 'MADALENA', species: 'CÃO', tutor: 'MARIA LUIZA', phone: '' },
            { name: 'MAYA', species: 'CÃO', tutor: 'MONICA', phone: '31 99644-2104' },
            { name: 'MAKI', species: 'CÃO', tutor: 'SOLANGE', phone: '31 93867-3367' },
            { name: 'MARSHAL', species: 'CÃO', tutor: 'ANA LUISA', phone: '' },
            { name: 'MARIA', species: 'GATO', tutor: 'ANA LUISA', phone: '' },
            { name: 'MARLEY', species: 'CÃO', tutor: 'MEIRE', phone: '' },
            { name: 'MAYA', species: 'GATO', tutor: 'PAOLLA', phone: '' },
            { name: 'MEDUSA', species: 'CÃO', tutor: 'MARIANA', phone: '' },
            { name: 'MEL', species: 'CÃO', tutor: 'RAFAEL', phone: '31 99232-3726' },
            { name: 'MEL', species: 'CÃO', tutor: 'ANA', phone: '' },
            { name: 'MELZINHA', species: 'CÃO', tutor: 'ANDREA', phone: '31 98733-5512' },
            { name: 'MESSIE', species: 'CÃO', tutor: 'ALESSANDRA', phone: '' },
            { name: 'MILI', species: 'CÃO', tutor: 'MARLI', phone: '31 98808-0188' },
            { name: 'MONNA', species: 'CÃO', tutor: 'FABIANA', phone: '31 98232-3355' },
            { name: 'NICK', species: 'CÃO', tutor: 'MARLI', phone: '31 98808-0188' },
            { name: 'NINA', species: 'CÃO', tutor: 'FABRICIO', phone: '31 98316-1724' },
            { name: 'NIRI', species: 'CÃO', tutor: 'MARLI', phone: '31 98808-0188' },
            { name: 'NOOPY', species: 'CÃO', tutor: 'CINTIA', phone: '' },
            { name: 'PANQUECA', species: 'CÃO', tutor: 'MARISTELA', phone: '31 99208-9660' },
            { name: 'PANQUECA', species: 'GATO', tutor: 'MARISTELA', phone: '' },
            { name: 'PIPOCA', species: 'CÃO', tutor: 'ROSA', phone: '31 98485-1560' },
            { name: 'PIPOCA', species: 'CÃO', tutor: 'ANDRE', phone: '31 98852-0708' },
            { name: 'PIPOCA', species: 'CÃO', tutor: 'ANA', phone: '' },
            { name: 'PRINCIPESSA', species: 'CÃO', tutor: 'MEIRE', phone: '' },
            { name: 'PUCA', species: 'CÃO', tutor: 'RAFAELA', phone: '31 98888-2622' },
            { name: 'RAICHU', species: 'CÃO', tutor: 'ROSSANA', phone: '31 99302-7788' },
            { name: 'RAIO', species: 'CÃO', tutor: 'GISELE', phone: '31 98884-3035' },
            { name: 'RUBI', species: 'CÃO', tutor: 'THIAGO', phone: '' },
            { name: 'RYDE', species: 'CÃO', tutor: 'GLORIA', phone: '31 99564-2952' },
            { name: 'SEAN', species: 'CÃO', tutor: 'EDUARDO', phone: '31 99653-5315' },
            { name: 'SERENA', species: 'CÃO', tutor: 'MONICA', phone: '31 99644-2104' },
            { name: 'SHAKIRA', species: 'CÃO', tutor: 'FERNANDO', phone: '' },
            { name: 'SIDNEI', species: 'CÃO', tutor: 'RAFAEL', phone: '31 99232-3726' },
            { name: 'SOL', species: 'CÃO', tutor: 'JOSE CARLOS', phone: '' },
            { name: 'SUSHI', species: 'CÃO', tutor: 'MARIA', phone: '' },
            { name: 'SUSHI', species: 'CÃO', tutor: 'MARIA TEREZA', phone: '' },
            { name: 'TAISON', species: 'CÃO', tutor: 'MAURICIO', phone: '31 99589-3565' },
            { name: 'TANGUINHA', species: 'CÃO', tutor: 'CHIQUINHO', phone: '31 98208-4216' },
            { name: 'THEO', species: 'CÃO', tutor: 'EDNA', phone: '31 98568-5911' },
            { name: 'THEO', species: 'CÃO', tutor: 'IZABEL', phone: '' },
            { name: 'THOR', species: 'CÃO', tutor: 'RODRIGO CHOCOLATES', phone: '31 99977-9474' },
            { name: 'THOR', species: 'CÃO', tutor: 'LILIANE', phone: '31 99886-1700' },
            { name: 'THOR', species: 'CÃO', tutor: 'PATRICIA', phone: '31 98731-7384' },
            { name: 'TOBIAS', species: 'CÃO', tutor: 'TAYANNE', phone: '31 93580-7355' },
            { name: 'TOY', species: 'CÃO', tutor: 'PATRICIA', phone: '31 99958-8796' },
            { name: 'ULISSES', species: 'GATO', tutor: 'CLAUDIA', phone: '' },
            { name: 'VALERIA', species: 'CÃO', tutor: 'JADE', phone: '' },
            { name: 'ZECA', species: 'CÃO', tutor: 'JÔ', phone: '' },
            { name: 'ZÉ DA MANGA', species: 'CÃO', tutor: 'LORENA', phone: '' },
            { name: 'ZEUS', species: 'CÃO', tutor: 'VANESSA', phone: '31 98684-1686' },
            { name: 'ZEUS', species: 'CÃO', tutor: 'HELEN', phone: '' },
            { name: 'ZION', species: 'CÃO', tutor: 'PEDRO', phone: '31 98748-0924' },
            { name: 'ZOE', species: 'CÃO', tutor: 'KATIA', phone: '31 98820-7825' },
            { name: 'ZULEIKA', species: 'CÃO', tutor: 'MICHEL', phone: '31 97526-5517' }
        ];

        for (const a of animalsToSeed) {
            this.db.run(`INSERT OR IGNORE INTO animals (name, species, tutor_name, tutor_phone) VALUES (?, ?, ?, ?)`,
                [a.name, a.species, a.tutor, a.phone]);
        }

        const defaultKennels = [
            { type: 'INTERNO', count: 10, description: 'Área coberta climatizada' },
            { type: 'EXTERNO', count: 10, description: 'Área externa com jardim' },
            { type: 'GATIL', count: 5, description: 'Área especializada para felinos' }
        ];

        for (const { type, count, description } of defaultKennels) {
            for (let i = 1; i <= count; i++) {
                this.db.run(`INSERT OR IGNORE INTO kennels (type, number, description) VALUES (?, ?, ?)`, [type, i, description]);
            }
        }
        await this.saveData();
    }

    async addAnimal(a) {
        this.db.run(`INSERT INTO animals (name, species, tutor_name, tutor_phone, photo_url, weight, vaccination_status, allergies, medication, vet_notes, sex) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            [a.name, a.species, a.tutor_name, a.tutor_phone, a.photo_url, a.weight, a.vaccination_status, a.allergies, a.medication, a.vet_notes, a.sex || 'M']);
        await this.saveData();
    }
    async updateAnimal(id, a) {
        this.db.run(`UPDATE animals SET name=?, species=?, tutor_name=?, tutor_phone=?, photo_url=?, weight=?, vaccination_status=?, allergies=?, medication=?, vet_notes=?, sex=? WHERE id=?`,
            [a.name, a.species, a.tutor_name, a.tutor_phone, a.photo_url, a.weight, a.vaccination_status, a.allergies, a.medication, a.vet_notes, a.sex || 'M', id]);
        await this.saveData();
    }
    async deleteAnimal(id) {
        this.db.run('DELETE FROM animals WHERE id=?', [id]);
        this.db.run('DELETE FROM animal_history WHERE animal_id=?', [id]);
        await this.saveData();
    }
    async getAnimals(s = '') { return this.executeQuery(`SELECT * FROM animals WHERE name LIKE ? OR tutor_name LIKE ? ORDER BY name`, [`%${s}%`, `%${s}%`]); }
    async getAnimalById(id) { const r = this.executeQuery(`SELECT * FROM animals WHERE id=?`, [id]); return r[0]; }

    async addAnimalHistory(h) {
        this.db.run(`INSERT INTO animal_history (animal_id, type, date, description) VALUES (?, ?, ?, ?)`,
            [h.animal_id, h.type, h.date, h.description]);
        await this.saveData();
    }
    async getAnimalHistory(animalId) { return this.executeQuery(`SELECT * FROM animal_history WHERE animal_id = ? ORDER BY date DESC`, [animalId]); }
    async deleteAnimalHistory(id) { this.db.run('DELETE FROM animal_history WHERE id=?', [id]); await this.saveData(); }

    async getReservations(search = '', status = '', month = '') {
        let q = `SELECT r.*, a.name as animal_name, a.species as animal_species, a.tutor_name, a.tutor_phone, a.photo_url, a.sex as animal_sex 
                 FROM reservations r LEFT JOIN animals a ON r.animal_id = a.id WHERE 1=1`;
        const p = [];
        if (search) { q += ` AND (a.name LIKE ? OR a.tutor_name LIKE ?)`; p.push(`%${search}%`, `%${search}%`); }
        if (status) { q += ` AND r.status = ?`; p.push(status); }
        if (month) { q += ` AND r.checkin_date LIKE ?`; p.push(`${month}%`); }
        q += ` ORDER BY r.checkin_date DESC`;
        return this.executeQuery(q, p);
    }

    async getReservationById(id) {
        const q = `SELECT r.*, a.name as animal_name, a.species as animal_species, a.tutor_name, a.tutor_phone, a.photo_url, a.sex as animal_sex 
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

    async getAllActiveVaccines() {
        const q = `SELECT h.*, a.name as animal_name, a.photo_url 
                   FROM animal_history h 
                   JOIN animals a ON h.animal_id = a.id 
                   WHERE h.type = 'VACINAÇÃO' 
                   ORDER BY h.date DESC`;
        return this.executeQuery(q);
    }

    async getOccupiedKennels(start, end) {
        const q = `SELECT accommodation_type, kennel_number FROM reservations 
                   WHERE status = 'ATIVA' 
                   AND ((checkin_date BETWEEN ? AND ?) OR (checkout_date BETWEEN ? AND ?) OR (? BETWEEN checkin_date AND checkout_date))`;
        return this.executeQuery(q, [start, end, start, end, start]);
    }

    async getOccupiedKennelsCountByDate(date) {
        // Retorna contagem agrupada por tipo para a data específica
        const q = `SELECT accommodation_type as type, COUNT(*) as count FROM reservations 
                   WHERE status = 'ATIVA' 
                   AND (? BETWEEN checkin_date AND checkout_date)
                   GROUP BY accommodation_type`;
        return this.executeQuery(q, [date]);
    }

    async getRevenueByPaymentMethod(start, end) {
        // Agrupa receita por método de pagamento no intervalo
        // Inclui reservas que tiveram checkin OU checkout no período (receita do mês)
        // Filtrando por status para evitar contar cancelados
        const q = `SELECT payment_method, SUM(total_value) as total 
                   FROM reservations 
                   WHERE ((checkin_date BETWEEN ? AND ?) OR (checkout_date BETWEEN ? AND ?))
                   AND status IN ('ATIVA', 'FINALIZADA')
                   GROUP BY payment_method`;
        return this.executeQuery(q, [start, end, start, end]);
    }
    async getAllKennels() { return this.executeQuery(`SELECT * FROM kennels ORDER BY type, number`); }
    async addKennel(type, number, description) { this.db.run(`INSERT INTO kennels(type, number, description) VALUES(?, ?, ?)`, [type, number, description]); await this.saveData(); }
    async deleteKennel(id) { this.db.run('DELETE FROM kennels WHERE id=?', [id]); await this.saveData(); }
    async getNextKennelNumber(type) { const result = this.executeQuery(`SELECT MAX(number) as max_number FROM kennels WHERE type = ? `, [type]); return (result[0]?.max_number || 0) + 1; }
    async getDashboardStats() {
        const totalAnimals = this.executeQuery('SELECT COUNT(*) as count FROM animals')[0]?.count || 0;
        const activeRes = this.executeQuery("SELECT COUNT(*) as count FROM reservations WHERE status = 'ATIVA'")[0]?.count || 0;
        const totalKennels = this.executeQuery('SELECT COUNT(*) as count FROM kennels')[0]?.count || 0;
        const revenue = this.executeQuery("SELECT SUM(total_value) as sum FROM reservations WHERE status IN ('ATIVA', 'FINALIZADA')")[0]?.sum || 0;
        const occupancyRate = totalKennels > 0 ? Math.round((activeRes / totalKennels) * 100) : 0;
        return { totalAnimals, activeReservations: activeRes, monthlyRevenue: revenue, occupancyRate, totalKennels };
    }
    async getRecentReservations(limit = 5) {
        const q = `SELECT r.*, a.name as animal_name, a.species as animal_species, a.tutor_name, a.photo_url 
                   FROM reservations r LEFT JOIN animals a ON r.animal_id = a.id 
                   ORDER BY r.id DESC LIMIT ? `;
        return this.executeQuery(q, [limit]);
    }
    async getMonthlyData() { return this.executeQuery(`SELECT strftime('%Y-%m', checkin_date) as month, COUNT(*) as reservations, SUM(total_value) as revenue FROM reservations GROUP BY month ORDER BY month DESC LIMIT 12`); }
    async getKennelTypeData() { return this.executeQuery(`SELECT accommodation_type as kennel_type, COUNT(*) as count FROM reservations WHERE status = 'ATIVA' GROUP BY kennel_type`); }
    async getOccupiedKennelsCountByDate(date) {
        // Retorna contagem agrupada por tipo de alojamento para uma data especifica
        const q = `SELECT accommodation_type as type, COUNT(*) as count 
                   FROM reservations 
                   WHERE status = 'ATIVA' 
                   AND checkin_date <= ? AND checkout_date >= ?
            GROUP BY accommodation_type`;
        return this.executeQuery(q, [date, date]);
    }

}
window.db = new Database();