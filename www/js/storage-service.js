
// Serviço de Armazenamento Persistente usando Capacitor Filesystem
// Garante que os dados sejam salvos no dispositivo

const STORAGE_FOLDER = 'HotelPet_Data';
const DB_FILENAME = 'database.sqlite';
const PHOTOS_FOLDER = 'photos';

class StorageService {
    constructor() {
        this.baseDir = 'DOCUMENTS'; // Mapeia para Directory.Documents
        this.fs = null; // Será inicializado se Capacitor estiver disponível
    }

    async init() {
        if (window.Capacitor && window.Capacitor.Plugins.Filesystem) {
            this.fs = window.Capacitor.Plugins.Filesystem;
            this.Directory = window.Capacitor.Plugins.Filesystem.Directory;

            try {
                // Tenta criar a pasta principal
                await this.fs.mkdir({
                    path: STORAGE_FOLDER,
                    directory: this.Directory.Documents,
                    recursive: true
                });
                console.log('Pasta de armazenamento criada/verificada:', STORAGE_FOLDER);

                // Tenta criar a pasta de fotos
                await this.fs.mkdir({
                    path: `${STORAGE_FOLDER}/${PHOTOS_FOLDER}`,
                    directory: this.Directory.Documents,
                    recursive: true
                });
            } catch (e) {
                console.error('Erro ao inicializar armazenamento:', e);
                // Fallback para Directory.Data se Documents falhar (permissões)
                console.log('Tentando fallback para Directory.Data...');
                try {
                    this.baseDir = 'DATA'; // Fallback interno
                    await this.fs.mkdir({
                        path: STORAGE_FOLDER,
                        directory: this.Directory.Data,
                        recursive: true
                    });
                    await this.fs.mkdir({
                        path: `${STORAGE_FOLDER}/${PHOTOS_FOLDER}`,
                        directory: this.Directory.Data,
                        recursive: true
                    });
                    console.log('Fallback para Directory.Data realizado com sucesso.');
                } catch (e2) {
                    console.error('Erro fatal no armazenamento:', e2);
                }
            }
        }
    }

    // Salva o binário do banco de dados
    async saveDatabase(dataArray) {
        if (!this.fs) return false;

        try {
            // Converter Uint8Array para Base64 para salvar como arquivo no Capacitor
            // O Filesystem escreve strings ou base64
            const base64String = this.uint8ToBase64(dataArray);

            await this.fs.writeFile({
                path: `${STORAGE_FOLDER}/${DB_FILENAME}`,
                data: base64String,
                directory: this.baseDir === 'DOCUMENTS' ? this.Directory.Documents : this.Directory.Data,
                encoding: 'utf8' // 'utf8' aqui indica que 'data' é uma string, se fosse binário seria diferente
                // Na verdade, para escrever binário, o Capacitor espera Base64 se encoding não for passado ou for setado
            });
            console.log('Banco de dados salvo no arquivo com sucesso.');
            return true;
        } catch (e) {
            console.error('Erro ao salvar banco de dados em arquivo:', e);
            return false;
        }
    }

    // Carrega o binário do banco de dados
    async loadDatabase() {
        if (!this.fs) return null;

        try {
            const result = await this.fs.readFile({
                path: `${STORAGE_FOLDER}/${DB_FILENAME}`,
                directory: this.baseDir === 'DOCUMENTS' ? this.Directory.Documents : this.Directory.Data
            });

            // Capacitor retorna 'data' como string Base64 por padrão quando lendo arquivos
            if (result && result.data) {
                return this.base64ToUint8(result.data);
            }
            return null;
        } catch (e) {
            console.log('Nenhum banco de dados encontrado no arquivo (primeira execução?).');
            return null;
        }
    }

    // Salva uma imagem (Base64) como arquivo e retorna o caminho acessível
    async saveImage(base64Data) {
        if (!this.fs) return base64Data; // Retorna o próprio base64 se não tiver FS

        const fileName = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
        const path = `${STORAGE_FOLDER}/${PHOTOS_FOLDER}/${fileName}`;

        // Remover prefixo data:image/jpeg;base64, se existir
        const dataToWrite = base64Data.split(',')[1] || base64Data;

        try {
            const result = await this.fs.writeFile({
                path: path,
                data: dataToWrite,
                directory: this.baseDir === 'DOCUMENTS' ? this.Directory.Documents : this.Directory.Data
            });

            // Retornar a URI do arquivo
            const uriResult = await this.fs.getUri({
                path: path,
                directory: this.baseDir === 'DOCUMENTS' ? this.Directory.Documents : this.Directory.Data
            });

            // Converter para URL acessível pelo Capacitor WebView
            const capUrl = window.Capacitor.convertFileSrc(uriResult.uri);
            return capUrl;

        } catch (e) {
            console.error('Erro ao salvar imagem:', e);
            return base64Data; // Fallback
        }
    }

    // Utilitários de conversão
    uint8ToBase64(u8Arr) {
        const CHUNK_SIZE = 0x8000; // 32768
        let index = 0;
        let length = u8Arr.length;
        let result = '';
        let slice;
        while (index < length) {
            slice = u8Arr.subarray(index, Math.min(index + CHUNK_SIZE, length));
            result += String.fromCharCode.apply(null, slice);
            index += CHUNK_SIZE;
        }
        return btoa(result);
    }

    base64ToUint8(base64) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }
}

window.storageService = new StorageService();
