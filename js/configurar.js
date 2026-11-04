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
      <p style="color:var(--texto-2)">O sistema já foi configurado. Entre pelo painel com o usuário do dono.</p>
      <a class="btn btn-pri btn-bloco" href="../painel/">Ir para o painel</a></div>`;
    return;
  }
  app.innerHTML = `${marca}<form class="caixa" id="f" novalidate>
      <h1 style="font-size:22px">Primeiro acesso</h1>
      <p style="color:var(--texto-2);margin-top:0">Crie o acesso do <b style="color:var(--texto)">dono</b>. Com ele você entra no painel e cadastra os barbeiros.</p>
      <div class="msg-erro" id="erro" role="alert"></div>
      <div class="campo"><label for="nome">Seu nome</label><input id="nome" autocomplete="name"></div>
      <div class="campo"><label for="login">Usuário</label><input id="login" autocapitalize="none" value="dono"><span class="dica">Letras minúsculas, sem espaço.</span></div>
      <div class="campo"><label for="senha">Senha</label><input id="senha" type="password" autocomplete="new-password"><span class="dica">Mínimo de 6 caracteres.</span></div>
      <div class="campo"><label for="senha2">Repita a senha</label><input id="senha2" type="password" autocomplete="new-password"></div>
      <button class="btn btn-pri btn-bloco">Criar acesso do dono</button>
    </form>`;
  U.$('#f').addEventListener('submit', async (e) => {
    e.preventDefault();
    const er = U.$('#erro'); er.textContent = '';
    if (U.$('#senha').value !== U.$('#senha2').value) { er.textContent = 'As senhas não são iguais.'; return; }
    const b = U.$('#f button'); b.disabled = true;
    try {
      await D.instalar(U.$('#nome').value, U.$('#login').value, U.$('#senha').value);
      location.href = '../painel/';
    } catch (err) { er.textContent = err.message; b.disabled = false; }
  });
})();
