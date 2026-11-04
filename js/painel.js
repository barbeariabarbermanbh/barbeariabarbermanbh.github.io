// Painel do dono: visão geral, clientes (funil WhatsApp + CSV), recuperações, equipe, configurações.
(function () {
  const D = BM_DADOS;
  const app = U.$('#app');
  let cfg, eq, aba = 'geral', filtro = 'todos', termo = '';

  U.faixaDemo();

  const ABAS = [['geral', 'Visão geral'], ['clientes', 'Clientes'], ['recuperar', 'Recuperar acesso'], ['equipe', 'Equipe'], ['config', 'Configurações']];

  async function iniciar() {
    await D.pronto();
    cfg = await D.config();
    eq = D.equipeLogada();
    if (!eq) return U.telaLoginEquipe(app, (e) => { eq = e; iniciar(); }, 'Painel da administração');
    if (eq.papel !== 'dono') {
      app.innerHTML = `<main class="pagina"><div class="caixa"><h1 style="font-size:20px">Só a administração acessa o painel</h1>
        <p style="color:var(--texto-2)">Você entrou como barbeiro.</p><a class="btn btn-pri btn-bloco" href="../barbeiro/">Ir para a área do barbeiro</a></div></main>`;
      return;
    }
    estrutura();
  }

  async function estrutura() {
    const pend = (await D.recuperacoes()).length;
    app.innerHTML = `${U.barraTopo(eq, '<a class="btn btn-pri" href="../barbeiro/">Carimbar</a>')}
      <main class="pagina larga">
        <div class="abas-painel" role="tablist">${ABAS.map(([id, nome]) => `<button role="tab" aria-selected="${aba === id}" data-aba="${id}">${nome}${id === 'recuperar' && pend ? `<span class="badge">${pend}</span>` : ''}</button>`).join('')}</div>
        <div id="conteudo"></div>
      </main>`;
    U.$('#sair-eq').addEventListener('click', () => { D.sairEquipe(); iniciar(); });
    U.$$('[data-aba]').forEach((b) => b.addEventListener('click', () => { aba = b.dataset.aba; estrutura(); }));
    ({ geral, clientes, recuperar, equipe, config })[aba]();
  }
  const conteudo = () => U.$('#conteudo');

  // ---------------- VISÃO GERAL ----------------
  async function geral() {
    const [todos, visitas] = await Promise.all([D.buscar(''), D.todasVisitas()]);
    const ini = new Date(); ini.setDate(1); ini.setHours(0, 0, 0, 0);
    const doMes = visitas.filter((v) => v.data >= ini.getTime());
    const novos = todos.filter((c) => c.criadoEm >= ini.getTime()).length;
    const porBarbeiro = {};
    doMes.forEach((v) => { porBarbeiro[v.barbeiroNome] = (porBarbeiro[v.barbeiroNome] || 0) + 1; });
    const max = Math.max(1, ...Object.values(porBarbeiro));
    const s = segmentos(todos);
    const mesNome = new Date().toLocaleDateString('pt-BR', { month: 'long' });

    conteudo().innerHTML = `
      <div class="secao-titulo"><h2>Resumo de ${mesNome}</h2></div>
      <div class="kpis" style="margin-top:12px">
        <div class="kpi"><small>Cortes no mês</small><b>${doMes.length}</b></div>
        <div class="kpi"><small>Clientes no cartão</small><b>${todos.length}</b></div>
        <div class="kpi"><small>Novos no mês</small><b>${novos}</b></div>
        <div class="kpi"><small>Brindes no mês</small><b>${doMes.filter((v) => v.tipo === 'resgate').length}</b></div>
      </div>
      <div class="grade-2" style="margin-top:16px">
        <div class="caixa"><h3 style="font-size:16px">Cortes por barbeiro (mês)</h3>
          <div class="barras">${Object.keys(porBarbeiro).length ? Object.entries(porBarbeiro).sort((a, b) => b[1] - a[1]).map(([n, q]) =>
            `<div class="barra-l"><span>${U.esc(n)}</span><span class="trilho"><i style="width:${(q / max) * 100}%"></i></span><span>${q}</span></div>`).join('') : '<p class="vazio">Sem cortes neste mês ainda.</p>'}</div></div>
        <div class="caixa"><h3 style="font-size:16px">Oportunidades para chamar no WhatsApp</h3>
          ${[['aniversario', '🎂 Aniversariantes do mês'], ['sumidos', '⏳ Sumidos há mais de 30 dias'], ['perto', '🔥 Perto do brinde'], ['brinde', '🎁 Brinde liberado']].map(([id, nome]) =>
            `<button class="item-cli" style="margin-bottom:8px" data-ir="${id}"><div class="dados"><b>${nome}</b></div><span class="pilula cobre">${s[id].length}</span></button>`).join('')}
        </div>
      </div>`;
    U.$$('[data-ir]').forEach((b) => b.addEventListener('click', () => { filtro = b.dataset.ir; aba = 'clientes'; estrutura(); }));
  }

  function segmentos(todos) {
    const mes = new Date().getMonth() + 1;
    return {
      todos,
      aniversario: todos.filter((c) => c.nascimento && Number(c.nascimento.slice(5, 7)) === mes),
      sumidos: todos.filter((c) => (U.diasDesde(c.ultimaVisita) ?? 999) > 30),
      perto: todos.filter((c) => c.carimbos >= cfg.meta - 2 && c.carimbos < cfg.meta),
      brinde: todos.filter((c) => c.carimbos >= cfg.meta),
      promo: todos.filter((c) => c.aceitaPromo)
    };
  }

  const MENSAGENS = {
    aniversario: (c) => `Fala, ${U.primeiroNome(c.nome)}! Aqui é da BarbermaN 💈 Feliz aniversário! 🎉 Neste mês seu corte tem um presente nosso. Bora marcar?`,
    sumidos: (c) => `Fala, ${U.primeiroNome(c.nome)}! Sentimos sua falta aqui na BarbermaN 💈 Você já tem ${c.carimbos} carimbo(s) no cartão fidelidade. Bora dar um trato no visual essa semana?`,
    perto: (c) => `Fala, ${U.primeiroNome(c.nome)}! Falta${cfg.meta - c.carimbos > 1 ? 'm' : ''} só ${cfg.meta - c.carimbos} corte(s) para o seu ${cfg.recompensa.toLowerCase()} na BarbermaN 🎁 Bora marcar?`,
    brinde: (c) => `Fala, ${U.primeiroNome(c.nome)}! Seu ${cfg.recompensa.toLowerCase()} na BarbermaN já está liberado 🎁 É só aparecer!`,
    padrao: (c) => `Fala, ${U.primeiroNome(c.nome)}! Aqui é da BarbermaN 💈`
  };

  // ---------------- CLIENTES ----------------
  async function clientes() {
    const todos = await D.buscar('');
    const s = segmentos(todos);
    const chips = [['todos', 'Todos'], ['aniversario', '🎂 Aniversariantes'], ['sumidos', '⏳ Sumidos 30+ dias'], ['perto', '🔥 Perto do brinde'], ['brinde', '🎁 Brinde liberado'], ['promo', '✅ Aceitam promoções']];
    conteudo().innerHTML = `
      <div class="secao-titulo"><h2>Clientes</h2><button class="btn btn-sec" id="csv">⬇ Exportar planilha (CSV)</button></div>
      <div class="chips">${chips.map(([id, nome]) => `<button aria-pressed="${filtro === id}" data-f="${id}">${nome}<span class="n">${s[id].length}</span></button>`).join('')}</div>
      <div class="busca">${U.svgLupa()}<label for="q" class="vis-oculto">Buscar</label><input id="q" type="search" placeholder="Buscar por nome, CPF ou WhatsApp" value="${U.esc(termo)}"></div>
      <p style="color:var(--texto-2);font-size:13px;margin:10px 0 0">${filtro !== 'todos' && filtro !== 'promo' ? 'O botão do WhatsApp já abre com uma mensagem pronta para este grupo. Só aparece quem aceitou receber promoções.' : 'Toque em WhatsApp para abrir a conversa.'}</p>
      <div class="tabela-wrap"><table class="tabela" style="margin-top:8px">
        <thead><tr><th>Cliente</th><th>Cartão</th><th>Última visita</th><th>Aniversário</th><th>Cortes</th><th></th></tr></thead>
        <tbody id="corpo"></tbody></table></div>`;
    U.$$('[data-f]').forEach((b) => b.addEventListener('click', () => { filtro = b.dataset.f; clientes(); }));
    const q = U.$('#q'); let t;
    q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { termo = q.value; tabela(s); }, 200); });
    U.$('#csv').addEventListener('click', () => exportar(filtrados(s)));
    tabela(s);
  }

  function filtrados(s) {
    let l = s[filtro] || s.todos;
    if (!['todos', 'promo'].includes(filtro)) l = l.filter((c) => c.aceitaPromo);
    const t = termo.trim().toLowerCase(), d = U.soDigitos(t);
    if (t) l = l.filter((c) => c.nome.toLowerCase().includes(t) || (d.length >= 3 && (c.cpf.includes(d) || c.whatsapp.includes(d))));
    return l;
  }

  function tabela(s) {
    const l = filtrados(s);
    const msg = MENSAGENS[filtro] || MENSAGENS.padrao;
    U.$('#corpo').innerHTML = l.length ? l.map((c) => `<tr>
      <td><b>${U.esc(c.nome)}</b><br><small style="color:var(--texto-2)">${U.fmtTel(c.whatsapp)}${c.aceitaPromo ? '' : ' · não quer promoções'}</small></td>
      <td>${U.htmlMini(c, cfg.meta)} <small style="color:var(--texto-2)">${c.carimbos}/${cfg.meta}</small></td>
      <td class="esconde-cel">${U.relativo(c.ultimaVisita)}</td>
      <td class="esconde-cel">${c.nascimento ? c.nascimento.slice(8, 10) + '/' + c.nascimento.slice(5, 7) : '—'}</td>
      <td class="esconde-cel">${c.totalCortes}</td>
      <td class="acao"><a class="btn btn-whats" href="${U.linkWhats(c.whatsapp, msg(c))}" target="_blank" rel="noopener" aria-label="WhatsApp de ${U.esc(c.nome)}">${U.svgWhats()}<span class="esconde-cel">WhatsApp</span></a></td>
    </tr>`).join('') : '<tr><td colspan="6" class="vazio">Ninguém neste grupo.</td></tr>';
  }

  function exportar(lista) {
    const cab = ['Nome', 'CPF', 'WhatsApp', 'Nascimento', 'Aceita promoções', 'Carimbos', 'Cortes no total', 'Brindes', 'Última visita', 'Cliente desde'];
    const linhas = lista.map((c) => [c.nome, U.fmtCpf(c.cpf), U.fmtTel(c.whatsapp), c.nascimento ? c.nascimento.split('-').reverse().join('/') : '', c.aceitaPromo ? 'Sim' : 'Não', c.carimbos, c.totalCortes, c.resgates, U.fmtData(c.ultimaVisita), U.fmtData(c.criadoEm)]);
    const csv = '﻿' + [cab, ...linhas].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `clientes-barberman-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    U.toast(`${lista.length} cliente(s) exportado(s).`, 'ok');
  }

  // ---------------- RECUPERAR ACESSO ----------------
  async function recuperar() {
    const l = await D.recuperacoes();
    conteudo().innerHTML = `<div class="secao-titulo"><h2>Pedidos de recuperação de acesso</h2></div>
      <p style="color:var(--texto-2)">Quando um cliente esquece a senha, ele pede uma nova pelo site. Confira se é ele mesmo (pelo WhatsApp ou pessoalmente) antes de aprovar.</p>
      ${l.length ? l.map((r) => `<div class="caixa" style="margin-top:10px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;justify-content:space-between">
        <div><b>${U.esc(r.nome)}</b><br><small style="color:var(--texto-2)">CPF ${U.fmtCpf(r.cpf)} · WhatsApp informado ${U.fmtTel(r.whatsapp) || '—'} · ${U.fmtDataHora(r.criadoEm)}</small></div>
        <div style="display:flex;gap:8px">
          ${r.whatsapp ? `<a class="btn btn-whats" href="${U.linkWhats(r.whatsapp, 'Olá! Aqui é da BarbermaN, recebemos seu pedido para recuperar o cartão fidelidade.')}" target="_blank" rel="noopener">${U.svgWhats()}</a>` : ''}
          <button class="btn btn-sec" data-rec="${r.id}" data-ok="0">Recusar</button>
          <button class="btn btn-pri" data-rec="${r.id}" data-ok="1" ${r.uid ? '' : 'disabled title="Esse CPF não tem cartão"'}>Aprovar</button></div></div>`).join('')
      : '<p class="vazio">Nenhum pedido pendente. 👍</p>'}`;
    U.$$('[data-rec]').forEach((b) => b.addEventListener('click', async () => {
      b.disabled = true;
      try {
        await D.decidirRecuperacao(b.dataset.rec, b.dataset.ok === '1');
        U.toast(b.dataset.ok === '1' ? 'Acesso liberado. O cartão foi passado para o acesso novo.' : 'Pedido recusado.', 'ok');
        estrutura();
      } catch (err) { b.disabled = false; U.toast(err.message, 'erro'); }
    }));
  }

  // ---------------- EQUIPE ----------------
  async function equipe() {
    const l = await D.equipe();
    conteudo().innerHTML = `<div class="grade-2">
      <div><div class="secao-titulo"><h2>Equipe</h2></div>
        ${l.map((e) => `<div class="item-cli" style="margin-top:8px;cursor:default"><div class="dados"><b>${U.esc(e.nome)}</b><small>usuário: ${U.esc(e.login)} · ${e.papel === 'dono' ? 'Administração' : 'Barbeiro'}</small></div>
          ${e.id === eq.id ? '<span class="pilula">você</span>' : `<button class="btn ${e.ativo ? 'btn-sec' : 'btn-pri'}" data-at="${e.id}" data-v="${e.ativo ? 0 : 1}" style="min-height:40px">${e.ativo ? 'Desativar' : 'Reativar'}</button>`}</div>`).join('')}
      </div>
      <form class="caixa" id="f-novo" novalidate><h2 style="font-size:18px">Novo barbeiro</h2>
        <div class="msg-erro" id="erro"></div>
        <div class="campo"><label for="n-nome">Nome (aparece no histórico)</label><input id="n-nome"></div>
        <div class="campo"><label for="n-login">Usuário</label><input id="n-login" autocapitalize="none"></div>
        <div class="campo"><label for="n-senha">Senha inicial</label><input id="n-senha" type="text" autocomplete="off"><span class="dica">Mínimo de 6 caracteres. Passe para o barbeiro pessoalmente.</span></div>
        <button class="btn btn-pri btn-bloco">Criar acesso</button></form></div>`;
    U.$$('[data-at]').forEach((b) => b.addEventListener('click', async () => {
      try { await D.ativarBarbeiro(b.dataset.at, b.dataset.v === '1'); equipe(); } catch (e) { U.toast(e.message, 'erro'); }
    }));
    U.$('#f-novo').addEventListener('submit', async (e) => {
      e.preventDefault();
      try { await D.criarBarbeiro(U.$('#n-nome').value, U.$('#n-login').value, U.$('#n-senha').value); U.toast('Barbeiro criado.', 'ok'); equipe(); }
      catch (err) { U.$('#erro').textContent = err.message; }
    });
  }

  // ---------------- CONFIGURAÇÕES ----------------
  function config() {
    conteudo().innerHTML = `<form class="caixa" id="f-cfg" novalidate style="max-width:560px">
      <h2 style="font-size:18px">Regras do cartão</h2>
      <div class="campo"><label for="c-meta">Quantos carimbos para ganhar o brinde</label><input id="c-meta" type="number" min="3" max="20" value="${cfg.meta}">
        <span class="dica">O último espaço do cartão é o brinde.</span></div>
      <div class="campo"><label for="c-rec">Brinde</label><input id="c-rec" value="${U.esc(cfg.recompensa)}"></div>
      <div class="campo"><label for="c-reg">Texto "Como funciona"</label><textarea id="c-reg" rows="3">${U.esc(cfg.regras)}</textarea></div>
      <div class="campo"><label for="c-int">Intervalo mínimo entre carimbos do mesmo cliente (horas)</label><input id="c-int" type="number" min="0" max="168" value="${cfg.intervaloHoras}">
        <span class="dica">Evita carimbo duplicado por engano. 0 = sem limite.</span></div>
      <h2 style="font-size:18px;margin-top:22px">Contato e links do site</h2>
      <div class="campo"><label for="c-whats">WhatsApp da barbearia (com DDD)</label><input id="c-whats" inputmode="tel" value="${U.esc(U.fmtTel(cfg.whatsapp))}"></div>
      <div class="campo"><label for="c-insta">Instagram (sem o @)</label><input id="c-insta" autocapitalize="none" value="${U.esc(cfg.instagram)}"></div>
      <div class="campo"><label for="c-hor">Horário de funcionamento</label><textarea id="c-hor" rows="3">${U.esc(cfg.horario)}</textarea>
        <span class="dica">Uma linha por dia ou grupo de dias.</span></div>
      <div class="campo"><label for="c-agenda">Link de agendamento</label><input id="c-agenda" type="url" value="${U.esc(cfg.linkAgendamento)}"></div>
      <div class="campo"><label for="c-aval">Link de avaliação no Google</label><input id="c-aval" type="url" value="${U.esc(cfg.linkAvaliacao)}"></div>
      <div class="msg-erro" id="erro-cfg"></div>
      <button class="btn btn-pri btn-bloco">Salvar</button>
      ${D.demo && !U.limpo ? '<button type="button" class="btn btn-sec btn-bloco" id="reset" style="margin-top:10px">Restaurar dados de demonstração</button>' : ''}
    </form>`;
    U.$('#f-cfg').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await D.salvarConfig({
          meta: U.$('#c-meta').value, recompensa: U.$('#c-rec').value, regras: U.$('#c-reg').value, intervaloHoras: U.$('#c-int').value,
          whatsapp: U.$('#c-whats').value, instagram: U.$('#c-insta').value, horario: U.$('#c-hor').value,
          linkAgendamento: U.$('#c-agenda').value, linkAvaliacao: U.$('#c-aval').value
        });
        cfg = await D.config(); U.toast('Configurações salvas.', 'ok'); config();
      } catch (err) { U.$('#erro-cfg').textContent = err.message; }
    });
    const r = U.$('#reset');
    if (r) r.addEventListener('click', async () => {
      if (await U.confirmar({ titulo: 'Restaurar demonstração?', texto: 'Apaga os clientes de teste criados e volta aos dados de exemplo.', ok: 'Restaurar', perigo: true })) {
        D.restaurarDemo(); U.toast('Dados restaurados.', 'ok'); iniciar();
      }
    });
  }

  iniciar();
})();
