const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001; // <-- Mudado de 3000 para 3001

// Servir arquivos estáticos
app.use(express.static('.'));

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});