const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001;

// Servir arquivos estáticos da pasta www primeiro
app.use(express.static(path.join(__dirname, 'www')));
// Depois servir da raiz como fallback
app.use(express.static(__dirname));

// Rota principal
app.get('/', (req, res) => {
    const wwwIndex = path.join(__dirname, 'www', 'index.html');
    const rootIndex = path.join(__dirname, 'index.html');

    // Tentar servir da pasta www primeiro
    res.sendFile(wwwIndex, (err) => {
        if (err) {
            // Se não existir, servir da raiz
            res.sendFile(rootIndex);
        }
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📂 Servindo arquivos de: www/ e raiz`);
    console.log(`✨ Abra no navegador: http://localhost:${PORT}`);
});