# 🚀 HOTEL PET CÁ: CONFIGURAÇÃO DE PRODUÇÃO

Este guia contém os passos técnicos para ativar o modo online (Nuvem) utilizando o arquivo `js/config.js`.

## 1. Configurando o Banco de Dados na Nuvem (Supabase)

O PetCá Premium está preparado para o **Supabase**. Siga estas etapas:

1.  Acesse [supabase.com](https://supabase.com) e crie um projeto gratuito.
2.  No menu lateral, vá em **Project Settings > API**.
3.  Copie a `Project URL` e a `anon public API key`.
4.  Abra o arquivo `js/config.js` no seu editor e:
    *   Cole a URL em `supabase.url`.
    *   Cole a KEY em `supabase.key`.
    *   Mude `useCloud: false` para `useCloud: true`.

## 2. Ativando o Script de Conexão

No arquivo `index.html`, procure pela linha do Supabase e remova o comentário:

```html
<!-- De: -->
<!-- <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> -->

<!-- Para: -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

## 3. Hospedagem (Onde o app vai morar)

Para que outros acessem via link:
- **Vercel** (v.gd/vercel): Arraste sua pasta para lá. É instantâneo e gratuito.
- **Netlify**: Mesma facilidade da Vercel.

## 4. Multi-Usuário em Tempo Real

Ao ativar o `useCloud: true`, o app passará a:
*   **Sincronizar Pets**: O que um celular cadastrar, o outro vê na hora.
*   **Reservas Compartilhadas**: Controle total da lotação do hotel por toda a equipe.
*   **Confirmação de E-mail Real**: O Supabase enviará os e-mails de boas-vindas para você.

## 5. Checklist Final de Produção 🎖️

- [ ] `useCloud` está como `true` em `config.js`?
- [ ] Chaves do Supabase estão corretas?
- [ ] Script do Supabase está descomentado no `index.html`?
- [ ] Gerou o novo APK ou subiu para o servidor Web?

---
**PetCá Premium v2.5.0 - Ready for Takeoff! 🚀**
