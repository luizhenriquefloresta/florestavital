# Como mandar o PR (fork) e testar localmente

## Situação

- O **commit** já foi feito na branch `feature/compras-coletivas-dinamico`.
- O **origin** aponta para o repositório do amigo: `luizhenriquefloresta/florestavital`.
- Você não tem permissão de push lá, então o fluxo é: **fork → push no seu fork → abrir PR**.

---

## 1. Criar o fork (se ainda não tiver)

1. Abra no navegador: **https://github.com/luizhenriquefloresta/florestavital**
2. Clique em **Fork** (canto superior direito).
3. Crie o fork na sua conta (ex.: `SEU_USUARIO/florestavital`).

---

## 2. Apontar seu repositório local para o seu fork e dar push

No terminal (na pasta do projeto), troque `SEU_USUARIO` pelo seu usuário do GitHub:

```bash
git remote add meu https://github.com/SEU_USUARIO/florestavital.git
git push -u meu feature/compras-coletivas-dinamico
```

Se o remote `meu` já existir e for outro usuário, remova e adicione de novo:

```bash
git remote remove meu
git remote add meu https://github.com/SEU_USUARIO/florestavital.git
git push -u meu feature/compras-coletivas-dinamico
```

---

## 3. Abrir o Pull Request

1. Abra **https://github.com/SEU_USUARIO/florestavital** (seu fork).
2. O GitHub costuma mostrar um banner: “feature/compras-coletivas-dinamico had recent pushes” com botão **Compare & pull request**. Clique nele.
3. Ou: vá em **Pull requests** → **New pull request**.
4. Confirme:
   - **base:** repositório `luizhenriquefloresta/florestavital`, branch `main` (ou a branch padrão do repo do amigo).
   - **compare:** seu fork, branch `feature/compras-coletivas-dinamico`.
5. Preencha título e descrição (ex.: “Compra Coletiva dinâmica: login por celular, verificação por e-mail, admin”) e abra o PR.

---

## 4. Testar localmente

Sim, você consegue testar tudo localmente mesmo em fork e antes do PR ser aprovado.

1. Na pasta do projeto, suba um servidor local, por exemplo:
   ```bash
   npx serve .
   ```
   (ou use a porta que o comando indicar, ex.: 3000)

2. No navegador, abra:
   - **http://localhost:3000/** (página inicial)
   - **http://localhost:3000/compras-coletivas.html** (Compra Coletiva)
   - **http://localhost:3000/admin-compras-coletivas.html** (admin)

3. Para a Compra Coletiva funcionar (itens, pedidos, código por e-mail), o **backend** precisa estar no ar:
   - Planilha no Google com as abas Items, Users, Orders.
   - Apps Script publicado como Web App.
   - No arquivo **js/config.js**, a variável `COMPRAS_COLETIVAS_API` deve ter a **URL do Web App** (a que termina em `/exec`).

4. Com isso, ao testar em **localhost**:
   - O HTML/CSS/JS do site rodam no seu PC.
   - As chamadas (itens, usuário, enviar código, pedido, admin) vão para a URL do Apps Script; se o script estiver publicado e o `config.js` correto, tudo funciona.
   - **CORS:** o Google costuma aceitar requisições de qualquer origem em Web Apps “Qualquer pessoa”. Se der erro de CORS no navegador, abra o console (F12) e confira a mensagem; em último caso o amigo pode testar já no GitHub Pages após o merge.

Resumo: **sim, dá para testar localmente**; basta servidor local + `config.js` com a URL do Web App e backend (planilha + Apps Script) já configurado.
