// Login da equipe (barbeiros e dono), usado em /barbeiro/ e /painel/.
(function () {
  U.telaLoginEquipe = (app, aoEntrar, titulo = 'Área do barbeiro') => {
    app.innerHTML = `<main class="pagina">
      <a href="../" class="marca peq" style="text-decoration:none;color:inherit;margin:12px 0 22px">
        <div class="mascote">${U.svgLogo()}</div><div class="sub">BARBEARIA</div><div class="nome">BarbermaN</div></a>
      <div class="caixa">
        <h1 style="font-size:22px">${U.esc(titulo)}</h1>
        <form id="f-login" novalidate>
          <div class="msg-erro" id="erro" role="alert"></div>
          <div class="campo"><label for="login">Usuário</label><input id="login" autocomplete="username" autocapitalize="none"></div>
          <div class="campo"><label for="senha">Senha</label><input id="senha" type="password" autocomplete="current-password"></div>
          <button class="btn btn-pri btn-bloco" type="submit">Entrar</button>
        </form>
      </div>
      ${BM_DADOS.demo ? `<div class="caixa" style="margin-top:14px;font-size:14px;color:var(--texto-2)">
        <b style="color:var(--texto)">Acessos de demonstração</b> (senha <b style="color:var(--texto)">1234</b>):<br>
        <button class="link-btn" data-u="lucas">lucas</button> barbeiro ·
        <button class="link-btn" data-u="rafa">rafa</button> barbeiro ·
        <button class="link-btn" data-u="dono">dono</button> dono (vê o painel)</div>` : ''}
    </main>`;
    U.$$('[data-u]', app).forEach((b) => b.addEventListener('click', () => { U.$('#login').value = b.dataset.u; U.$('#senha').value = '1234'; U.$('#senha').focus(); }));
    U.$('#f-login').addEventListener('submit', async (e) => {
      e.preventDefault();
      try { aoEntrar(await BM_DADOS.entrarEquipe(U.$('#login').value, U.$('#senha').value)); }
      catch (err) { U.$('#erro').textContent = err.message; }
    });
  };

  U.barraTopo = (eq, links) => `<header class="barra-topo">
    <div class="quem"><b>${U.esc(eq.nome)}</b><br>${eq.papel === 'dono' ? 'Dono' : 'Barbeiro'} ·
      <button class="link-btn" data-trocar-senha style="padding:0;min-height:0;font-size:13px">trocar senha</button></div>
    <nav>${links}<button class="btn btn-sec" id="sair-eq">Sair</button></nav></header>`;

  // "trocar senha" (qualquer tela da equipe)
  document.addEventListener('click', (ev) => {
    if (!ev.target.closest('[data-trocar-senha]')) return;
    U.modal(`<h2>Trocar minha senha</h2>
      <form id="f-senha" novalidate>
        <div class="msg-erro" id="erro-senha"></div>
        <div class="campo"><label for="s-atual">Senha atual</label><input id="s-atual" type="password" autocomplete="current-password"></div>
        <div class="campo"><label for="s-nova">Senha nova</label><input id="s-nova" type="password" autocomplete="new-password"><span class="dica">Mínimo de 6 caracteres.</span></div>
        <div class="campo"><label for="s-nova2">Repita a senha nova</label><input id="s-nova2" type="password" autocomplete="new-password"></div>
        <div class="modal-botoes"><button type="button" class="btn btn-sec" data-fechar>Cancelar</button><button class="btn btn-pri">Salvar</button></div>
      </form>`, (m, fechar) => {
      U.$('#f-senha', m).addEventListener('submit', async (e) => {
        e.preventDefault();
        const er = U.$('#erro-senha', m);
        if (U.$('#s-nova', m).value !== U.$('#s-nova2', m).value) { er.textContent = 'As senhas novas não são iguais.'; return; }
        try { await BM_DADOS.trocarSenha(U.$('#s-atual', m).value, U.$('#s-nova', m).value); fechar(); U.toast('Senha trocada.', 'ok'); }
        catch (err) { er.textContent = err.message; }
      });
    });
  });
})();
