// Funcionalidades Avançadas: Câmera, Notificações, Voz e Recibos
const showNotification = (msg, type) => window.hotelPetApp?.showNotification(msg, type);

// 1. Busca por Voz
async function startVoiceSearch(targetInputId) {
    if (!('webkitSpeechRecognition' in window)) {
        showNotification('Seu navegador não suporta busca por voz', 'error');
        return;
    }

    // Tentar solicitar permissão explicitamente via getUserMedia
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Se conseguiu, para o stream imediatamente, pois só queríamos a permissão
        stream.getTracks().forEach(track => track.stop());
    } catch (err) {
        console.error('Erro de permissão microfone:', err);
        // Se for erro de permissão, orientar o usuário
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            showNotification('Permissão de microfone negada. Ative nas configurações do app.', 'warning');

            // Tentar abrir configurações se possível (Plugin App do Capacitor)
            if (window.Capacitor && window.Capacitor.Plugins.App) {
                setTimeout(() => {
                    if (confirm("Deseja abrir as configurações para ativar o microfone?")) {
                        window.Capacitor.Plugins.AndroidSettings.open(); // Se existir plugin
                        // Como não temos plugin de settings garantido, apenas avisamos.
                    }
                }, 500);
            }
            return;
        }
        // Outros erros
        showNotification('Erro ao acessar microfone: ' + err.message, 'error');
        return;
    }

    const recognition = new webkitSpeechRecognition();
    const btn = document.querySelector(`.search-box:has(#${targetInputId}) .voice-search-btn`);

    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        btn?.classList.add('listening');
        showNotification('Ouvindo...', 'info');
    };

    recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        const input = document.getElementById(targetInputId);
        if (input) {
            input.value = text;
            input.dispatchEvent(new Event('input'));
        }
    };

    recognition.onerror = (event) => {
        btn?.classList.remove('listening');
        console.error('Erro reconhecimento:', event.error);
        if (event.error === 'not-allowed') {
            showNotification('Permissão de microfone bloqueada.', 'error');
        }
    };

    recognition.onend = () => btn?.classList.remove('listening');
    recognition.start();
}

// 2. Integração com Câmera
class CameraManager {
    constructor() {
        this.stream = null;
        this.video = document.getElementById('camera-feed');
        this.container = document.getElementById('camera-container');
        this.startBtn = document.getElementById('start-camera-btn');
        this.captureBtn = document.getElementById('capture-photo-btn');
        this.preview = document.getElementById('photo-preview');
        this.init();
    }

    init() {
        this.startBtn?.addEventListener('click', () => this.startCamera());
        this.captureBtn?.addEventListener('click', () => this.capturePhoto());
    }

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });
            this.video.srcObject = this.stream;
            this.container.style.display = 'block';
            this.preview.style.display = 'none';
        } catch (err) {
            showNotification('Erro ao acessar a câmera: ' + err.message, 'error');
        }
    }

    async capturePhoto() {
        const canvas = document.createElement('canvas');
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg');
        let finalImage = imageData;
        if (window.storageService) {
            try { finalImage = await window.storageService.saveImage(imageData); } catch (e) { }
        }
        this.preview.src = finalImage;
        this.preview.style.display = 'block';
        if (window.animalsManager) window.animalsManager.currentPhotoBase64 = finalImage;
        this.stopCamera();
    }

    stopCamera() {
        if (this.stream) this.stream.getTracks().forEach(track => track.stop());
        this.container.style.display = 'none';
    }
}

// 3. Impressão de Recibos Premium (PDF Estilizado)
async function printReceipt(reservationId) {
    const res = await db.getReservationById(reservationId);
    if (!res) return;

    // Abrir modal de configuração de dados do recibo
    const modal = document.getElementById('receipt-config-modal');
    if (!modal) {
        // Fallback: se o modal não existir por algum motivo, gera direto
        generateStylizedReceiptPDF(res, "Rod. José Francisco da Silva, 250 - Chácara Bom Retiro, Nova Lima - MG", "(31) 2010-9901");
        return;
    }

    document.getElementById('receipt-res-id').value = reservationId;
    modal.classList.add('active');

    const form = document.getElementById('receipt-config-form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const address = document.getElementById('receipt-address').value;
        const phone = document.getElementById('receipt-phone').value;
        window.hotelPetApp.closeAllModals();
        generateStylizedReceiptPDF(res, address, phone);
    };
}

async function generateStylizedReceiptPDF(res, address, phone) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: [100, 200] });

    // Paleta PetCá (Roxo/Lilás Premium)
    const PRIMARY = [118, 75, 162];      // #764ba2 da logo
    const SECONDARY = [255, 126, 95];    // Coral suave
    const ACCENT = [167, 107, 207];      // Lilás claro
    const TEXT_DARK = [30, 41, 59];      // Texto escuro
    const TEXT_LIGHT = [100, 116, 139];  // Texto secundário
    const BG_LIGHT = [248, 245, 255];    // Fundo lilás suave

    const getImageData = (url) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Melhor ajuste: Cover centralizado
                const targetSize = 300; // Maior qualidade
                const aspectRatio = img.width / img.height;
                let sw, sh, sx, sy;

                if (aspectRatio > 1) {
                    // Paisagem: cortar largura
                    sh = img.height;
                    sw = img.height;
                    sx = (img.width - sw) / 2;
                    sy = 0;
                } else {
                    // Retrato: cortar altura
                    sw = img.width;
                    sh = img.width;
                    sx = 0;
                    sy = (img.height - sh) / 2;
                }

                canvas.width = targetSize;
                canvas.height = targetSize;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetSize, targetSize);
                resolve(canvas.toDataURL('image/jpeg', 0.95));
            };
            img.onerror = () => resolve(null);
            img.src = url;
        });
    };

    window.hotelPetApp.showLoading();

    try {
        // === FUNDO E GRADIENTE DECORATIVO ===
        doc.setFillColor(...BG_LIGHT);
        doc.rect(0, 0, 100, 200, 'F');

        // Bordas laterais com gradiente simulado
        for (let i = 0; i < 4; i++) {
            const alpha = 255 - (i * 30);
            doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
            doc.rect(i, 0, 1, 200, 'F');
            doc.rect(99 - i, 0, 1, 200, 'F');
        }

        // === CABEÇALHO COM LOGO E GRADIENT ===
        // Gradient simulado (múltiplas camadas)
        for (let i = 0; i < 45; i++) {
            const progress = i / 45;
            const r = PRIMARY[0] + (ACCENT[0] - PRIMARY[0]) * progress;
            const g = PRIMARY[1] + (ACCENT[1] - PRIMARY[1]) * progress;
            const b = PRIMARY[2] + (ACCENT[2] - PRIMARY[2]) * progress;
            doc.setFillColor(r, g, b);
            doc.rect(0, i, 100, 1, 'F');
        }

        // Linha dourada/coral de destaque
        doc.setFillColor(...SECONDARY);
        doc.rect(8, 44, 84, 1.5, 'F');

        // Logo
        const logo = await getImageData('css/logo.png');
        if (logo) {
            doc.addImage(logo, 'PNG', 12, 8, 18, 18);
        }

        // Título do Recibo
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.text("RECIBO DE HOSPEDAGEM", 35, 14);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text("PetCá Premium Hotel", 35, 20);

        doc.setFontSize(7.5);
        const splitAddr = doc.splitTextToSize(address, 58);
        doc.text(splitAddr, 35, 25);
        doc.text(`Tel: ${phone}`, 35, 35);

        // === FOTO DO PET (CÍRCULO COM MOLDURA PREMIUM) ===
        let y = 53;
        const petPhoto = res.photo_url ? await getImageData(res.photo_url) : null;
        if (petPhoto) {
            const centerX = 50;
            const centerY = y + 20;
            const radius = 18;

            // Sombra externa suave (simulação)
            for (let r = radius + 3; r > radius; r--) {
                const alpha = 30 - ((radius + 3 - r) * 10);
                doc.setFillColor(0, 0, 0, alpha);
                doc.circle(centerX, centerY, r, 'F');
            }

            // Borda gradiente externa (anel roxo/lilás)
            doc.setLineWidth(2.5);
            doc.setDrawColor(...PRIMARY);
            doc.circle(centerX, centerY, radius + 1.5, 'S');

            doc.setLineWidth(1);
            doc.setDrawColor(...ACCENT);
            doc.circle(centerX, centerY, radius + 3, 'S');

            // Clip circular para a foto
            doc.saveGraphicsState();
            for (let angle = 0; angle < 360; angle += 10) {
                const rad = (angle * Math.PI) / 180;
                const x = centerX + radius * Math.cos(rad);
                const y = centerY + radius * Math.sin(rad);
                if (angle === 0) doc.moveTo(x, y);
                else doc.lineTo(x, y);
            }
            doc.clip();

            // Imagem ajustada perfeitamente
            doc.addImage(petPhoto, 'JPEG', centerX - radius, centerY - radius, radius * 2, radius * 2);
            doc.restoreGraphicsState();

            y += 50;
        } else {
            y += 5;
        }

        // === SEÇÃO DETALHES ===
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(8, y, 84, 68, 3, 3, 'F');

        // Borda sutil
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.roundedRect(8, y, 84, 68, 3, 3, 'S');

        y += 6;
        doc.setTextColor(...PRIMARY);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text("DETALHES DO SERVIÇO", 12, y);

        doc.setDrawColor(...SECONDARY);
        doc.setLineWidth(1);
        doc.line(12, y + 1, 88, y + 1);

        y += 9;
        doc.setTextColor(...TEXT_DARK);
        doc.setFontSize(9.5);

        const rows = [
            ["Pet:", res.animal_name],
            ["Tutor:", res.tutor_name],
            ["Alojamento:", `${res.accommodation_type} ${res.kennel_number}`],
            ["Período:", `${new Date(res.checkin_date + 'T12:00:00').toLocaleDateString('pt-BR')} até ${new Date(res.checkout_date + 'T12:00:00').toLocaleDateString('pt-BR')}`],
            ["Total:", `${res.total_days} diária${res.total_days > 1 ? 's' : ''}`]
        ];

        rows.forEach((item, idx) => {
            // Fundo alternado
            if (idx % 2 === 0) {
                doc.setFillColor(248, 250, 252);
                doc.rect(10, y - 3, 80, 6, 'F');
            }

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...TEXT_LIGHT);
            doc.text(item[0], 13, y);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...TEXT_DARK);

            // Texto justificado/quebrado se necessário
            const maxWidth = 45;
            const lines = doc.splitTextToSize(item[1], maxWidth);
            doc.text(lines, 40, y);

            y += lines.length > 1 ? 10 : 7;
        });

        // Serviços Extras
        if (res.transport_service || res.bath_service) {
            y += 3;
            doc.setTextColor(...PRIMARY);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text("SERVIÇOS EXTRAS:", 13, y);
            y += 5;
            doc.setTextColor(...TEXT_DARK);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            if (res.transport_service) {
                doc.text(`✓ Transporte: R$ ${res.transport_value.toFixed(2)}`, 16, y);
                y += 5;
            }
            if (res.bath_service) {
                doc.text(`✓ Banho e Tosa: R$ ${res.bath_value.toFixed(2)}`, 16, y);
                y += 5;
            }
        }

        // === TOTAL DESTACADO ===
        y = 158;
        // Gradiente de fundo para o total
        for (let i = 0; i < 30; i++) {
            const progress = i / 30;
            const r = 248 + (PRIMARY[0] - 248) * progress * 0.1;
            const g = 250 + (PRIMARY[1] - 250) * progress * 0.1;
            const b = 252 + (PRIMARY[2] - 252) * progress * 0.1;
            doc.setFillColor(r, g, b);
            doc.rect(8, y + i, 84, 1, 'F');
        }
        doc.roundedRect(8, y, 84, 30, 4, 4, 'FD');

        doc.setTextColor(...TEXT_LIGHT);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Pagamento: ${res.payment_method}`, 12, y + 8);

        doc.setFontSize(16);
        doc.setTextColor(...PRIMARY);
        doc.setFont('helvetica', 'bold');
        doc.text("TOTAL:", 12, y + 20);
        doc.text(`R$ ${res.total_value.toFixed(2)}`, 88, y + 20, { align: 'right' });

        // === RODAPÉ COM SLOGAN ===
        y = 193;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PRIMARY);
        doc.text("✨ Aqui tratamos seu pet com carinho! ✨", 50, y, { align: 'center' });

        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...TEXT_LIGHT);
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 50, y + 4, { align: 'center' });

        const filename = `Recibo_${res.animal_name}.pdf`;

        // Abrir modal de opções ou baixar
        if (window.animalProfileManager && window.animalProfileManager.showPDFOptions) {
            window.animalProfileManager.showPDFOptions(doc, filename);
        } else {
            doc.save(filename);
        }

    } catch (e) {
        console.error(e);
        window.hotelPetApp.showNotification('Erro ao gerar recibo', 'error');
    } finally {
        window.hotelPetApp.hideLoading();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.cameraManager = new CameraManager();
});
