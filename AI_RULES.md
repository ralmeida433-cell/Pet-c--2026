# 🤖 AI_RULES - Hotel Pet CÁ

## 🛠 Tech Stack
- **Linguagem**: HTML5, CSS3, Vanilla JavaScript (Classes ES6+).
- **Mobile/Híbrido**: Capacitor 8.x para integração nativa (Android/iOS).
- **Banco de Dados**: SQL.js (SQLite no navegador) com persistência via Capacitor Filesystem.
- **PWA**: Service Workers e Manifest para modo offline e instalação.
- **UI/Ícones**: Font Awesome 6.5 e Google Fonts (Inter & Poppins).
- **Gráficos**: Chart.js para o Dashboard.
- **Servidor**: Node.js com Express para ambiente de desenvolvimento.

## 📏 Regras de Desenvolvimento
1. **Padrão de Código**: Utilize gerentes de classe (Managers) para cada módulo (ex: `AnimalsManager`, `ReservationsManager`).
2. **Persistência**: Sempre chame `window.db.saveData()` após operações de escrita para garantir que o Capacitor Filesystem salve o SQLite no dispositivo.
3. **Navegação**: Use `window.hotelPetApp.navigateToSection(sectionName)` para alternar entre telas, garantindo o funcionamento do histórico e do botão voltar no Android.
4. **UI Responsiva**: Siga as variáveis de CSS em `styles.css` e as adaptações para notch/entalhe em `mobile.css`.
5. **WhatsApp**: Utilize o formato `https://wa.me/NUMBER?text=MESSAGE` para integrações de mensagens, garantindo que o número seja limpo de caracteres não numéricos.
6. **Sincronização**: Mantenha os arquivos nas pastas raiz (`/js`, `/css`) sincronizados com a pasta `/www` para facilitar o build do Capacitor.
7. **Mensagens**: Mantenha o tom cortês e o slogan "Aqui seu pet é bem cuidado." em comunicações com o cliente.

---
*Este arquivo serve como guia para a IA manter a consistência arquitetural do projeto.*