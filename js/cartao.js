// Tela do cliente: entrar/criar conta → completar perfil → cartão de carimbos.
(function () {
  const D = BM_DADOS;
  const C = BM_CONFIG;
  const app = U.$('#app');
  let cfg = null;
  let ultimoCarimbos = null;
  let telaAtual = '';

  U.faixaDemo(' · <a href="../barbeiro/" style="color:#FFE7B0">abrir a tela do barbeiro</a>');

  const marca = `<a href="../" class="marca peq" style="text-decoration:none;color:inherit;margin-bottom:18px">
    <div class="mascote">${U.svgLogo()}</div><div class="sub">BARBEARIA</div><div class="nome">BarbermaN</div></a>`;

  async function iniciar() {
    app.innerHTML = `${marca}<p style="text-align:center;color:var(--texto-2)">Carregando seu cartão…</p>`;
    await D.pronto();
    cfg = await D.config();
    rota();
    D.observar(async () => {
      cfg = await D.config();
      const cli = D.clienteLogado();
      if (telaAtual === 'cartao' && cli && !cli.pendente) telaCartao(cli, true);
    });
  }

  function rota() {
    const cli = D.clienteLogado();
    if (!cli) return telaEntrada();
    if (cli.pendente) return telaPerfil(cli);
    telaCartao(cli);
  }

  // ---------------- ENTRADA ----------------
  function telaEntrada(aba = 'entrar') {
    telaAtual = 'entrada';
    app.innerHTML = `${marca}
      <h1 style="text-align:center;font-size:24px">Seu cartão fidelidade</h1>
      <p style="text-align:center;color:var(--texto-2);margin-top:-4px">A cada <b style="color:var(--texto)">${cfg.meta} cortes</b>, o próximo é por nossa conta.</p>
      <div class="caixa" style="margin-top:18px">
        <button class="btn btn-google btn-bloco" id="google">${U.svgGoogle()} Entrar com Google</button>
        <div class="divisor">ou com seu CPF</div>
        <div class="abas" role="tablist">
          <button role="tab" aria-selected="${aba === 'entrar'}" data-aba="entrar">Já tenho cartão</button>
          <button role="tab" aria-selected="${aba === 'criar'}" data-aba="criar">Criar cartão</button>
        </div>
        <form id="form" novalidate>
          <div class="msg-erro" id="erro" role="alert"></div>
          <div class="campo"><label for="cpf">CPF</label>
            <input id="cpf" inputmode="numeric" autocomplete="username" placeholder="000.000.000-00" required></div>
          <div class="campo"><label for="senha">Senha</label>
            <input id="senha" type="password" autocomplete="${aba === 'criar' ? 'new-password' : 'current-password'}" required minlength="6">
            ${aba === 'criar' ? '<span class="dica">Mínimo de 6 caracteres.</span>' : ''}</div>
          ${aba === 'criar' ? `<div class="campo"><label for="senha2">Repita a senha</label>
            <input id="senha2" type="password" autocomplete="new-password" required></div>` : ''}
          <button class="btn btn-pri btn-bloco" type="submit">${aba === 'criar' ? 'Criar meu cartão' : 'Entrar'}</button>
        </form>
        ${aba === 'entrar' ? '<p style="text-align:center;margin:10px 0 0"><button class="link-btn" id="esqueci">Esqueci minha senha</button></p>' : ''}
      </div>
      ${D.demo && !U.limpo ? `<p class="dica" style="color:var(--texto-2);font-size:13px;text-align:center;margin-top:14px">Demonstração: crie um cartão com qualquer CPF válido<br>(ex.: <button class="link-btn" id="cpf-exemplo" style="padding:0;min-height:0">gerar um CPF de teste</button>).</p>` : ''}`;

    U.mascara(U.$('#cpf'), 'cpf');
    U.$$('[data-aba]').forEach((b) => b.addEventListener('click', () => telaEntrada(b.dataset.aba)));
    U.$('#google').addEventListener('click', escolherGoogle);
    const esq = U.$('#esqueci'); if (esq) esq.addEventListener('click', telaEsqueci);
    const ex = U.$('#cpf-exemplo'); if (ex) ex.addEventListener('click', () => { U.$('#cpf').value = U.fmtCpf(cpfTeste()); U.$('#senha').focus(); });

    U.$('#form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const erroEl = U.$('#erro'); erroEl.textContent = '';
      const cpf = U.$('#cpf').value, senha = U.$('#senha').value;
      const btn = e.submitter || U.$('#form button[type=submit]'); btn.disabled = true;
      try {
        if (aba === 'criar') {
          if (senha !== U.$('#senha2').value) throw new Error('As senhas não são iguais.');
          await D.criarContaCpf(cpf, senha);
        } else {
          if (!U.cpfValido(cpf)) throw new Error('CPF inválido. Confira os números.');
          await D.entrarCpf(cpf, senha);
        }
        rota();
      } catch (err) {
        erroEl.innerHTML = U.esc(err.message) + (err.codigo === 'CPF_EXISTE' ? ' <button class="link-btn" id="ir-entrar" style="padding:0;min-height:0">Entrar</button>' : '');
        const ir = U.$('#ir-entrar'); if (ir) ir.addEventListener('click', () => telaEntrada('entrar'));
        btn.disabled = false;
      }
    });
  }

  function cpfTeste() {
    const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
    for (let t = 9; t < 11; t++) { let s = 0; for (let i = 0; i < t; i++) s += n[i] * (t + 1 - i); n.push(((s * 10) % 11) % 10); }
    return n.join('');
  }

  // Demo: imita a janela de contas do Google. Na versão real: signInWithPopup(GoogleAuthProvider).
  async function escolherGoogle() {
    if (!D.demo) {
      try { await D.entrarGoogle(); rota(); }
      catch (err) { if (err.codigo !== 'CANCELADO') U.toast(err.message, 'erro'); }
      return;
    }
    const contas = [
      { nome: 'Pedro Henrique', email: 'pedro.henrique@gmail.com', cor: '#7E57C2' },
      { nome: 'Marcos Vinícius', email: 'marcos.vini@gmail.com', cor: '#00897B' }
    ];
    U.modal(`<h2 style="display:flex;align-items:center;gap:10px"><span style="width:24px">${U.svgGoogle()}</span>Escolha uma conta</h2>
      <p style="margin-top:0">para continuar em <b style="color:var(--texto)">BarbermaN</b> <span style="font-size:12px">(simulação)</span></p>
      <div class="contas-google">${contas.map((c, i) => `<button data-i="${i}"><span class="avatar" style="background:${c.cor}">${c.nome[0]}</span>
        <span><b style="display:block">${c.nome}</b><small style="color:var(--texto-2)">${c.email}</small></span></button>`).join('')}</div>
      <div class="modal-botoes"><button class="btn btn-sec" data-fechar>Cancelar</button></div>`, (m, fechar) => {
      U.$$('[data-i]', m).forEach((b) => b.addEventListener('click', async () => {
        fechar();
        await D.entrarGoogle(contas[b.dataset.i]);
        rota();
      }));
    });
  }

  function telaEsqueci() {
    telaAtual = 'esqueci';
    app.innerHTML = `${marca}
      <div class="caixa">
        <h1 style="font-size:22px">Recuperar acesso</h1>
        <p style="color:var(--texto-2);margin-top:0">Informe seu CPF e escolha uma senha nova. A barbearia confirma que é você e libera o acesso. <b style="color:var(--texto)">Seus carimbos não se perdem.</b></p>
        <form id="form" novalidate>
          <div class="msg-erro" id="erro" role="alert"></div>
          <div class="campo"><label for="cpf">CPF</label><input id="cpf" inputmode="numeric" placeholder="000.000.000-00"></div>
          <div class="campo"><label for="whats">Seu WhatsApp</label><input id="whats" inputmode="tel" autocomplete="tel" placeholder="(31) 99999-9999"></div>
          <div class="campo"><label for="senha">Nova senha</label><input id="senha" type="password" autocomplete="new-password"><span class="dica">Mínimo de 6 caracteres.</span></div>
          <button class="btn btn-pri btn-bloco" type="submit">Pedir liberação</button>
        </form>
        <p style="text-align:center;margin:10px 0 0"><button class="link-btn" id="voltar">Voltar</button></p>
      </div>`;
    U.mascara(U.$('#cpf'), 'cpf'); U.mascara(U.$('#whats'), 'tel');
    U.$('#voltar').addEventListener('click', () => telaEntrada());
    U.$('#form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await D.pedirRecuperacao(U.$('#cpf').value, U.$('#senha').value, U.$('#whats').value);
        const w = C.whatsapp ? U.linkWhats(C.whatsapp, 'Olá! Pedi a recuperação do meu cartão fidelidade pelo site. CPF: ' + U.$('#cpf').value) : '';
        app.innerHTML = `${marca}<div class="caixa" style="text-align:center">
          <h1 style="font-size:22px">Pedido enviado ✅</h1>
          <p style="color:var(--texto-2)">Assim que a barbearia confirmar, é só entrar com seu CPF e a senha nova. Na próxima visita, também dá para pedir direto ao barbeiro.</p>
          ${w ? `<a class="btn btn-whats btn-bloco" href="${w}" target="_blank" rel="noopener">${U.svgWhats()} Avisar pelo WhatsApp</a>` : ''}
          <button class="btn btn-sec btn-bloco" style="margin-top:10px" id="voltar">Voltar ao início</button></div>`;
        U.$('#voltar').addEventListener('click', () => telaEntrada());
      } catch (err) { U.$('#erro').textContent = err.message; }
    });
  }

  // ---------------- PERFIL ----------------
  function telaPerfil(pend) {
    telaAtual = 'perfil';
    app.innerHTML = `${marca}
      <div class="caixa">
        <h1 style="font-size:22px">Falta pouco! 🎉</h1>
        <p style="color:var(--texto-2);margin-top:0">Complete seus dados para ativar seu cartão.</p>
        <form id="form" novalidate>
          <div class="msg-erro" id="erro" role="alert"></div>
          <div class="campo"><label for="nome">Nome e sobrenome</label><input id="nome" autocomplete="name" value="${U.esc(pend.nome || '')}"></div>
          ${pend.cpf ? '' : `<div class="campo"><label for="cpf">CPF</label><input id="cpf" inputmode="numeric" placeholder="000.000.000-00"><span class="dica">Usado só para identificar seu cartão.</span></div>`}
          <div class="campo"><label for="whats">WhatsApp</label><input id="whats" inputmode="tel" autocomplete="tel" placeholder="(31) 99999-9999"></div>
          <div class="campo"><label for="nasc">Data de nascimento</label><input id="nasc" type="date" max="${new Date().toISOString().slice(0, 10)}"><span class="dica">No seu aniversário tem surpresa 😉</span></div>
          <label class="check"><input type="checkbox" id="promo" checked><span>Quero receber promoções e novidades da BarbermaN pelo WhatsApp.</span></label>
          <label class="check"><input type="checkbox" id="termos"><span>Li e aceito que a barbearia guarde meus dados para o cartão fidelidade <span style="white-space:nowrap">(<button type="button" class="link-inline" id="ver-priv">ver como usamos</button>).</span></span></label>
          <button class="btn btn-pri btn-bloco" type="submit" id="ativar" disabled>Ativar meu cartão</button>
        </form>
        <p style="text-align:center;margin:10px 0 0"><button class="link-btn" id="sair">Cancelar</button></p>
      </div>`;
    U.mascara(U.$('#whats'), 'tel');
    if (U.$('#cpf')) U.mascara(U.$('#cpf'), 'cpf');
    U.$('#sair').addEventListener('click', () => { D.sairCliente(); telaEntrada(); });
    U.$('#ver-priv').addEventListener('click', (e) => { e.preventDefault(); privacidade(); });
    // "Ativar meu cartão" só acende depois do aceite dos dados
    U.$('#termos').addEventListener('change', () => { U.$('#ativar').disabled = !U.$('#termos').checked; });
    U.$('#form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const erroEl = U.$('#erro'); erroEl.textContent = '';
      if (!U.$('#termos').checked) { erroEl.textContent = 'Para ativar o cartão, marque o aceite dos dados.'; return; }
      try {
        await D.completarPerfil({
          nome: U.$('#nome').value, cpf: U.$('#cpf') ? U.$('#cpf').value : '', whatsapp: U.$('#whats').value,
          nascimento: U.$('#nasc').value, aceitaPromo: U.$('#promo').checked
        });
        U.toast('Cartão ativado! Bem-vindo à BarbermaN.', 'ok');
        rota();
      } catch (err) {
        erroEl.textContent = err.message;
        // Entrou com Google, mas o CPF já tem cartão (ex.: esqueceu a senha) → pede transferência
        if (err.codigo === 'CPF_EXISTE' && pend.via === 'google' && !D.demo) {
          erroEl.innerHTML = 'Esse CPF já tem um cartão. Quer passar esse cartão para esta conta do Google? '
            + '<button type="button" class="link-btn" id="transferir" style="padding:0;min-height:0">Pedir para a barbearia</button>';
          U.$('#transferir').addEventListener('click', async () => {
            try {
              await D.pedirRecuperacao(U.$('#cpf').value, null, U.$('#whats').value);
              app.innerHTML = `${marca}<div class="caixa" style="text-align:center"><h1 style="font-size:22px">Pedido enviado ✅</h1>
                <p style="color:var(--texto-2)">Assim que a barbearia confirmar, seu cartão aparece aqui ao entrar com o Google.</p>
                <button class="btn btn-sec btn-bloco" id="voltar">Voltar</button></div>`;
              U.$('#voltar').addEventListener('click', () => { D.sairCliente(); telaEntrada(); });
            } catch (e2) { erroEl.textContent = e2.message; }
          });
        }
      }
    });
  }

  function privacidade() {
    U.modal(`<h2>Como usamos seus dados</h2>
      <p>Guardamos nome, CPF, WhatsApp e data de nascimento só para o seu cartão fidelidade e, se você permitir, para avisar de promoções da BarbermaN. Não vendemos nem passamos seus dados para ninguém.</p>
      <p>Você pode pedir para corrigir ou apagar seus dados a qualquer momento, falando com a barbearia.</p>
      <div class="modal-botoes"><button class="btn btn-pri" data-fechar>Entendi</button></div>`);
  }

  // ---------------- CARTÃO ----------------
  async function telaCartao(cli, atualizacao = false) {
    telaAtual = 'cartao';
    cli = await D.cliente(cli.uid);
    if (!cli) { D.sairCliente(); return telaEntrada(); }
    const visitas = await D.visitas(cli.uid);
    const animarDe = atualizacao && ultimoCarimbos !== null && cli.carimbos > ultimoCarimbos ? ultimoCarimbos : null;
    if (atualizacao && ultimoCarimbos !== null) {
      if (cli.carimbos > ultimoCarimbos) U.toast(cli.carimbos >= cfg.meta ? `Cartão completo! ${cfg.recompensa} liberado 🎁` : 'Carimbo recebido! ✂️', 'ok');
      else if (cli.carimbos === 0 && ultimoCarimbos >= cfg.meta) U.toast('Brinde resgatado. Novo cartão começando!', 'ok');
    }
    ultimoCarimbos = cli.carimbos;
    const completo = cli.carimbos >= cfg.meta;
    const whats = C.whatsapp ? U.linkWhats(C.whatsapp, `Olá! Sou ${cli.nome}, cliente do cartão fidelidade.`) : '';

    app.innerHTML = `
      <div class="topo-cli">
        <div class="ola">Olá,<b>${U.esc(U.primeiroNome(cli.nome))} 👋</b></div>
        <a href="../" class="marca peq" style="text-decoration:none;color:inherit"><div class="mascote" style="width:52px">${U.svgLogo()}</div></a>
      </div>
      ${U.htmlCartao(cli, cfg, animarDe)}
      ${completo ? `<div class="premio"><strong>🎁 ${U.esc(cfg.recompensa)} liberado!</strong>
        <span style="color:var(--texto-2);font-size:14px">Mostre seu código ao barbeiro na próxima visita.</span></div>` : ''}
      <button class="btn btn-claro btn-bloco btn-grande" id="mostrar-qr" style="margin-top:16px">${U.svgCamera()} Mostrar meu código ao barbeiro</button>

      <section class="bloco"><h2>Como funciona</h2>
        <p style="margin:0;color:var(--texto-2)">${U.esc(cfg.regras)}</p></section>

      <section class="bloco"><h2>Meu cartão</h2>
        <div class="linha-info"><span>Cortes no total</span><span>${cli.totalCortes}</span></div>
        <div class="linha-info"><span>Brindes já ganhos</span><span>${cli.resgates}</span></div>
        <div class="linha-info"><span>Cliente desde</span><span>${U.fmtData(cli.criadoEm)}</span></div>
      </section>

      <section class="bloco"><h2>Últimas visitas</h2>${U.htmlHistorico(visitas.slice(0, 8))}</section>

      <div style="display:grid;gap:10px;margin-top:24px">
        <a class="btn btn-sec btn-bloco" href="${C.linkAvaliacao}" target="_blank" rel="noopener"><span style="color:#F5C04A;display:flex">${U.svgEstrela()}</span> Avaliar a BarbermaN no Google</a>
        ${whats ? `<a class="btn btn-whats btn-bloco" href="${whats}" target="_blank" rel="noopener">${U.svgWhats()} Chamar no WhatsApp</a>` : ''}
        <button class="btn btn-sec btn-bloco" id="editar">Editar meus dados</button>
        <button class="link-btn" id="sair">Sair</button>
      </div>`;

    U.$('#mostrar-qr').addEventListener('click', () => mostrarQr(cli));
    U.$('#sair').addEventListener('click', () => { D.sairCliente(); ultimoCarimbos = null; telaEntrada(); });
    U.$('#editar').addEventListener('click', () => editar(cli));
  }

  function mostrarQr(cli) {
    let svg = '';
    try { const q = qrcode(0, 'M'); q.addData('BARBERMAN:' + cli.uid); q.make(); svg = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }); }
    catch (e) { svg = '<p style="color:#000">Não foi possível gerar o QR. Diga o código abaixo ao barbeiro.</p>'; }
    U.modal(`<h2 style="text-align:center">Mostre ao barbeiro</h2>
      <div class="qr-caixa">${svg}</div>
      <div class="codigo">${U.esc(cli.uid.match(/.{1,4}/g).join(' '))}</div>
      <p style="text-align:center;margin-top:0;font-size:14px">Ele lê o código e o carimbo aparece aqui na hora.</p>
      <div class="modal-botoes"><button class="btn btn-pri" data-fechar>Fechar</button></div>`);
  }

  function editar(cli) {
    U.modal(`<h2>Meus dados</h2>
      <form id="f-edit" novalidate>
        <div class="msg-erro" id="erro-ed"></div>
        <div class="campo"><label for="ed-nome">Nome</label><input id="ed-nome" value="${U.esc(cli.nome)}"></div>
        <div class="campo"><label for="ed-whats">WhatsApp</label><input id="ed-whats" inputmode="tel" value="${U.esc(U.fmtTel(cli.whatsapp))}"></div>
        <div class="campo"><label for="ed-nasc">Nascimento</label><input id="ed-nasc" type="date" value="${U.esc(cli.nascimento)}"></div>
        <div class="campo"><label>CPF</label><input value="${U.fmtCpf(cli.cpf)}" disabled></div>
        <label class="check"><input type="checkbox" id="ed-promo" ${cli.aceitaPromo ? 'checked' : ''}> Quero receber promoções pelo WhatsApp.</label>
        <div class="modal-botoes"><button type="button" class="btn btn-sec" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">Salvar</button></div>
      </form>`, (m, fechar) => {
      U.mascara(U.$('#ed-whats', m), 'tel');
      U.$('#f-edit', m).addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await D.atualizarPerfil(cli.uid, { nome: U.$('#ed-nome', m).value, whatsapp: U.$('#ed-whats', m).value, nascimento: U.$('#ed-nasc', m).value, aceitaPromo: U.$('#ed-promo', m).checked });
          fechar(); U.toast('Dados atualizados.', 'ok'); telaCartao(cli);
        } catch (err) { U.$('#erro-ed', m).textContent = err.message; }
      });
    });
  }

  iniciar();
})();
