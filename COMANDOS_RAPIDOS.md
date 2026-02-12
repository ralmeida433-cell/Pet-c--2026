# ⚡ COMANDOS RÁPIDOS - HOTEL PET CÁ

## 🚀 Gerar APK

### Opção 1: Comando Único
```powershell
cd "c:\Users\rafae\Desktop\hotel pet - Copia" ; npx cap sync ; npx cap copy ; cd android ; .\gradlew assembleDebug
```

### Opção 2: Passo a Passo
```powershell
# 1. Ir para a pasta do projeto
cd "c:\Users\rafae\Desktop\hotel pet - Copia"

# 2. Sincronizar arquivos
npx cap sync

# 3. Copiar para Android
npx cap copy

# 4. Ir para pasta Android
cd android

# 5. Gerar APK
.\gradlew assembleDebug
```

### 📦 Localização do APK:
```
android\app\build\outputs\apk\debug\app-debug.apk
```

---

## 🔄 Atualizar Arquivos no APK

Se você modificou HTML, CSS ou JS:

```powershell
cd "c:\Users\rafae\Desktop\hotel pet - Copia"
npx cap copy
cd android
.\gradlew assembleDebug
```

---

## 🧹 Limpar e Reconstruir

Se o APK não está funcionando:

```powershell
cd "c:\Users\rafae\Desktop\hotel pet - Copia\android"
.\gradlew clean
.\gradlew assembleDebug
```

---

## 📱 Instalar APK no Celular via USB

### 1. Conectar o celular
- Ative "Depuração USB" no celular
- Conecte via cabo USB

### 2. Verificar conexão
```powershell
adb devices
```
Deve mostrar seu dispositivo

### 3. Instalar APK
```powershell
cd "c:\Users\rafae\Desktop\hotel pet - Copia"
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```

---

## 🔍 Ver Logs do App no Celular

### Logs em tempo real:
```powershell
adb logcat | Select-String "Hotel"
```

### Limpar logs e ver novos:
```powershell
adb logcat -c
adb logcat | Select-String -Pattern "Hotel|Storage|Database"
```

### Salvar logs em arquivo:
```powershell
adb logcat > logs.txt
```

---

## 🌐 Testar no Navegador

### Abrir diretamente:
```powershell
start "c:\Users\rafae\Desktop\hotel pet - Copia\index.html"
```

### Ou com servidor local:
```powershell
cd "c:\Users\rafae\Desktop\hotel pet - Copia"
npx http-server -p 8080
```
Depois abra: `http://localhost:8080`

---

## 📋 Copiar Arquivos para www/

Se você editou arquivos na raiz:

```powershell
cd "c:\Users\rafae\Desktop\hotel pet - Copia"

# Copiar CSS
Copy-Item -Path "css\*" -Destination "www\css\" -Recurse -Force

# Copiar JS
Copy-Item -Path "js\*" -Destination "www\js\" -Recurse -Force

# Copiar HTML
Copy-Item -Path "index.html" -Destination "www\" -Force
```

---

## 🔧 Verificar Versões

```powershell
# Node.js
node --version

# NPM
npm --version

# Capacitor
npx cap --version

# ADB (Android Debug Bridge)
adb version
```

---

## 📊 Informações do Projeto

### Ver estrutura de pastas:
```powershell
tree /F "c:\Users\rafae\Desktop\hotel pet - Copia" > estrutura.txt
```

### Ver tamanho do APK:
```powershell
Get-Item "c:\Users\rafae\Desktop\hotel pet - Copia\android\app\build\outputs\apk\debug\app-debug.apk" | Select-Object Name, Length
```

---

## 🆘 Resolver Problemas Comuns

### Erro: "Gradle não encontrado"
```powershell
cd "c:\Users\rafae\Desktop\hotel pet - Copia\android"
.\gradlew wrapper --gradle-version 8.0
```

### Erro: "SDK não encontrado"
Edite: `android\local.properties`
```properties
sdk.dir=C:\\Users\\rafae\\AppData\\Local\\Android\\Sdk
```

### Erro: "Capacitor não sincronizado"
```powershell
cd "c:\Users\rafae\Desktop\hotel pet - Copia"
npx cap sync android
```

### Limpar cache do Gradle:
```powershell
cd "c:\Users\rafae\Desktop\hotel pet - Copia\android"
.\gradlew clean
.\gradlew --stop
```

---

## 🎯 Workflow Completo

### Para desenvolvimento diário:

```powershell
# 1. Edite seus arquivos (HTML, CSS, JS)

# 2. Copie para www/
cd "c:\Users\rafae\Desktop\hotel pet - Copia"
Copy-Item -Path "css\*" -Destination "www\css\" -Recurse -Force
Copy-Item -Path "js\*" -Destination "www\js\" -Recurse -Force
Copy-Item -Path "index.html" -Destination "www\" -Force

# 3. Sincronize com Capacitor
npx cap copy

# 4. Gere o APK
cd android
.\gradlew assembleDebug

# 5. Instale no celular
cd ..
adb install -r android\app\build\outputs\apk\debug\app-debug.apk

# 6. Veja os logs
adb logcat | Select-String "Hotel"
```

---

## 📝 Atalhos Úteis

### Criar alias no PowerShell:

Adicione ao seu perfil (`notepad $PROFILE`):

```powershell
# Alias para o projeto Hotel Pet
function hotel-build {
    cd "c:\Users\rafae\Desktop\hotel pet - Copia"
    npx cap sync
    npx cap copy
    cd android
    .\gradlew assembleDebug
}

function hotel-install {
    cd "c:\Users\rafae\Desktop\hotel pet - Copia"
    adb install -r android\app\build\outputs\apk\debug\app-debug.apk
}

function hotel-logs {
    adb logcat | Select-String -Pattern "Hotel|Storage|Database"
}

function hotel-sync {
    cd "c:\Users\rafae\Desktop\hotel pet - Copia"
    Copy-Item -Path "css\*" -Destination "www\css\" -Recurse -Force
    Copy-Item -Path "js\*" -Destination "www\js\" -Recurse -Force
    Copy-Item -Path "index.html" -Destination "www\" -Force
    npx cap copy
}
```

Depois use:
```powershell
hotel-build    # Gera o APK
hotel-install  # Instala no celular
hotel-logs     # Mostra logs
hotel-sync     # Sincroniza arquivos
```

---

## 🎉 Pronto!

Agora você tem todos os comandos necessários para:
- ✅ Gerar APK
- ✅ Instalar no celular
- ✅ Ver logs
- ✅ Resolver problemas
- ✅ Desenvolver rapidamente

**Boa sorte com o Hotel Pet CÁ! 🐾**
