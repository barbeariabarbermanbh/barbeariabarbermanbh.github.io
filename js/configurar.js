// Primeiro acesso: cria a conta do DONO e as configurações iniciais. Só funciona uma vez
// (as regras do Firestore recusam depois que config/instalacao existe).
(async function () {
  const D = BM_DADOS;
  const app = U.$('#app');
  const marca = `<div class="marca peq" style="margin:12px 0 22px"><div class="mascote">${U.svgLogo()}</div><div class="sub">BARBEARIA</div><div class="nome">BarbermaN</div></div>`;

  if (D.demo) { app.innerHTML = `${marca}<div class="caixa"><p>Modo demonstração: não há o que configurar. Use o usuário <b>dono</b>, senha <b>1234</b>.</p></div>`; return; }
  await D.pronto();
  if (await D.instalado()) {
    app.innerHTML = `${marca}<div class="caixa"><h1 style="font-size:22px">Tudo pronto ✅</h1>
      <p style="color:var(--texto-2)">O sistema já foi configurado. Entre pelo painel com o acesso da administração.</p>
      <a class="btn btn-pri btn-bloco" href="../painel/">Ir para o painel</a></div>`;
    return;
  }
  app.innerHTML = `${marca}<div class="caixa">
      <h1 style="font-size:22px">Primeiro acesso</h1>
      <p style="color:var(--texto-2);margin-top:0">Crie o acesso da <b style="color:var(--texto)">administração</b>. Com ele você entra no painel e cadastra os barbeiros.</p>
      <div class="msg-erro" id="erro" role="alert"></div>
      <div class="campo"><label for="nome">Nome que aparece no painel</label><input id="nome" value="Administração"></div>
      <button class="btn btn-pri btn-bloco" id="google">Usar a conta Google da barbearia</button>
      <p class="dica" style="margin:8px 0 0">Escolha <b>barbeariabarbermanbh@gmail.com</b> na janela do Google.</p>
      <details style="margin-top:18px"><summary style="cursor:pointer;color:var(--texto-2)">Prefiro usuário e senha</summary>
        <form id="f" novalidate style="margin-top:12px">
          <div class="campo"><label for="login">Usuário</label><input id="login" autocapitalize="none" value="admin"><span class="dica">Letras minúsculas, sem espaço.</span></div>
          <div class="campo"><label for="senha">Senha</label><input id="senha" type="password" autocomplete="new-password"><span class="dica">Mínimo de 6 caracteres.</span></div>
          <div class="campo"><label for="senha2">Repita a senha</label><input id="senha2" type="password" autocomplete="new-password"></div>
          <button class="btn btn-sec btn-bloco">Criar com usuário e senha</button>
        </form></details>
    </div>`;
  const er = U.$('#erro');
  const criar = async (botao, ...args) => {
    er.textContent = ''; botao.disabled = true;
    try { await D.instalar(U.$('#nome').value, ...args); location.href = '../painel/'; }
    catch (err) { er.textContent = err.message; botao.disabled = false; }
  };
  U.$('#google').addEventListener('click', (e) => criar(e.currentTarget, '', '', true));
  U.$('#f').addEventListener('submit', (e) => {
    e.preventDefault();
    if (U.$('#senha').value !== U.$('#senha2').value) { er.textContent = 'As senhas não são iguais.'; return; }
    criar(U.$('#f button'), U.$('#login').value, U.$('#senha').value);
  });
})();
