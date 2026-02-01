# 📱 Hotel Pet CÁ - Aplicativo Multiplataforma

Sistema Moderno e Responsivo de Gerenciamento para Hotel Pet CÁ

## ✨ Características

### 🚀 Progressive Web App (PWA)
- ✅ Funciona como aplicativo nativo no Android
- ✅ Instalável na tela inicial do dispositivo
- ✅ Funciona offline após primeira instalação
- ✅ Atualizações automáticas
- ✅ Notificações push

### 📱 Responsividade Total
- ✅ Adaptação automática para todos os tamanhos de tela
- ✅ Suporte a dispositivos com notch (entalhe)
- ✅ Detecção automática de orientação (portrait/landscape)
- ✅ Interface otimizada para touch
- ✅ Bottom navigation bar em dispositivos móveis

### 🎨 Design Moderno
- ✅ Interface premium e intuitiva
- ✅ Animações suaves e responsivas
- ✅ Tema adaptável (claro/escuro)
- ✅ Ícones Font Awesome 6.5
- ✅ Fontes Google (Inter e Poppins)

### 🛠️ Funcionalidades
- 📊 Dashboard com estatísticas em tempo real
- 🐶 Cadastro e gerenciamento de animais
- 📅 Sistema de reservas
- 🏠 Gestão de canis (Kennels)
- 📦 Controle de estoque/inventário
- 📈 Relatórios detalhados
- 💾 Armazenamento local (IndexedDB / SQL.js)

## 📋 Requisitos

- Node.js (v14 ou superior)
- npm ou yarn
- Navegador moderno (Chrome, Edge, Safari, Firefox)

## 🚀 Como Rodar o Projeto

### 1. Instalação

```bash
# Clone ou navegue até a pasta do projeto
cd "c:\Users\rafae\Desktop\hotel pet"

# Instale as dependências (se ainda não instalou)
npm install

# Rode o servidor
npm run dev
# ou
npm start
```

### 2. Acesse no Navegador

Abra seu navegador e acesse:
```
http://localhost:3000
```

## 📱 Como Instalar no Android

### Método 1: Chrome/Edge (Recomendado)

1. Abra o aplicativo no navegador Chrome ou Edge do seu Android
2. Aguarde o prompt de instalação aparecer automaticamente
3. Clique em **"Instalar Aplicativo"** ou **"Adicionar à tela inicial"**
4. Pronto! O app estará disponível como qualquer outro aplicativo

### Método 2: Manual

1. Acesse `http://seu-ip:3000` no navegador do celular
2. Toque no menu (⋮) do navegador
3. Selecione **"Adicionar à tela inicial"** ou **"Instalar app"**
4. Confirme a instalação

### Método 3: Via QR Code

1. Use o comando para gerar um servidor acessível na rede local
2. Gere um QR Code com o IP da sua máquina
3. Escaneie com o celular
4. Instale normalmente

## 🌐 Como Fazer Deploy

### Opção 1: Vercel (Grátis e Fácil)

```bash
# Instale Vercel CLI
npm install -g vercel

# Faça deploy
vercel
```

### Opção 2: Netlify

```bash
# Instale Netlify CLI
npm install -g netlify-cli

# Faça deploy
netlify deploy
```

### Opção 3: GitHub Pages

1. Suba o projeto para o GitHub
2. Vá em Settings > Pages
3. Selecione a branch e pasta
4. Pronto!

### Opção 4: Servidor Próprio

```bash
# Configure um servidor nginx ou apache
# Aponte para a pasta do projeto
# Configure HTTPS (obrigatório para PWA)
```

## 📱 Compatibilidade com Dispositivos

### ✅ Testado e Otimizado Para:

#### Smartphones
- **Android**: Samsung, Xiaomi, Motorola, LG, etc (Android 8+)
- **iOS**: iPhone (iOS 12.2+)
- **Outros**: Huawei, Oppo, Vivo, etc

#### Tablets
- iPad, Samsung Galaxy Tab, etc

#### Tamanhos de Tela
- **Pequenos**: 320px - 480px (smartphones antigos)
- **Médios**: 481px - 768px (smartphones modernos)
- **Grandes**: 769px - 1024px (tablets)
- **Extra Grandes**: 1025px+ (desktop)

### 🔧 Recursos Especiais

#### Suporte a Notch
- ✅ iPhone X, 11, 12, 13, 14, 15
- ✅ Samsung Galaxy S21/S22/S23
- ✅ Xiaomi Mi 11/12/13
- ✅ OnePlus 9/10/11
- ✅ Qualquer dispositivo com entalhe

#### Orientações
- ✅ Portrait (vertical)
- ✅ Landscape (horizontal)
- ✅ Rotação automática
- ✅ Interface adaptável

## 🔒 HTTPS para PWA

Para instalar como PWA em produção, você **precisa** de HTTPS. Opções gratuitas:

1. **Let's Encrypt** (gratuito)
2. **Cloudflare** (gratuito)
3. **Vercel/Netlify** (HTTPS automático)

## 📊 Estrutura do Projeto

```
hotel-pet/
├── index.html              # Página principal
├── manifest.json          # Configuração PWA
├── service-worker.js      # Service Worker para PWA
├── server.js              # Servidor Express
├── package.json           # Dependências
├── css/
│   ├── styles.css         # Estilos principais
│   ├── mobile.css         # Estilos responsivos
│   └── logo.png           # Logo/ícone
├── js/
│   ├── app.js            # Aplicação principal
│   ├── database.js       # Gerenciamento de banco
│   ├── dashboard.js      # Dashboard
│   ├── animals.js        # Gestão de animais
│   ├── reservations.js   # Reservas
│   ├── kennels.js        # Canis
│   ├── inventory.js      # Estoque
│   └── reports.js        # Relatórios
└── README.md             # Este arquivo
```

## 🛠️ Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Banco de Dados**: SQL.js (SQLite no navegador)
- **PWA**: Service Workers, Manifest, Cache API
- **UI**: Font Awesome, Google Fonts
- **Charts**: Chart.js

## ⚡ Performance

- ✅ Cache agressivo de assets estáticos
- ✅ Lazy loading de módulos
- ✅ Minificação de CSS/JS em produção
- ✅ Imagens otimizadas
- ✅ Service Worker para cache inteligente

## 🐛 Troubleshooting

### O app não instala no Android
- Certifique-se que está usando HTTPS (em produção)
- Limpe o cache do navegador
- Verifique se o manifest.json está acessível
- Tente outro navegador (Chrome recomendado)

### Notch não está funcionando
- Verifique se adicionou `viewport-fit=cover` no viewport
- Certifique-se que está usando CSS com `safe-area-inset`
- Teste em um dispositivo real com notch

### App não funciona offline
- Verifique se o Service Worker foi registrado (console)
- Limpe o cache e recarregue
- Verifique se os assets estão sendo cacheados

### Teclado do Android sobrepõe campos
- O CSS mobile já inclui ajustes automáticos
- Verifique se `user-scalable=yes` está no viewport

## 📝 Licença

© 2026 Hotel Pet CÁ - Todos os direitos reservados

## 👨‍💻 Desenvolvedor

Sistema desenvolvido com foco em experiência multiplataforma e responsividade total.

## 🆘 Suporte

Para suporte técnico ou dúvidas:
- Email: suporte@hotelpetca.com
- Tel: (XX) XXXX-XXXX

---

**Desenvolvido com ❤️ para Hotel Pet CÁ**
