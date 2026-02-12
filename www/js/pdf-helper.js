/**
 * PDFHelper - Centralized PDF Handling for Hotel Pet App
 * SOLUÇÃO ROBUSTA PARA ANDROID - Usa Share API como método principal
 */
window.PDFHelper = {
    /**
     * Shows a modal with PDF options (Download, View, Share)
     * @param {Object} doc - jsPDF instance
     * @param {string} filename - Desired filename (e.g., 'relatorio.pdf')
     * @param {Object} [data] - Optional extra data
     */
    showPDFOptions: async (doc, filename, data = null) => {
        const isMobile = window.Capacitor && window.Capacitor.isNativePlatform();
        const blob = doc.output('blob');
        const base64PDF = doc.output('datauristring').split(',')[1];

        return new Promise(resolve => {
            const modal = document.createElement('div');
            modal.id = "pdf-options-modal-global";
            modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10000; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(5px);";

            modal.innerHTML = `
                <div style="background:white; width:100%; max-width:400px; border-radius:24px; padding:30px; text-align:center; box-shadow:0 20px 40px rgba(0,0,0,0.3); animation: slideUp 0.3s ease-out;">
                    <div style="width:60px; height:60px; background:#f0e7ff; color:#673ab7; border-radius:20px; display:flex; align-items:center; justify-content:center; margin:0 auto 20px; font-size:1.5rem;"><i class="fas fa-file-pdf"></i></div>
                    <h3 style="margin-bottom:10px; color:#1e293b;">PDF Pronto!</h3>
                    <p style="color:#64748b; margin-bottom:25px; font-size:0.95rem;">Escolha como deseja usar o arquivo:</p>
                    <div style="display:grid; gap:12px;">
                        <button id="pdf-download-btn" class="btn btn-primary w-100" style="height:50px; display:flex; align-items:center; justify-content:center; gap:8px;">
                            <i class="fas fa-download"></i> <span>Salvar no Celular</span>
                        </button>
                        <button id="pdf-view-btn" class="btn btn-secondary w-100" style="height:50px; display:flex; align-items:center; justify-content:center; gap:8px;">
                            <i class="fas fa-eye"></i> <span>Abrir para Ver</span>
                        </button>
                        <button id="pdf-share-btn" class="btn btn-success w-100" style="height:50px; display:flex; align-items:center; justify-content:center; gap:8px;">
                            <i class="fas fa-share-alt"></i> <span>Compartilhar</span>
                        </button>
                        <button id="pdf-close-btn" style="margin-top:10px; background:none; border:none; color:#94a3b8; font-weight:600; cursor:pointer;">Fechar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            const removeModal = () => {
                modal.remove();
            };

            // Bind Events
            modal.querySelector('#pdf-download-btn').onclick = async () => {
                await window.PDFHelper.downloadPDF(doc, filename, base64PDF, isMobile, blob);
                resolve('download');
                removeModal();
            };

            modal.querySelector('#pdf-view-btn').onclick = async () => {
                await window.PDFHelper.viewPDF(doc, filename, base64PDF, isMobile, blob);
                resolve('view');
                removeModal();
            };

            modal.querySelector('#pdf-share-btn').onclick = async () => {
                await window.PDFHelper.sharePDF(doc, filename, base64PDF, isMobile, blob);
                resolve('share');
                removeModal();
            };
        });
    },

    downloadPDF: async (doc, filename, base64PDF, isMobile, blob) => {
        if (!isMobile) {
            doc.save(filename);
            return;
        }

        // ANDROID: Usar Share API para "salvar" - permite escolher app/local
        try {
            const { Filesystem, Share } = window.Capacitor.Plugins;

            // Salva no cache temporário
            const path = `download_${Date.now()}_${filename}`;
            await Filesystem.writeFile({
                path: path,
                data: base64PDF,
                directory: 'CACHE'
            });

            const uriResult = await Filesystem.getUri({ path: path, directory: 'CACHE' });

            // Usa Share para permitir salvar em qualquer lugar
            await Share.share({
                title: 'Salvar PDF',
                text: 'Escolha onde salvar o arquivo',
                url: uriResult.uri,
                dialogTitle: 'Salvar Arquivo'
            });

            if (window.hotelPetApp) {
                window.hotelPetApp.showNotification('Escolha onde salvar o arquivo', 'success');
            }

        } catch (e) {
            console.error('Erro ao salvar:', e);
            if (window.hotelPetApp) {
                window.hotelPetApp.showNotification('Erro: ' + e.message, 'error');
            } else {
                alert('Erro ao salvar: ' + e.message);
            }
        }
    },

    viewPDF: async (doc, filename, base64PDF, isMobile, blob) => {
        if (!isMobile) {
            window.open(doc.output('bloburl'), '_blank');
            return;
        }

        // ANDROID: Salva e abre com intent VIEW
        try {
            const { Filesystem, Share } = window.Capacitor.Plugins;
            const path = `view_${Date.now()}_${filename}`;

            await Filesystem.writeFile({
                path: path,
                data: base64PDF,
                directory: 'CACHE'
            });

            const uriResult = await Filesystem.getUri({ path: path, directory: 'CACHE' });

            // Tenta abrir diretamente
            console.log('Tentando abrir PDF:', uriResult.uri);

            // Método 1: Tentar window.open com _system
            const opened = window.open(uriResult.uri, '_system');

            // Se não funcionar após 2 segundos, oferece Share como fallback
            setTimeout(async () => {
                try {
                    await Share.share({
                        title: 'Abrir PDF',
                        text: 'Escolha um visualizador de PDF',
                        url: uriResult.uri,
                        dialogTitle: 'Abrir com...'
                    });
                } catch (shareErr) {
                    console.error('Fallback share também falhou:', shareErr);
                }
            }, 2000);

        } catch (e) {
            console.error('Erro ao visualizar:', e);
            if (window.hotelPetApp) {
                window.hotelPetApp.showNotification('Erro ao abrir. Tente "Compartilhar".', 'error');
            } else {
                alert('Erro ao abrir: ' + e.message);
            }
        }
    },

    sharePDF: async (doc, filename, base64PDF, isMobile, blob) => {
        if (!isMobile) {
            if (navigator.share) {
                try {
                    const f = new File([blob], filename, { type: 'application/pdf' });
                    await navigator.share({ files: [f], title: 'PDF PetCá', text: 'Segue anexo.' });
                } catch (e) { console.error(e); }
            } else {
                alert('Compartilhamento não suportado neste navegador.');
            }
            return;
        }

        try {
            const { Filesystem, Share } = window.Capacitor.Plugins;
            const path = `share_${Date.now()}_${filename}`;

            await Filesystem.writeFile({
                path: path,
                data: base64PDF,
                directory: 'CACHE'
            });

            const uriResult = await Filesystem.getUri({ path: path, directory: 'CACHE' });

            await Share.share({
                title: 'Compartilhar PDF',
                text: 'Documento PetCá',
                url: uriResult.uri,
                dialogTitle: 'Compartilhar via...'
            });

        } catch (e) {
            console.error('Erro ao compartilhar:', e);
            if (window.hotelPetApp) {
                window.hotelPetApp.showNotification('Erro ao compartilhar: ' + e.message, 'error');
            } else {
                alert('Erro ao compartilhar: ' + e.message);
            }
        }
    }
};
