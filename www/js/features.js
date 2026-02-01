// Funcionalidades Avançadas: Câmera, Notificações, Voz e Recibos

// 1. Busca por Voz
function startVoiceSearch(targetInputId) {
    if (!('webkitSpeechRecognition' in window)) {
        showNotification('Seu navegador não suporta busca por voz', 'error');
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
            // Disparar evento de input para filtrar automaticamente
            input.dispatchEvent(new Event('input'));
        }
    };

    recognition.onerror = () => {
        btn?.classList.remove('listening');
    };

    recognition.onend = () => {
        btn?.classList.remove('listening');
    };

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

        // Salvar em arquivo se possível
        let finalImage = imageData;
        if (window.storageService) {
            try {
                finalImage = await window.storageService.saveImage(imageData);
                console.log('Foto salva em:', finalImage);
            } catch (e) {
                console.error('Erro ao salvar foto:', e);
            }
        }

        this.preview.src = finalImage;
        this.preview.style.display = 'block';

        // Salvar no AnimalsManager se existir
        if (window.animalsManager) {
            window.animalsManager.currentPhotoBase64 = finalImage;
        }

        this.stopCamera();
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        this.container.style.display = 'none';
    }
}

// 3. Impressão de Recibos Otimizada para Mobile
function printReceipt(reservationId) {
    db.getReservationById(reservationId).then(res => {
        if (!res) return;

        // Criar iframe oculto para impressão
        let printFrame = document.getElementById('print-frame');
        if (!printFrame) {
            printFrame = document.createElement('iframe');
            printFrame.id = 'print-frame';
            printFrame.style.display = 'none';
            document.body.appendChild(printFrame);
        }

        const content = `
            <html>
            <head>
                <title>Recibo - Hotel Pet CÁ</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
                    .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; }
                    .receipt-title { font-size: 20px; font-weight: bold; color: #2563eb; }
                    .info-grid { display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 20px; }
                    .info-item { border-bottom: 1px solid #f1f5f9; padding: 5px 0; }
                    .label { font-weight: bold; color: #64748b; font-size: 12px; display: block; }
                    .value { font-size: 16px; }
                    .total-box { background: #f8fafc; padding: 15px; border-radius: 10px; text-align: right; border: 1px solid #e2e8f0; }
                    .total-label { font-size: 14px; color: #64748b; }
                    .total-value { font-size: 24px; font-weight: bold; color: #10b981; }
                    .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #94a3b8; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="receipt-title">RECIBO DE HOSPEDAGEM</div>
                    <div>Hotel Pet CÁ</div>
                </div>
                <div class="info-grid">
                    <div class="info-item"><span class="label">ANIMAL / TUTOR</span><span class="value">${res.animal_name} (${res.tutor_name})</span></div>
                    <div class="info-item"><span class="label">PERÍODO</span><span class="value">${new Date(res.checkin_date).toLocaleDateString()} a ${new Date(res.checkout_date).toLocaleDateString()}</span></div>
                    <div class="info-item"><span class="label">ACOMODAÇÃO</span><span class="value">${res.accommodation_type} ${res.kennel_number}</span></div>
                    <div class="info-item"><span class="label">DIÁRIAS</span><span class="value">${res.total_days}</span></div>
                </div>
                <div class="total-box">
                    <div class="total-label">VALOR TOTAL</div>
                    <div class="total-value">R$ ${res.total_value.toFixed(2)}</div>
                    <div style="font-size: 12px">Pagamento: ${res.payment_method}</div>
                </div>
                <div class="footer">
                    Gerado em: ${new Date().toLocaleString()}
                </div>
            </body>
            </html>
        `;

        const frameDoc = printFrame.contentWindow.document;
        frameDoc.open();
        frameDoc.write(content);
        frameDoc.close();

        // Aguardar carregamento e imprimir
        printFrame.contentWindow.focus();
        setTimeout(() => {
            printFrame.contentWindow.print();
        }, 500);
    });
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    window.cameraManager = new CameraManager();
});
