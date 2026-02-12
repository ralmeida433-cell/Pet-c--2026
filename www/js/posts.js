class PostsManager {
    constructor() {
        this.selectedFormat = '1:1';
        this.uploadedImages = [];
        this.init();
    }

    init() {
        this.bindEvents();
        // Carregar logo salvo se existir
        const savedLogo = localStorage.getItem('petca_custom_logo');
        if (savedLogo) {
            const img = document.getElementById('brand-logo-preview');
            if (img) img.src = savedLogo;
        }
        console.log('Posts Manager initialized (v2)');
    }

    bindEvents() {
        // Upload Preview (Pet Photos)
        const fileInput = document.getElementById('post-photo-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleImageUpload(e));
        }

        // Upload Logo
        const logoInput = document.getElementById('brand-logo-input');
        if (logoInput) {
            logoInput.addEventListener('click', (e) => e.stopPropagation());
            logoInput.addEventListener('change', (e) => this.handleLogoUpload(e));
        }

        // Pollinations AI Button
        const btnPollination = document.getElementById('btn-create-pollination');
        if (btnPollination) {
            btnPollination.addEventListener('click', () => this.generatePollinationsImage());
        }

        // Format Selection
        const formats = document.querySelectorAll('.format-card');
        formats.forEach(card => {
            card.addEventListener('click', () => {
                formats.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedFormat = card.dataset.format;
            });
        });

        // Contact Toggle
        const contactToggle = document.getElementById('show-contact-info');
        if (contactToggle) {
            contactToggle.addEventListener('change', (e) => {
                const area = document.getElementById('contact-inputs-area');
                if (area) area.style.display = e.target.checked ? 'block' : 'none';
            });
        }

        // Generate Button
        const btnGenerate = document.getElementById('btn-generate-post');
        if (btnGenerate) {
            btnGenerate.addEventListener('click', () => this.generatePost());
        }

        // Action Buttons
        document.querySelector('.btn-download-art')?.addEventListener('click', () => this.downloadArt());
        document.querySelector('.btn-copy-caption')?.addEventListener('click', () => this.copyCaption());
    }

    async generatePollinationsImage() {
        const promptInput = document.getElementById('ai-image-prompt');
        const prompt = promptInput.value.trim();
        if (!prompt) {
            alert('Digite uma descrição para a imagem!');
            return;
        }

        const btn = document.getElementById('btn-create-pollination');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando...';
        btn.disabled = true;

        try {
            const seed = Math.floor(Math.random() * 100000);
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1080&height=1080&seed=${seed}&nologo=true&model=flux`;

            // Fetch para converter em Blob/Base64 para evitar Tainted Canvas
            const response = await fetch(url);
            const blob = await response.blob();
            const reader = new FileReader();

            reader.onloadend = () => {
                const base64data = reader.result;
                this.addImageToPreview(base64data);
                btn.innerHTML = originalText;
                btn.disabled = false;
            };
            reader.readAsDataURL(blob);

        } catch (e) {
            console.error(e);
            alert('Erro ao gerar imagem: ' + e.message);
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    addImageToPreview(src) {
        this.uploadedImages = []; // Limpa anteriores (single image mode for now)
        const previewGrid = document.getElementById('post-photos-preview');
        previewGrid.innerHTML = '';

        const img = new Image();
        img.src = src;
        img.onload = () => {
            this.uploadedImages.push(img);

            const thumb = document.createElement('img');
            thumb.src = src;
            thumb.className = 'photo-thumb';
            // Efeito visual de seleção
            thumb.style.border = '3px solid #8b5cf6';
            previewGrid.appendChild(thumb);
        };
    }

    handleImageUpload(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // Reuso a lógica de adicionar preview
        const file = files[0]; // Pegando só o primeiro por simplicidade neste fluxo
        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            this.addImageToPreview(readerEvent.target.result);
        };
        reader.readAsDataURL(file);
    }

    handleLogoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = document.getElementById('brand-logo-preview');
            img.src = ev.target.result;
            localStorage.setItem('petca_custom_logo', ev.target.result);
        };
        reader.readAsDataURL(file);
    }

    async generatePost() {
        if (this.uploadedImages.length === 0) {
            alert('Por favor, carregue pelo menos uma foto do pet.');
            return;
        }

        const btn = document.getElementById('btn-generate-post');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando Arte e Legenda...';
        btn.disabled = true;

        try {
            // 1. Gerar Arte (Canvas Local)
            const finalImageBase64 = await this.createCanvasArt();
            document.getElementById('final-art-preview').src = finalImageBase64;

            // 2. Gerar Legenda (Gemini API)
            const caption = await this.generateCaptionWithAI();
            document.getElementById('final-caption-preview').innerText = caption;

            document.getElementById('generated-result').style.display = 'block';
            document.getElementById('generated-result').scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            console.error(error);
            alert('Erro ao gerar post: ' + error.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    async createCanvasArt() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const petImg = this.uploadedImages[0];
        const theme = document.getElementById('post-theme').value; // 'banho', 'hotel', etc.

        // Dimensões (Alta Resolução)
        let width = 1080;
        let height = 1080;

        if (this.selectedFormat === '9:16') { height = 1920; }
        else if (this.selectedFormat === '4:5') { height = 1350; }

        canvas.width = width;
        canvas.height = height;

        // --- 1. FUNDO BASE (Branco) ---
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // --- 2. FOTO DO PET (Com recorte inteligente) ---
        // Calcula área segura para a foto (deixando espaço para bordas/rodapé)
        const showContact = document.getElementById('show-contact-info').checked;
        const footerH = showContact ? 140 : 0;
        const topMargin = 0;

        const photoH = height - footerH - topMargin;
        const scale = Math.max(width / petImg.width, photoH / petImg.height);
        const imgW = petImg.width * scale;
        const imgH = petImg.height * scale;
        const imgX = (width - imgW) / 2;
        const imgY = topMargin + (photoH - imgH) / 2;

        ctx.drawImage(petImg, imgX, imgY, imgW, imgH);

        // --- 2.1 APLICAR FILTROS ARTÍSTICOS (Novo) ---
        // Aplica correção de cor baseada no tema para parecer "editado por IA"
        try {
            this.applyImageFilter(ctx, width, height, theme);
        } catch (e) { console.warn("Filtro de imagem falhou, seguindo sem filtro.", e); }

        // --- 3. ELEMENTOS VISUAIS DA MARCA (O "Prompt" transformado em código) ---

        // Gradiente Inferior Suave (Preto transparente para o logo destacar)
        const gradient = ctx.createLinearGradient(0, height - footerH - 400, 0, height - footerH);
        gradient.addColorStop(0, "transparent");
        gradient.addColorStop(1, "rgba(0,0,0,0.7)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, height - footerH - 400, width, 400);

        // --- 4. TEMAS ESPECÍFICOS (Bolhas, Patinhas, Formas) ---

        if (theme === 'banho') {
            // Desenhar Bolhas de Sabão (Várias, aleatórias e translúcidas)
            for (let i = 0; i < 15; i++) {
                const bx = Math.random() * width;
                const by = Math.random() * height * 0.8; // Evitar rodapé
                const r = 10 + Math.random() * 30;

                ctx.beginPath();
                ctx.arc(bx, by, r, 0, 2 * Math.PI);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 1;
                ctx.stroke();
                // Brilho da bolha
                ctx.beginPath();
                ctx.arc(bx - r / 3, by - r / 3, r / 4, 0, 2 * Math.PI);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fill();
            }
        } else if (theme === 'hotel' || theme === 'institucional') {
            // Desenhar formas orgânicas (Ondas roxas/amarelas nos cantos)
            ctx.fillStyle = 'rgba(126, 34, 206, 0.8)'; // Roxo PetCá
            ctx.beginPath();
            ctx.moveTo(width, 0);
            ctx.lineTo(width, 150);
            ctx.bezierCurveTo(width - 100, 150, width - 200, 50, width - 300, 0);
            ctx.fill();

            // Partícula de Patinha (Simulada com Círculos por simplicidade canvas)
            // Para desenhar patinha real precisaria de Path SVG complexo, vou usar círculos arranjados
            const drawPaw = (px, py, size, color) => {
                ctx.fillStyle = color;
                // Palma
                ctx.beginPath(); ctx.ellipse(px, py, size, size * 0.8, 0, 0, Math.PI * 2); ctx.fill();
                // Dedos
                const s2 = size * 0.5;
                ctx.beginPath(); ctx.arc(px - size, py - size, s2, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(px, py - size * 1.3, s2, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(px + size, py - size, s2, 0, Math.PI * 2); ctx.fill();
            };

            drawPaw(50, 50, 20, 'rgba(251, 191, 36, 0.8)'); // Patinha Amarela canto esquerdo
        }

        // --- 5. LOGO E REDES ---
        const logoImg = document.getElementById('brand-logo-preview');
        const logoObj = new Image();
        logoObj.crossOrigin = "Anonymous";
        logoObj.src = logoImg.src;

        // Wait load
        if (!logoObj.complete) await new Promise(r => { logoObj.onload = r; logoObj.onerror = r; });

        if (logoObj.naturalWidth > 0) {
            const logoSize = 160;
            const marginBottom = footerH + 30; // Acima do rodapé

            // Desenha logo no canto inferior esquerdo (sobre a foto e gradiente)
            ctx.drawImage(logoObj, 30, height - marginBottom - logoSize, logoSize, logoSize);

            // Texto @petca.hotel ao lado
            ctx.shadowColor = "rgba(0,0,0,0.8)";
            ctx.shadowBlur = 4;
            ctx.fillStyle = 'white';
            ctx.font = 'bold 28px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('@petca.hotel', 40 + logoSize + 10, height - marginBottom - (logoSize / 2) + 10);
            ctx.shadowBlur = 0;
        }

        // --- 6. RODAPÉ DE CONTATO (Design Roxo + Amarelo) ---
        if (showContact) {
            const address = document.getElementById('post-address').value;
            const phone = document.getElementById('post-phone').value;

            // Fundo
            const footerY = height - footerH;

            // Faixa Roxa
            const grad = ctx.createLinearGradient(0, footerY, width, footerY);
            grad.addColorStop(0, '#581c87'); // Roxo Escuro
            grad.addColorStop(1, '#9333ea'); // Roxo Vibrante
            ctx.fillStyle = grad;
            ctx.fillRect(0, footerY, width, footerH);

            // Faixa Amarela (Detalhe topo)
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(0, footerY, width, 8);

            // Textos
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';

            // Endereço (Menor)
            ctx.font = '500 22px sans-serif';
            ctx.fillText(address, width / 2, footerY + 55);

            // Telefone (Grande)
            ctx.font = 'bold 34px sans-serif';
            ctx.fillText(`📞 ${phone}`, width / 2, footerY + 105);
        }

        // --- 7. PROMO BADGE (Se ativo) ---
        const isPromo = document.getElementById('is-promotion').checked;
        if (isPromo) {
            ctx.save();
            ctx.translate(width - 150, 100);
            ctx.rotate(15 * Math.PI / 180);

            // Fundo sticker
            ctx.fillStyle = '#f43f5e'; // Rose
            ctx.shadowColor = "rgba(0,0,0,0.3)";
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.ellipse(0, 0, 100, 50, 0, 0, 2 * Math.PI);
            ctx.fill();

            // Borda pontilhada
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();

            ctx.fillStyle = 'white';
            ctx.font = 'bold 36px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('PROMO', 0, 12);
            ctx.restore();
        }

        return canvas.toDataURL('image/jpeg', 0.95);
    }

    async generateCaptionWithAI() {
        const apiKey = localStorage.getItem('petca_api_key');
        if (!apiKey) return "Configure sua API Key nas Configurações!";

        const provider = localStorage.getItem('petca_ai_provider') || 'gemini';
        const context = document.getElementById('post-context').value || "Pet feliz";
        const theme = document.getElementById('post-theme').value;
        const isPromo = document.getElementById('is-promotion').checked;

        // Instruções baseadas no tema
        let themeInstructions = "";
        if (theme === 'banho') {
            themeInstructions = "Foco em limpeza, frescor, perfume, bolhas de sabão, pelo brilhante. 'Seu pet limpo, feliz e bem cuidado.'";
        } else if (theme === 'hotel') {
            themeInstructions = "Foco em conforto, segurança, 'segunda casa', diversão e carinho. 'Aqui seu pet fica seguro.'";
        } else if (theme === 'produtos') {
            themeInstructions = "Foco em qualidade, novidades, o melhor para o pet. 'Tudo o que seu pet precisa.'";
        } else if (theme === 'institucional') {
            themeInstructions = "Foco em confiança, amor aos animais, equipe profissional. 'Cuidamos como família.'";
        }

        const promptText = `
            Atue como Social Media do Pet Shop & Hotel PetCá.
            Crie uma legenda para Instagram.
            Tema: ${themeInstructions}
            Contexto Específico: ${context}
            É Promoção? ${isPromo ? 'SIM (Inclua chamada para ação/urgência)' : 'Não'}.
            Tom de voz: Alegre, carinhoso, profissional, emojis.
            Use hashtags: #PetCá #HotelPet #NovaLima.
            Retorne APENAS o texto da legenda.
        `;

        try {
            if (provider === 'gemini') {
                // Lista de modelos para tentar em ordem de preferência
                const modelsToTry = [
                    'gemini-1.5-pro',
                    'gemini-1.5-flash',
                    'gemini-1.0-pro',
                    'gemini-pro'
                ];

                let lastError = null;
                let data = null;

                // Tenta cada modelo até um funcionar
                for (const model of modelsToTry) {
                    try {
                        console.log(`Tentando modelo Gemini: ${model}...`);
                        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

                        const response = await fetch(url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
                        });

                        if (response.ok) {
                            data = await response.json();
                            break; // Sucesso!
                        }
                    } catch (e) {
                        console.warn(`Erro silecioso Gemini ${model}:`, e);
                    }
                }

                if (data && data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                    return data.candidates[0].content.parts[0].text;
                }

                // --- FALLBACK AUTOMÁTICO PARA POLLINATIONS ---
                // Se o Gemini falhar totalmente (chave ruim, cota, erro de modelo),
                // NÃO mostramos erro para o usuário. Usamos o serviço gratuito.
                console.log("Gemini falhou. Ativando Modo de Emergência (Pollinations AI)...");
                const fallbackUrl = `https://text.pollinations.ai/${encodeURIComponent(promptText)}`;
                const fbResponse = await fetch(fallbackUrl);
                return await fbResponse.text();

            } else if (provider === 'pollinations') {
                // Pollinations Text (Gratuito, sem chave, sem CORS)
                // Endpoint: https://text.pollinations.ai/{prompt}

                const url = `https://text.pollinations.ai/${encodeURIComponent(promptText)}`;

                // Fetch simples GET
                response = await fetch(url);

                if (!response.ok) {
                    throw new Error("Erro na Pollinations AI: " + response.statusText);
                }

                // Resposta é texto puro
                return await response.text();

            } else if (provider === 'huggingface') {
                // Hugging Face Inference API
                // Modelo: Mistral-7B-Instruct (Rápido e bom para chat/instruções)
                const url = 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3';
                const hfPrompt = `<s>[INST] ${promptText} [/INST]`; // Formato Mistral Instruct

                response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        inputs: hfPrompt,
                        parameters: {
                            max_new_tokens: 500,
                            return_full_text: false, // Só a resposta
                            temperature: 0.7
                        }
                    })
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || response.statusText);
                }

                const data = await response.json();
                // HF retorna array [{ generated_text: "..." }]
                let text = data[0]?.generated_text || "Erro ao processar texto no Hugging Face.";
                return text.replace(hfPrompt, '').trim(); // Limpeza extra por segurança

            } else {
                // OpenRouter Logic
                const url = 'https://openrouter.ai/api/v1/chat/completions';
                response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': window.location.href,
                        'X-Title': 'Hotel Pet App'
                    },
                    body: JSON.stringify({
                        model: "google/gemini-2.0-flash-lite-preview-02-05:free",
                        messages: [{ role: "user", content: promptText }]
                    })
                });
                const data = await response.json();
                return data.choices?.[0]?.message?.content || "Erro OpenRouter.";
            }
        } catch (e) {
            console.error(e);
            return `Erro na IA: ${e.message}`;
        }
    }

    downloadArt() {
        const img = document.getElementById('final-art-preview');
        const link = document.createElement('a');
        link.download = `petca-post-${Date.now()}.jpg`;
        link.href = img.src;
        link.click();
    }

    copyCaption() {
        const text = document.getElementById('final-caption-preview').innerText;
        navigator.clipboard.writeText(text);
        alert('Legenda copiada!');
    }
}

window.PostsManager = PostsManager;
