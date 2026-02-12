class Database {
    constructor() {
        this.supabase = window.supabase;
        this.isInitialized = true; // Supabase client is immediately available
    }

    async init() {
        console.log('✅ Conexão Supabase Pronta');
        // Nenhuma lógica pesada necessária aqui
    }

    // --- ANIMAIS ---

    async getAnimals(s = '') {
        let query = this.supabase
            .from('animals')
            .select('*')
            .order('name', { ascending: true });

        if (s) {
            query = query.or(`name.ilike.%${s}%,tutor_name.ilike.%${s}%`);
        }

        const { data, error } = await query;
        if (error) console.error('Error fetching animals:', error);
        return data || [];
    }

    async getAnimalById(id) {
        const { data, error } = await this.supabase
            .from('animals')
            .select('*')
            .eq('id', id)
            .single();
        if (error) console.error('Error fetching animal:', error);
        return data;
    }

    async addAnimal(a) {
        // Remove undefined fields
        const payload = { ...a };
        // Garante que campos opcionais sejam null se vazios
        if (!payload.sex) payload.sex = 'M';

        const { error } = await this.supabase.from('animals').insert([payload]);
        if (error) throw error;
    }

    async updateAnimal(id, a) {
        const { error } = await this.supabase.from('animals').update(a).eq('id', id);
        if (error) throw error;
    }

    async deleteAnimal(id) {
        // Excluir histórico primeiro (Cascade delete deve ser configurado no DB, mas faremos manual por segurança)
        await this.supabase.from('animal_history').delete().eq('animal_id', id);
        await this.supabase.from('reservations').delete().eq('animal_id', id); // Opcional, mas limpa dados orfãos
        const { error } = await this.supabase.from('animals').delete().eq('id', id);
        if (error) throw error;
    }

    // --- HISTÓRICO ---

    async getAnimalHistory(animalId) {
        const { data, error } = await this.supabase
            .from('animal_history')
            .select('*')
            .eq('animal_id', animalId)
            .order('date', { ascending: false });
        if (error) console.error('Error fetching history:', error);
        return data || [];
    }

    async addAnimalHistory(h) {
        const { error } = await this.supabase.from('animal_history').insert([h]);
        if (error) throw error;
    }

    async deleteAnimalHistory(id) {
        const { error } = await this.supabase.from('animal_history').delete().eq('id', id);
        if (error) throw error;
    }

    async getAllActiveVaccines() {
        // Usando JOIN implícito no Supabase (se foreign keys estiverem configuradas corretamente)
        // Como o original faz JOIN manual, aqui usamos a query relation
        const { data, error } = await this.supabase
            .from('animal_history')
            .select('*, animals(name, photo_url)')
            .eq('type', 'VACINAÇÃO')
            .order('date', { ascending: false });

        if (error) {
            console.error('Error fetching vaccines:', error);
            return [];
        }

        // Remapear para formato esperado pelo frontend (flatten structure)
        return data.map(h => ({
            ...h,
            animal_name: h.animals?.name,
            photo_url: h.animals?.photo_url
        }));
    }

    // --- RESERVAS ---

    async getReservations(search = '', status = '', month = '') {
        // Usar VIEW para simplificar JOINs
        let query = this.supabase
            .from('view_reservations_detailed')
            .select('*')
            .order('checkin_date', { ascending: false });

        if (search) {
            query = query.or(`animal_name.ilike.%${search}%,tutor_name.ilike.%${search}%`);
        }
        if (status) {
            query = query.eq('status', status);
            // Ordenação secundária implícita
        }
        if (month) {
            // Month filter: checkin_date LIKE 'YYYY-MM%'
            // Supabase filter for date range or string match?
            // PostgreSQL date 'starts with' is tricky. Using gte/lte or native text cast.
            // Simplificação: Filtro no cliente se necessário, ou range se tiver start/end.
            // Para 'YYYY-MM', vamos usar range do mês.
            const [y, m] = month.split('-');
            const startDate = `${month}-01`;
            const endDate = new Date(y, m, 0).toISOString().split('T')[0]; // Last day of month
            query = query.gte('checkin_date', startDate).lte('checkin_date', endDate);
        }

        const { data, error } = await query;
        if (error) console.error('Error fetching reservations:', error);
        return data || [];
    }

    async getReservationById(id) {
        const { data, error } = await this.supabase
            .from('view_reservations_detailed')
            .select('*')
            .eq('id', id)
            .single();
        if (error) console.error(error);
        return data;
    }

    async addReservation(r) {
        // Converter Bool para Boolean real se necessário (SQLite usa 0/1 as vezes)
        // Remover campos extras que não estão na tabela reservations (nomes do animal, etc)
        const payload = {
            animal_id: r.animal_id,
            accommodation_type: r.accommodation_type,
            kennel_number: r.kennel_number,
            daily_rate: r.daily_rate,
            checkin_date: r.checkin_date,
            checkout_date: r.checkout_date,
            total_days: r.total_days,
            transport_service: !!r.transport_service,
            transport_value: r.transport_value || 0,
            bath_service: !!r.bath_service,
            bath_value: r.bath_value || 0,
            payment_method: r.payment_method,
            total_value: r.total_value,
            status: r.status || 'ATIVA'
        };
        const { error } = await this.supabase.from('reservations').insert([payload]);
        if (error) throw error;
    }

    async updateReservation(id, r) {
        const payload = { ...r };
        delete payload.id;
        delete payload.animal_name; // Remover campos de view
        delete payload.animal_species;
        delete payload.tutor_name;
        delete payload.tutor_phone;
        delete payload.photo_url;
        delete payload.animal_sex;
        delete payload.created_at;

        const { error } = await this.supabase.from('reservations').update(payload).eq('id', id);
        if (error) throw error;
    }

    async deleteReservation(id) {
        const { error } = await this.supabase.from('reservations').delete().eq('id', id);
        if (error) throw error;
    }

    // --- ALOJAMENTOS E OCUPAÇÃO ---

    async getAllKennels() {
        const { data, error } = await this.supabase.from('kennels').select('*').order('type').order('number');
        if (error) console.error(error);
        return data || [];
    }

    async addKennel(type, number, description) {
        const { error } = await this.supabase.from('kennels').insert([{ type, number, description }]);
        if (error) throw error;
    }

    async deleteKennel(id) {
        const { error } = await this.supabase.from('kennels').delete().eq('id', id);
        if (error) throw error;
    }

    async getNextKennelNumber(type) {
        // Query max number
        const { data, error } = await this.supabase
            .from('kennels')
            .select('number')
            .eq('type', type)
            .order('number', { ascending: false })
            .limit(1);

        if (error || !data || data.length === 0) return 1;
        return (data[0].number || 0) + 1;
    }

    async getOccupiedKennels(start, end) {
        // Lógica de sobreposição de datas: (StartA <= EndB) and (EndA >= StartB)
        // start, end são strings YYYY-MM-DD
        const { data, error } = await this.supabase
            .from('reservations')
            .select('accommodation_type, kennel_number')
            .eq('status', 'ATIVA')
            .lte('checkin_date', end)
            .gte('checkout_date', start);

        if (error) console.error(error);
        return data || [];
    }

    async getOccupiedKennelsCountByDate(date) {
        // Difícil fazer GROUP BY count direto no cliente simples sem RPC.
        // Fazer fetch e agrupar no JS (OK para volumes pequenos < 1000 reservas ativas)
        const { data, error } = await this.supabase
            .from('reservations')
            .select('accommodation_type')
            .eq('status', 'ATIVA')
            .lte('checkin_date', date)
            .gte('checkout_date', date);

        if (error) return [];

        // Agrupar
        const counts = {};
        data.forEach(r => {
            counts[r.accommodation_type] = (counts[r.accommodation_type] || 0) + 1;
        });

        return Object.entries(counts).map(([type, count]) => ({ type, count }));
    }

    // --- DASHBOARD E STATS ---

    async getDashboardStats() {
        // Usar a View que criamos
        const { data, error } = await this.supabase.from('view_dashboard_stats').select('*').single();
        if (error) {
            console.error(error);
            return { totalAnimals: 0, activeReservations: 0, monthlyRevenue: 0, occupancyRate: 0, totalKennels: 0 };
        }

        const stats = {
            totalAnimals: data.total_animals,
            activeReservations: data.active_reservations,
            monthlyRevenue: data.total_revenue,
            totalKennels: data.total_kennels,
            occupancyRate: data.total_kennels > 0 ? Math.round((data.active_reservations / data.total_kennels) * 100) : 0
        };
        return stats;
    }

    async getRecentReservations(limit = 5) {
        const { data, error } = await this.supabase
            .from('view_reservations_detailed')
            .select('*')
            .order('created_at', { ascending: false }) // Ou checkin_date? Geralmente recent bookings -> created_at
            .limit(limit);

        if (error) console.error(error);
        return data || [];
    }

    async getRevenueByPaymentMethod(start, end) {
        // Agregação complexa. Se não houver muitos dados, fazer no JS.
        const { data, error } = await this.supabase
            .from('reservations')
            .select('payment_method, total_value')
            .in('status', ['ATIVA', 'FINALIZADA'])
            .or(`checkin_date.gte.${start},checkout_date.lte.${end}`); // Aproximação de intervalo
        // Logica exata SQL: ((checkin_date BETWEEN ? AND ?) OR (checkout_date BETWEEN ? AND ?))

        if (error) return [];

        const groups = {};
        data.forEach(r => {
            if (!groups[r.payment_method]) groups[r.payment_method] = 0;
            groups[r.payment_method] += (r.total_value || 0);
        });

        return Object.keys(groups).map(k => ({ payment_method: k, total: groups[k] }));
    }

    async getMonthlyData() {
        // RPC function seria ideal: get_monthly_revenue()
        // JS Fallback
        const { data, error } = await this.supabase
            .from('reservations')
            .select('checkin_date, total_value')
            .order('checkin_date', { ascending: false })
            .limit(1000); // Limite razoável

        if (error) return [];

        const monthly = {};
        data.forEach(r => {
            if (!r.checkin_date) return;
            const month = r.checkin_date.substring(0, 7); // YYYY-MM
            if (!monthly[month]) monthly[month] = { reservations: 0, revenue: 0 };
            monthly[month].reservations++;
            monthly[month].revenue += (r.total_value || 0);
        });

        return Object.entries(monthly)
            .map(([month, stats]) => ({ month, ...stats }))
            .sort((a, b) => b.month.localeCompare(a.month))
            .slice(0, 12);
    }

    async getKennelTypeData() {
        const { data, error } = await this.supabase
            .from('reservations')
            .select('accommodation_type')
            .eq('status', 'ATIVA');

        if (error) return [];

        const counts = {};
        data.forEach(r => {
            counts[r.accommodation_type] = (counts[r.accommodation_type] || 0) + 1;
        });

        return Object.entries(counts).map(([type, count]) => ({ kennel_type: type, count }));
    }

    // Stub para saveData (não necessário no Supabase)
    async saveData() {
        // console.log('Data auto-saved to cloud');
    }
}

// Inicializa globalmente
window.db = new Database();
