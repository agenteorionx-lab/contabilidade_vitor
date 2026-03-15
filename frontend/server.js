const express = require('express');
const path = require('path');
const app = express();
const PORT = 3001; // Usando 3001 para não conflitar com o clube-v3 (3000)

// Servir arquivos estáticos da pasta dist
app.use(express.static(path.join(__dirname, 'dist')));

// Rota para qualquer página (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Dashboard rodando em http://localhost:${PORT}`);
});
