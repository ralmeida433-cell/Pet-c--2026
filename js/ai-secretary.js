class AISecretary {
    constructor() {
        this.provider = localStorage.getItem('petca_ai_provider') || 'gemini';
        this.apiKey = localStorage.getItem('petca_api_key');
    }

    isConfigured() {
        // Pollinations doesn't need key, others do
        if (this.provider === 'pollinations') return true;
        return !!this.apiKey;
    }

    async generateMessage(context) {
        if (!this.isConfigured()) return null;

        const { tutorName, petName, serviceType, date } = context;

        // Prompt Engineering
        const systemPrompt = `Você é o Secretário Virtual do 'Hotel Pet CÁ'.
        Sua função é gerar mensagens curtas, profissionais e acolhedoras para WhatsApp.
        
        Regras:
        1. Saudação: Use "Sr./Sra. ${tutorName}" ou apenas "Olá, ${tutorName}" dependendo do tom.
        2. Confirme o serviço: ${serviceType} em ${date}.
        3. Empatia: Mencione que ${petName} será tratado com carinho.
        4. O texto deve ser pronto para envio, sem aspas ou prefixos.
        5. Máximo de 2 frases.`;

        try {
            if (this.provider === 'gemini') {
                return await this.callGemini(systemPrompt);
            }
            // Implementar outros providers se necessário

            return null;
        } catch (error) {
            console.error('AI Generation Error:', error);
            return null;
        }
    }

    async callGemini(prompt) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) throw new Error('Gemini API Error');

        const data = await response.json();
        return data.candidates[0].content.parts[0].text.trim();
    }
}

window.aiSecretary = new AISecretary();
