// ===== SERVIÇO DE ARMAZENAMENTO NATIVO - HOTEL PET CÁ =====
// Sistema robusto de persistência de dados no hardware do dispositivo Android

const STORAGE_FOLDER = 'HotelPet_Data';
const DB_FILENAME = 'database.sqlite';
const PHOTOS_FOLDER = 'photos';

class StorageService {
    constructor() {
        this.fs = null;
        this.directory = null;
        this.isReady = false;
    }

    async init() {
        try {
            // Verifica se está rodando em plataforma nativa (Android/iOS)
            if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                // Tenta múltiplas formas de acessar o plugin Filesystem
                this.fs = window.Capacitor.Plugins.Filesystem || window.Filesystem;

                if (!this.fs) {
                    console.error('❌ Plugin Filesystem não encontrado no Capacitor');
                    return false;
                }

                // Directory.Data = armazenamento interno persistente
                // Definimos como string caso o enum não esteja acessível pelo proxy
                this.directory = 'DATA';

                // Tenta pegar do enum se disponível para garantir compatibilidade
                try {
                    if (this.fs.Directory && this.fs.Directory.Data) {
                        this.directory = this.fs.Directory.Data;
                    }
                } catch (e) { }

                // Cria estrutura de pastas
                await this.createFolderStructure();

                // Teste de Escrita Real (Garante que o plugin está funcionando)
                try {
                    const testPath = `${STORAGE_FOLDER}/boot.tmp`;
                    await this.fs.writeFile({
                        path: testPath,
                        data: btoa('test'),
                        directory: this.directory
                    });
                    this.isReady = true;
                    console.log('✅ Persistência nativa confirmada com teste de escrita');
                } catch (writeError) {
                    console.error('❌ Falha no teste de escrita nativa:', writeError);
                    this.isReady = false;
                    return false;
                }

                console.log('✅ Sistema de arquivos nativo inicializado');
                console.log(`📂 Pasta de dados: ${STORAGE_FOLDER}`);

                return true;
            } else {
                console.log('⚠️ Ambiente Web/Desktop - Usando localStorage como persistência primária');
                return false;
            }
        } catch (error) {
            console.error('❌ Erro crítico ao inicializar storage nativo:', error);
            return false;
        }
    }

    async createFolderStructure() {
        try {
            // Cria pasta principal
            await this.fs.mkdir({
                path: STORAGE_FOLDER,
                directory: this.directory,
                recursive: true
            });

            // Cria pasta de fotos
            await this.fs.mkdir({
                path: `${STORAGE_FOLDER}/${PHOTOS_FOLDER}`,
                directory: this.directory,
                recursive: true
            });

            console.log('📁 Estrutura de pastas criada com sucesso');
        } catch (e) {
            // Pastas já existem, tudo bem
            if (e.message && !e.message.includes('exists')) {
                console.warn('⚠️ Aviso ao criar pastas:', e.message);
            }
        }
    }

    async saveDatabase(uint8Array) {
        if (!this.fs || !this.isReady) {
            console.warn('⚠️ Storage não disponível, salvando apenas no localStorage');
            return false;
        }

        try {
            const startTime = Date.now();
            const sizeKB = (uint8Array.byteLength / 1024).toFixed(2);

            console.log(`💾 Salvando banco de dados (${sizeKB} KB)...`);

            // Conversão de alta performance: Uint8Array -> Blob -> Base64
            const base64Data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = (err) => reject(err);
                reader.readAsDataURL(new Blob([uint8Array]));
            });

            // Salva no hardware
            await this.fs.writeFile({
                path: `${STORAGE_FOLDER}/${DB_FILENAME}`,
                data: base64Data,
                directory: this.directory
            });

            const elapsed = Date.now() - startTime;
            console.log(`✅ Banco salvo no hardware em ${elapsed}ms`);
            console.log(`📊 Tamanho: ${sizeKB} KB`);

            return true;
        } catch (error) {
            console.error('❌ Erro ao salvar banco no hardware:', error);
            console.error('Detalhes:', {
                message: error.message,
                code: error.code,
                path: `${STORAGE_FOLDER}/${DB_FILENAME}`
            });
            return false;
        }
    }

    async loadDatabase() {
        if (!this.fs || !this.isReady) {
            console.log('⚠️ Storage não disponível, tentando localStorage');
            return null;
        }

        try {
            console.log('📂 Carregando banco de dados do hardware...');

            const result = await this.fs.readFile({
                path: `${STORAGE_FOLDER}/${DB_FILENAME}`,
                directory: this.directory
            });

            if (!result || !result.data) {
                console.log('⚠️ Arquivo vazio ou inválido');
                return null;
            }

            // Conversão Base64 para Uint8Array eficiente
            const binary = window.atob(result.data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }

            const sizeKB = (bytes.byteLength / 1024).toFixed(2);
            console.log(`✅ Banco carregado do hardware (${sizeKB} KB)`);

            return bytes;
        } catch (error) {
            if (error.message && error.message.includes('does not exist')) {
                console.log('📝 Nenhum banco anterior encontrado, criando novo');
            } else {
                console.error('❌ Erro ao carregar banco:', error);
            }
            return null;
        }
    }

    async saveImage(base64Data) {
        if (!this.fs || !this.isReady) {
            console.log('⚠️ Storage não disponível, mantendo Base64');
            return base64Data;
        }

        if (!base64Data || !base64Data.startsWith('data:image')) {
            return base64Data;
        }

        try {
            const fileName = `pet_${Date.now()}.jpg`;
            const path = `${STORAGE_FOLDER}/${PHOTOS_FOLDER}/${fileName}`;
            const cleanData = base64Data.split(',')[1];

            await this.fs.writeFile({
                path: path,
                data: cleanData,
                directory: this.directory
            });

            const uri = await this.fs.getUri({
                path: path,
                directory: this.directory
            });

            let webPath = uri.uri;
            if (window.Capacitor.convertFileSrc) {
                webPath = window.Capacitor.convertFileSrc(uri.uri);
            } else {
                // Fallback para versões mais recentes ou diferentes do Capacitor
                // Tenta construir o caminho manualmente se necessário ou usar utils
                webPath = window.Capacitor.utils?.convertFileSrc(uri.uri) || uri.uri;
            }

            console.log(`📸 Foto salva: ${fileName}`);

            return webPath;
        } catch (error) {
            console.error('❌ Erro ao salvar imagem:', error);
            return base64Data; // Fallback para Base64
        }
    }

    async getDatabaseInfo() {
        if (!this.fs || !this.isReady) return null;

        try {
            const stat = await this.fs.stat({
                path: `${STORAGE_FOLDER}/${DB_FILENAME}`,
                directory: this.directory
            });

            return {
                size: stat.size,
                sizeKB: (stat.size / 1024).toFixed(2),
                modified: new Date(stat.mtime)
            };
        } catch (error) {
            return null;
        }
    }
}

window.storageService = new StorageService();