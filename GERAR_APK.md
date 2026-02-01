# 📦 COMO GERAR O APK DO HOTEL PET CÁ

## 🎯 Duas Formas de Usar o App

### 1. PWA (Já está pronto!)
- Não precisa de APK
- Instala direto pelo navegador Chrome
- Atualização automática
- **Recomendado para uso pessoal/interno**

### 2. APK Nativo (Para Google Play ou distribuição)
- Arquivo `.apk` para instalar
- Preparado para Google Play Store
- Mais recursos nativos
- **Recomendado para distribuição ampla**

---

## 🚀 OPÇÃO 1: Instalar PWA (Mais Fácil)

### No celular Android:

1. Abra o Chrome
2. Acesse: `http://SEU_IP:3000` (ou o link do deploy)
3. Aguarde 2-3 segundos
4. Clique em **"Instalar Aplicativo"**
5. Pronto! ✅

**Vantagens:**
- ✅ Instalação em 1 minuto
- ✅ Atualização automática
- ✅ Sem necessidade de Android Studio
- ✅ Funciona em iOS também

---

## 📦 OPÇÃO 2: Gerar APK Nativo

### Pré-requisitos:

**IMPORTANTE:** Esta opção requer:
- ✅ Java JDK 17+ instalado
- ✅ Android Studio (ou apenas Android SDK)
- ✅ Variáveis de ambiente configuradas (`JAVA_HOME`, `ANDROID_HOME`)
- ⏱️ Tempo: ~30-60 minutos na primeira vez

### Método A: Com Android Studio (Mais Fácil)

#### 1. Instalar Android Studio

Se ainda não tem:
- Download: https://developer.android.com/studio
- Instale seguindo o assistente
- Abra o Android Studio ao menos uma vez para configurar o SDK

#### 2. Abrir Projeto no Android Studio

```powershell
# Navegue até a pasta do projeto
cd "c:\Users\rafae\Desktop\hotel pet"

# Prepare os arquivos
npx cap sync android

# Abra no Android Studio
npx cap open android
```

#### 3. Gerar APK no Android Studio

1. No Android Studio, vá em: **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**
2. Aguarde a compilação (~5-15 minutos na primeira vez)
3. Quando terminar, clique em **"locate"** na notificação
4. O APK estará em: `android/app/build/outputs/apk/debug/app-debug.apk`

#### 4. Instalar no Celular

**Via USB:**
```powershell
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

**Via Arquivo:**
- Copie o arquivo `app-debug.apk` para o celular
- Abra o arquivo no celular
- Permita instalação de fontes desconhecidas
- Instale!

---

### Método B: Linha de Comando (Para Avançados)

#### 1. Verificar Instalações

```powershell
# Java
java -version
# Deve mostrar: Java 17 ou superior

# Gradle (vem com o projeto)
.\android\gradlew -v

# Android SDK
echo $env:ANDROID_HOME
# Deve mostrar: C:\Users\SEU_USUARIO\AppData\Local\Android\Sdk
```

#### 2. Preparar Projeto

```powershell
cd "c:\Users\rafae\Desktop\hotel pet"

# Sincronizar arquivos
npx cap sync android
```

#### 3. Compilar APK Debug

```powershell
# Entrar na pasta android
cd android

# Compilar APK
.\gradlew assembleDebug

# Ou para APK Release (assinado)
.\gradlew assembleRelease
```

#### 4. Localizar APK

**Debug APK (para testes):**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

**Release APK (para produção):**
```
android/app/build/outputs/apk/release/app-release-unsigned.apk
```

---

## 🔑 Para Produção (Google Play Store)

### 1. Criar Keystore (Chave de Assinatura)

```powershell
keytool -genkey -v -keystore hotel-pet.keystore -alias hotel-pet -keyalg RSA -keysize 2048 -validity 10000
```

Informações a preencher:
- Senha do keystore (GUARDE BEM!)
- Nome, organização, etc.

### 2. Configurar Gradle

Crie o arquivo `android/key.properties`:

```properties
storePassword=SUA_SENHA_KEYSTORE
keyPassword=SUA_SENHA_KEY
keyAlias=hotel-pet
storeFile=../hotel-pet.keystore
```

### 3. Atualizar `android/app/build.gradle`

Adicione antes de `android {`:

```gradle
def keystorePropertiesFile = rootProject.file("key.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

E dentro de `android { ... }`, adicione:

```gradle
signingConfigs {
    release {
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
        storeFile file(keystoreProperties['storeFile'])
        storePassword keystoreProperties['storePassword']
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

### 4. Gerar APK Assinado

```powershell
cd android
.\gradlew assembleRelease
```

APK estará em: `android/app/build/outputs/apk/release/app-release.apk`

### 5. Gerar AAB para Google Play

```powershell
.\gradlew bundleRelease
```

AAB estará em: `android/app/build/outputs/bundle/release/app-release.aab`

---

## 📊 Comparação: PWA vs APK

| Recurso | PWA | APK |
|---------|-----|-----|
| Instalação | ✅ Navegador | ⚠️ APK file |
| Tamanho | 📦 ~1-5 MB | 📦 ~10-20 MB |
| Atualização | ✅ Automática | ❌ Manual |
| Google Play | ❌ Não | ✅ Sim |
| iOS | ✅ Funciona | ❌ Não |
| Setup | ✅ 1 minuto | ⚠️ 30-60 min |
| Notificações | ✅ Sim | ✅ Sim |
| Offline | ✅ Sim | ✅ Sim |
| Hardware | ⚠️ Limitado | ✅ Total |

---

## 🎯 Recomendação

### Para Uso Interno/Pessoal:
👉 **Use PWA** - Mais rápido e fácil

### Para Google Play Store:
👉 **Gere APK/AAB** - Necessário para publicação

### Para Máxima Compatibilidade:
👉 **Use ambos!** - PWA para usuários web, APK para download

---

## 🆘 Problemas Comuns

### ❌ "Java não encontrado"
```powershell
# Baixe JDK 17: https://www.oracle.com/java/technologies/downloads/
# Configure JAVA_HOME:
[System.Environment]::SetEnvironmentVariable('JAVA_HOME', 'C:\Program Files\Java\jdk-17', 'Machine')
```

### ❌ "ANDROID_HOME não encontrado"
```powershell
# Configure para o SDK do Android Studio:
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', "$env:LOCALAPPDATA\Android\Sdk", 'Machine')
```

### ❌ "Gradle build failed"
```powershell
# Limpe o build
cd android
.\gradlew clean

# Tente novamente
.\gradlew assembleDebug
```

### ❌ "SDK version not found"
- Abra Android Studio
- Vá em Tools > SDK Manager
- Instale Android SDK 33 (ou a versão requerida)

---

## 🚀 Scripts Úteis

Adicione ao `package.json`:

```json
"scripts": {
  "start": "node server.js",
  "dev": "node server.js",
  "android:sync": "npx cap sync android",
  "android:open": "npx cap open android",
  "android:build": "cd android && .\\gradlew assembleDebug",
  "android:release": "cd android && .\\gradlew assembleRelease"
}
```

Uso:
```powershell
npm run android:sync    # Sincronizar arquivos
npm run android:open    # Abrir Android Studio
npm run android:build   # Compilar APK debug
npm run android:release # Compilar APK release
```

---

## 📝 Checklist de Build

- [ ] Java JDK 17+ instalado
- [ ] Android Studio instalado (ou SDK)
- [ ] JAVA_HOME configurado
- [ ] ANDROID_HOME configurado
- [ ] Projeto sincronizado (`npx cap sync`)
- [ ] Build executado com sucesso
- [ ] APK testado em dispositivo real
- [ ] App funciona offline
- [ ] Notificações funcionando
- [ ] Performance OK

---

## 🎉 Resultado

Após seguir este guia, você terá:

📱 **APK Debug** - Para testar (`app-debug.apk`)  
🚀 **APK Release** - Para distribuir (`app-release.apk`)  
📦 **AAB** - Para Google Play Store (`app-release.aab`)

---

## 💾 Armazenamento de Dados (Novo)

O aplicativo agora salva fotos e banco de dados em uma pasta segura no seu dispositivo:

📂 **Local:** `Documentos/HotelPet_Data/`
- **database.sqlite**: Banco de dados com todas as informações.
- **photos/**: Pasta com todas as fotos dos animais e produtos.

**Importante:**
- Ao desinstalar o app, esses dados **NÃO** são perdidos (dependendo da versão do Android).
- Você pode fazer backup copiando essa pasta `HotelPet_Data` para o computador.

---

**Dica Final:** Se você só quer testar rapidamente, **use a opção PWA**. É muito mais rápido e funciona perfeitamente! O APK é necessário apenas para:
- Publicar na Google Play Store
- Distribuir fora do navegador
- Acesso a recursos nativos específicos

**Desenvolvido com ❤️ - Hotel Pet CÁ**
```
