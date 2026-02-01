# 📱 Guia de Build do Aplicativo Android - Hotel Pet CÁ

Este guia documenta o processo de transformação da aplicação web em um aplicativo híbrido nativo para Android, utilizando **Capacitor**.

## 🚀 Estrutura do Projeto Android

A aplicação foi convertida para um projeto híbrido funcional. 
- **ID do App:** `com.hotelpetca.app`
- **Nome:** `Hotel Pet CA`
- **Tecnologia:** Capacitor (Google/Ionic)

---

## 🛠 Pré-requisitos para Build

Para gerar o arquivo **APK** (instalável) ou **AAB** (para Google Play), você precisará de:

1.  **Node.js** instalado (você já possui).
2.  **Android Studio** instalado no seu computador.
3.  **Android SDK** configurado dentro do Android Studio.

---

## 🏗 Passo a Passo para Gerar o APK

### 1. Atualizar os Arquivos Web
Sempre que você alterar o código HTML, JS ou CSS, rode este comando no terminal da pasta raiz:
```powershell
npx cap copy android
```

### 2. Abrir no Android Studio
Abra o **Android Studio** e selecione a opção **"Open"**. Navegue até a pasta do projeto e selecione a subpasta chamada `android`.

### 3. Gerar o APK (Instalável)
Dentro do Android Studio:
1.  Vá no menu superior: **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
2.  Aguarde o Gradle terminar o processamento.
3.  Ao finalizar, aparecerá um balão no canto inferior direito. Clique em **"locate"**.
4.  O arquivo `app-debug.apk` estará lá. Este é o arquivo que você instala no seu celular.

### 4. Gerar o AAB (Para a Google Play)
1.  Vá no menu superior: **Build** > **Generate Signed Bundle / APK**.
2.  Siga as instruções para criar uma chave de assinatura (Keystore).
3.  Gere o arquivo `.aab`.

---

## ✅ Boas Práticas Android Implementadas

1.  **Splash Screen Profissional:** Carregamento suave com a cor primária do Hotel Pet.
2.  **StatusBar Customizada:** A barra superior do celular agora tem a mesma cor azul da aplicação.
3.  **Tratamento do Botão Voltar:** Ao clicar em "Voltar" no Android, o app fecha modais abertos ou volta para a tela inicial em vez de fechar o app bruscamente.
4.  **Permissões Modernas:** Configurado para solicitar acesso à Câmera e Armazenamento apenas quando necessário.
5.  **Ajuste de Teclado:** O layout se adapta automaticamente quando o teclado do Android aparece, evitando esconder campos de input.

---

## 📁 Pastas Criadas
- `/android`: Contém o código fonte Java/Kotlin nativo do Android.
- `/www`: Contém a versão otimizada do site para o App.
- `capacitor.config.json`: Configurações de plugins nativos.

---

**Nota:** Para uso profissional contínuo, recomenda-se configurar o ícone oficial gerando as diversas resoluções no Android Studio (Image Asset Studio).
