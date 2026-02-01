class BackupManager {
    constructor() {
        this.init();
    }

    init() {
        console.log('Backup Manager initialized');
    }

    async exportDataToFolder() {
        try {
            // Verificar suporte à File System Access API
            if (!window.showDirectoryPicker) {
                // Fallback para download simples se não suportado
                this.exportDataAsJSON();
                return;
            }

            // Pedir ao usuário para selecionar/criar uma pasta
            const directoryHandle = await window.showDirectoryPicker({
                mode: 'readwrite',
                id: 'hotel-pet-data',
                startIn: 'documents'
            });

            if (!directoryHandle) return;

            showNotification('Iniciando exportação organizada...', 'info');

            // 1. Criar pastas organizadas
            const animalsFolder = await directoryHandle.getDirectoryHandle('Animais', { create: true });
            const reservationsFolder = await directoryHandle.getDirectoryHandle('Reservas', { create: true });
            const inventoryFolder = await directoryHandle.getDirectoryHandle('Estoque', { create: true });
            const photosFolder = await animalsFolder.getDirectoryHandle('Fotos_Pets', { create: true });

            // 2. Buscar dados do banco
            const animals = await db.getAnimals();
            const reservations = await db.getReservations();
            const products = window.inventoryManager?.products || [];

            // 3. Salvar Animais e Fotos
            for (const animal of animals) {
                // Salvar dados individuais do animal
                const animalFile = await animalsFolder.getFileHandle(`${animal.name}_${animal.id}.json`, { create: true });
                const writable = await animalFile.createWritable();
                await writable.write(JSON.stringify(animal, null, 2));
                await writable.close();

                // Salvar foto se existir
                if (animal.photo_url && animal.photo_url.startsWith('data:image')) {
                    const blob = this.base64ToBlob(animal.photo_url);
                    const ext = animal.photo_url.split(';')[0].split('/')[1];
                    const photoFile = await photosFolder.getFileHandle(`${animal.name}_${animal.id}.${ext}`, { create: true });
                    const photoWritable = await photoFile.createWritable();
                    await photoWritable.write(blob);
                    await photoWritable.close();
                }
            }

            // 4. Salvar Reservas
            const reservationsFile = await reservationsFolder.getFileHandle('todas_reservas.json', { create: true });
            const resWritable = await reservationsFile.createWritable();
            await resWritable.write(JSON.stringify(reservations, null, 2));
            await resWritable.close();

            // 5. Salvar Estoque
            const inventoryFile = await inventoryFolder.getFileHandle('estoque_produtos.json', { create: true });
            const invWritable = await inventoryFile.createWritable();
            await invWritable.write(JSON.stringify(products, null, 2));
            await invWritable.close();

            showNotification('Dados salvos na pasta selecionada com sucesso!', 'success');

        } catch (error) {
            console.error('Erro no backup:', error);
            if (error.name !== 'AbortError') {
                showNotification('Erro ao criar pasta: ' + error.message, 'error');
            }
        }
    }

    // Fallback: Exportar tudo em um único arquivo organizado
    async exportDataAsJSON() {
        try {
            showNotification('Preparando download do backup...', 'info');

            const animals = await db.getAnimals();
            const reservations = await db.getReservations();
            const products = window.inventoryManager?.products || [];

            const fullBackup = {
                version: '1.0',
                date: new Date().toISOString(),
                database: {
                    animals,
                    reservations,
                    inventory: products
                }
            };

            const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `hotel-pet-backup-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showNotification('Backup baixado com sucesso!', 'success');
        } catch (error) {
            showNotification('Erro ao gerar backup', 'error');
        }
    }

    base64ToBlob(base64Data) {
        const parts = base64Data.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
        }
        return new Blob([uInt8Array], { type: contentType });
    }
}

window.backupManager = new BackupManager();
