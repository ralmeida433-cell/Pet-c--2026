# 📦 Guia de Uso do Repositório GitHub

## ✅ Status Atual

O projeto foi **organizado e enviado com sucesso** para o GitHub!

**Repositório:** https://github.com/ralmeida433-cell/Pet-c--2026.git

## 📋 O que foi feito

1. ✅ **Limpeza da estrutura**
   - Removidos arquivos duplicados
   - Organizada a estrutura de pastas
   - Atualizado o `.gitignore` para ignorar arquivos temporários

2. ✅ **Configuração do Git**
   - Repositório remoto configurado
   - `.gitattributes` adicionado para normalização de line endings
   - Branch `main` configurada

3. ✅ **Commits realizados**
   - Commit 1: "Organizar estrutura do projeto e adicionar documentação"
   - Commit 2: "Adicionar .gitattributes para normalizar line endings"

## 🚀 Comandos Úteis do Git

### Ver status dos arquivos
```bash
git status
```

### Adicionar alterações
```bash
# Adicionar um arquivo específico
git add nome-do-arquivo.js

# Adicionar todos os arquivos modificados
git add .
```

### Fazer commit
```bash
git commit -m "Descrição das alterações"
```

### Enviar para o GitHub
```bash
git push
```

### Baixar alterações do GitHub
```bash
git pull
```

### Ver histórico de commits
```bash
git log --oneline
```

## 📝 Workflow Recomendado

### Quando fizer alterações no projeto:

1. **Verifique o status**
   ```bash
   git status
   ```

2. **Adicione os arquivos modificados**
   ```bash
   git add .
   ```

3. **Faça o commit com uma mensagem descritiva**
   ```bash
   git commit -m "Adicionar funcionalidade de reservas"
   ```

4. **Envie para o GitHub**
   ```bash
   git push
   ```

## 🔧 Dicas Importantes

### Arquivos que NÃO devem ser enviados ao GitHub:
- ❌ `node_modules/` (dependências - serão reinstaladas)
- ❌ `*.log` (logs de build)
- ❌ `*.apk` ou `*.aab` (arquivos compilados grandes)
- ❌ `www/` (gerado automaticamente pelo Capacitor)
- ❌ Arquivos temporários do Android Studio

Estes já estão configurados no `.gitignore` para serem ignorados automaticamente.

### Arquivos que DEVEM ser enviados:
- ✅ Código fonte (`.js`, `.html`, `.css`)
- ✅ Arquivos de configuração (`package.json`, `capacitor.config.json`)
- ✅ Documentação (`.md`)
- ✅ Assets pequenos (ícones, imagens essenciais)

## 🌿 Trabalhando com Branches (Opcional)

Se quiser trabalhar com recursos separados:

```bash
# Criar uma nova branch
git checkout -b nova-funcionalidade

# Fazer alterações e commits normalmente
git add .
git commit -m "Implementar nova funcionalidade"

# Enviar a branch
git push -u origin nova-funcionalidade

# Voltar para a main
git checkout main

# Fazer merge da branch
git merge nova-funcionalidade
```

## 🆘 Problemas Comuns

### "Permission denied" ao fazer push
- Certifique-se que está autenticado no GitHub
- Configure seu token de acesso pessoal (PAT) se necessário

### Conflitos ao fazer pull
```bash
# Salvar suas alterações temporariamente
git stash

# Baixar alterações
git pull

# Reaplicar suas alterações
git stash pop
```

### Desfazer último commit (antes do push)
```bash
git reset --soft HEAD~1
```

### Ver diferenças antes de commitar
```bash
git diff
```

## 📱 Próximos Passos

1. **Configurar GitHub Actions** (opcional)
   - Automatizar builds
   - Testes automáticos

2. **Criar Releases**
   - Versões estáveis do app
   - Tags de versão

3. **Colaboração**
   - Adicionar colaboradores no repositório
   - Configurar pull requests

## 🔗 Links Úteis

- **Repositório:** https://github.com/ralmeida433-cell/Pet-c--2026.git
- **GitHub Desktop:** https://desktop.github.com/ (interface gráfica)
- **Documentação Git:** https://git-scm.com/doc

## 💡 Observação sobre a pasta Pet-c--2026

A pasta `Pet-c--2026` dentro do projeto contém um repositório Git aninhado e muitos arquivos de build temporários. Recomendo:

1. **Fechar** o VS Code ou qualquer programa que possa estar usando arquivos dessa pasta
2. **Deletar** a pasta `Pet-c--2026` completamente
3. Todo o código fonte necessário já está na raiz do projeto

Se precisar da pasta Android, ela pode ser regenerada com:
```bash
npx cap add android
```

---

**✨ Projeto organizado e pronto para desenvolvimento colaborativo!**
