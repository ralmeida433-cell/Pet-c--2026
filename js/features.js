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

    capturePhoto() {
        const canvas = document.createElement('canvas');
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0);

        const imageData = canvas.toDataURL('image/jpeg');
        this.preview.src = imageData;
        this.preview.style.display = 'block';

        // Salvar no AnimalsManager se existir
        if (window.animalsManager) {
            window.animalsManager.currentPhotoBase64 = imageData;
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

// 3. Impressão de Recibos
function printReceipt(reservationId) {
    db.getReservationById(reservationId).then(res => {
        if (!res) return;

        const printWindow = window.open('', '_blank');
        const content = `
            <html>
            <head>
                <title>Recibo - Hotel Pet CÁ</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
                    .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
                    .receipt-title { font-size: 24px; font-weight: bold; color: #2563eb; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                    .info-item { margin-bottom: 10px; }
                    .label { font-weight: bold; color: #64748b; font-size: 14px; display: block; }
                    .value { font-size: 18px; }
                    .total-box { background: #f8fafc; padding: 20px; border-radius: 10px; text-align: right; border: 1px solid #e2e8f0; }
                    .total-label { font-size: 16px; color: #64748b; }
                    .total-value { font-size: 28px; font-weight: bold; color: #10b981; }
                    .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #94a3b8; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="receipt-title">RECIBO DE HOSPEDAGEM</div>
                    <div>Hotel Pet CÁ - Sistema de Gerenciamento</div>
                </div>
                <div class="info-grid">
                    <div class="info-item"><span class="label">ANIMAL</span><span class="value">${res.animal_name}</span></div>
                    <div class="info-item"><span class="label">TUTOR</span><span class="value">${res.tutor_name}</span></div>
                    <div class="info-item"><span class="label">ENTRADA</span><span class="value">${new Date(res.checkin_date).toLocaleDateString()}</span></div>
                    <div class="info-item"><span class="label">SAÍDA</span><span class="value">${new Date(res.checkout_date).toLocaleDateString()}</span></div>
                    <div class="info-item"><span class="label">ACOMODAÇÃO</span><span class="value">${res.accommodation_type} ${res.kennel_number}</span></div>
                    <div class="info-item"><span class="label">DIÁRIAS</span><span class="value">${res.total_days}</span></div>
                </div>
                <div class="total-box">
                    <div class="total-label">VALOR TOTAL PAGUE</div>
                    <div class="total-value">R$ ${res.total_value.toFixed(2)}</div>
                    <div>Forma de Pagamento: ${res.payment_method}</div>
                </div>
                <div class="footer">
                    Este é um comprovante digital gerado pelo Sistema Hotel Pet CÁ.<br>
                    Gerado em: ${new Date().toLocaleString()}
                </div>
                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
            </html>
        `;
        printWindow.document.write(content);
        printWindow.document.close();
    });
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    window.cameraManager = new CameraManager();
});
