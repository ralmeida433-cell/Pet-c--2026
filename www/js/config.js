const AppConfig = {
    // Alternar entre modo Local (SQLite) e Nuvem (Supabase)
    useCloud: false,

    // Credenciais Supabase (Desativado)
    supabase: {
        url: '',
        key: ''
    },

    // Configurações de UI
    ui: {
        premiumTheme: true,
        showOnboarding: true,
        loadingTimeout: 2500
    },

    // Configurações do App
    app: {
        name: 'Hotel Pet Cá',
        version: '2.5.0',
        defaultKennels: 20
    }
};

window.AppConfig = AppConfig;
