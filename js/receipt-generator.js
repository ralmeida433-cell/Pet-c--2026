async function generateStylizedReceiptPDF(res, address, phone) {
    const { jsPDF } = window.jspdf;
    // Aumentar ligeiramente a altura para evitar cortes no rodapé se necessário, ou ajustar o layout vertical
    const doc = new jsPDF({ unit: 'mm', format: [100, 180] });

    // Paleta PetCá - Roxo Premium
    const PURPLE = [118, 75, 162];      // #764ba2
    const PURPLE_LIGHT = [167, 107, 207]; // Lilás
    const CORAL = [255, 126, 95];
    const GRAY_DARK = [51, 65, 85];
    const GRAY_LIGHT = [148, 163, 184];

    // Helper para processar imagem (já cortada em círculo no Canvas para garantir compatibilidade)
    const getCircularImageData = (url) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const size = 600; // Alta resolução
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');

                // 1. Criar máscara circular
                ctx.beginPath();
                ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();

                // 2. Desenhar imagem centralizada e preenchendo (Cover)
                const scale = Math.max(size / img.width, size / img.height);
                const x = (size / 2) - (img.width / 2) * scale;
                const y = (size / 2) - (img.height / 2) * scale;

                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

                // 3. Retornar PNG (necessário para transparência nos cantos do círculo)
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(null);
            img.src = url;
        });
    };

    const getLogoData = (url) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(null);
            img.src = url;
        });
    }

    window.hotelPetApp.showLoading();

    try {
        // --- FUNDO E CABEÇALHO ---
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, 100, 180, 'F');

        // Header Background
        doc.setFillColor(...PURPLE);
        doc.rect(0, 0, 100, 42, 'F');
        doc.setFillColor(...CORAL);
        doc.rect(0, 41, 100, 1.5, 'F');

        // Logo
        const logo = await getLogoData('css/logo.png');
        if (logo) {
            doc.addImage(logo, 'PNG', 8, 7, 22, 22);
        }

        // Texto Header
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13); // Reduzido
        doc.text("RECIBO DE HOSPEDAGEM", 34, 14);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text("PetCá Premium Hotel", 34, 19);

        // Endereço (Melhor controle de quebra de linha)
        doc.setFontSize(7.5);
        const addrLines = doc.splitTextToSize(address, 62); // Max width 62mm
        doc.text(addrLines, 34, 24);

        // Ajustar posição do telefone baseado na altura do endereço
        const phoneY = 24 + (addrLines.length * 3.5);
        doc.text(`Tel: ${phone}`, 34, phoneY);

        // --- FOTO DO PET ---
        let y = 55;
        const petPhoto = res.photo_url ? await getCircularImageData(res.photo_url) : null;

        if (petPhoto) {
            const cx = 50; // Centro X
            const cy = y + 15; // Centro Y
            const r = 18; // Raio

            // Desenhar a imagem (já cortada circularmente)
            doc.addImage(petPhoto, 'PNG', cx - r, cy - r, r * 2, r * 2);

            // Desenhar a borda decorativa por cima para acabamento perfeito
            doc.setLineWidth(1.5);
            doc.setDrawColor(...PURPLE);
            doc.circle(cx, cy, r, 'S');

            doc.setLineWidth(0.5);
            doc.setDrawColor(...PURPLE_LIGHT);
            doc.circle(cx, cy, r + 2, 'S');

            y += 42;
        } else {
            y += 5;
        }

        // --- CARD DETALHES ---
        // Fundo cinza claro
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(6, y, 88, 68, 3, 3, 'F');
        // Borda sutil
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(6, y, 88, 68, 3, 3, 'S');

        let innerY = y + 8;

        // Título Detalhes
        doc.setTextColor(...PURPLE);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text("DETALHES DO SERVIÇO", 10, innerY);
        doc.setDrawColor(...CORAL);
        doc.setLineWidth(0.8);
        doc.line(10, innerY + 1.5, 48, innerY + 1.5); // Sublinhado parcial

        innerY += 10;
        doc.setFontSize(9);

        // Função helper para linhas de dados
        const drawRow = (label, value) => {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...GRAY_LIGHT);
            doc.text(label, 10, innerY);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...GRAY_DARK);

            // Quebra de texto inteligente para não estourar
            const lines = doc.splitTextToSize(value, 55);
            doc.text(lines, 35, innerY);

            innerY += (lines.length * 4.5) + 3; // Espaçamento dinâmico
        };

        drawRow("Pet:", res.animal_name);
        drawRow("Tutor:", res.tutor_name);
        drawRow("Alojamento:", `${res.accommodation_type} ${res.kennel_number}`);
        drawRow("Período:", `${new Date(res.checkin_date + 'T12:00:00').toLocaleDateString('pt-BR')} até ${new Date(res.checkout_date + 'T12:00:00').toLocaleDateString('pt-BR')}`);
        drawRow("Duração:", `${res.total_days} dia${res.total_days > 1 ? 's' : ''}`);

        // Serviços Extras (Compacto)
        if (res.transport_service || res.bath_service) {
            innerY += 2;
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...PURPLE);
            doc.setFontSize(8.5);
            doc.text("EXTRAS:", 10, innerY);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...GRAY_DARK);

            const extrasText = [];
            if (res.transport_service) extrasText.push(`Transp: R$ ${res.transport_value.toFixed(2)}`);
            if (res.bath_service) extrasText.push(`Banho: R$ ${res.bath_value.toFixed(2)}`);

            doc.text(extrasText.join(' | '), 27, innerY);
        }

        // --- TOTAL ---
        y = 135; // Posição fixa para o total
        if (innerY > y) y = innerY + 5;

        // Box Total
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...PURPLE);
        doc.setLineWidth(0.5);
        doc.roundedRect(6, y, 88, 20, 2, 2, 'FD');

        doc.setFontSize(8);
        doc.setTextColor(...GRAY_LIGHT);
        doc.text(`Pagamento: ${res.payment_method || 'Não inf.'}`, 10, y + 7);

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PURPLE);
        doc.text("TOTAL", 10, y + 15);
        doc.text(`R$ ${res.total_value.toFixed(2)}`, 90, y + 15, { align: 'right' });

        // --- RODAPÉ ---
        y += 26; // Espaço após o total

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PURPLE);
        doc.text("Aqui tratamos seu pet com carinho!", 50, y, { align: 'center' });

        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150);
        doc.text(`Emissão: ${new Date().toLocaleString('pt-BR')}`, 50, y + 4, { align: 'center' });

        const filename = `Recibo_${res.animal_name}.pdf`;

        if (window.animalProfileManager && window.animalProfileManager.showPDFOptions) {
            window.animalProfileManager.showPDFOptions(doc, filename, res);
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

window.printReceipt = printReceipt;
