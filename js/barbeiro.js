// Tela do barbeiro: ler QR / buscar cliente → confirmar corte (+1 carimbo) ou resgatar brinde.
(function () {
  const D = BM_DADOS;
  const app = U.$('#app');
  let cfg, eq, leitor = null, aberto = null, termo = '';

  U.faixaDemo(' · <a href="../cartao/" target="_blank" style="color:#FFE7B0">abrir o cartão do cliente em outra aba</a>');

  async function iniciar() {
    await D.pronto();
    cfg = await D.config();
    eq = D.equipeLogada();
    if (!eq) return U.telaLoginEquipe(app, (e) => { eq = e; principal(); });
    principal();
  }

  function principal() {
    app.innerHTML = `${U.barraTopo(eq, eq.papel === 'dono' ? '<a class="btn btn-sec" href="../painel/">Painel do dono</a>' : '')}
      <main class="pagina">
        <button class="btn btn-pri btn-bloco btn-grande" id="ler">${U.svgCamera()} Ler QR do cliente</button>
        <div id="area-leitor" hidden style="margin-top:12px">
          <div id="leitor" class="leitor"></div>
          <button class="btn btn-sec btn-bloco" id="parar" style="margin-top:8px">Fechar câmera</button>
        </div>
        <div class="divisor">ou procure o cliente</div>
        <div class="busca">${U.svgLupa()}<label for="q" class="vis-oculto">Buscar cliente</label>
          <input id="q" type="search" placeholder="Nome, CPF, WhatsApp ou código" autocomplete="off" value="${U.esc(termo)}"></div>
        <ul class="lista-cli" id="lista"></ul>
        <div id="ficha" class="ficha"></div>
      </main>`;
    U.$('#sair-eq').addEventListener('click', () => { pararLeitor(); D.sairEquipe(); eq = null; iniciar(); });
    U.$('#ler').addEventListener('click', abrirLeitor);
    U.$('#parar').addEventListener('click', pararLeitor);
    const q = U.$('#q');
    let t;
    q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { termo = q.value; aberto = null; listar(); }, 200); });
    if (aberto) abrirFicha(aberto); else listar();
  }

  async function listar() {
    const lista = U.$('#lista'); U.$('#ficha').innerHTML = '';
    const r = await D.buscar(termo);
    const mostra = termo ? r : r.slice(0, 6);
    lista.innerHTML = (termo ? '' : '<li style="color:var(--texto-2);font-size:13px;padding:4px 2px">Atendidos recentemente</li>') +
      (mostra.length ? mostra.map((c) => `<li><button class="item-cli" data-uid="${c.uid}">
        <div class="dados"><b>${U.esc(c.nome)}</b><small>${U.fmtTel(c.whatsapp)} · ${U.relativo(c.ultimaVisita)}</small></div>
        ${c.carimbos >= cfg.meta ? '<span class="pilula verde">🎁 Brinde</span>' : `<span class="pilula">${c.carimbos}/${cfg.meta}</span>`}
      </button></li>`).join('') : '<li class="vazio">Nenhum cliente encontrado. Peça para ele criar o cartão pelo QR do balcão.</li>');
    U.$$('[data-uid]', lista).forEach((b) => b.addEventListener('click', () => abrirFicha(b.dataset.uid)));
  }

  async function abrirFicha(uid, animarDe = null) {
    aberto = uid;
    const c = await D.cliente(uid);
    if (!c) { U.toast('Cliente não encontrado.', 'erro'); aberto = null; return listar(); }
    const visitas = await D.visitas(uid);
    U.$('#lista').innerHTML = '';
    const completo = c.carimbos >= cfg.meta;
    U.$('#ficha').innerHTML = `
      <button class="link-btn" id="voltar">← Voltar à lista</button>
      <div class="caixa" style="margin-top:6px">
        <h2 style="font-size:22px;margin-bottom:2px">${U.esc(c.nome)}</h2>
        <div style="color:var(--texto-2);font-size:14px">${U.fmtTel(c.whatsapp)} · CPF ${U.fmtCpf(c.cpf).replace(/^\d{3}\.\d{3}/, '***.***')} · código ${c.uid}</div>
        ${U.htmlCartao(c, cfg, animarDe)}
        <div style="margin-top:16px">
          ${completo
            ? `<button class="btn btn-bloco btn-grande" style="background:var(--verde);color:#062611" id="resgatar">${U.svgPresente()} Resgatar ${U.esc(cfg.recompensa.toLowerCase())}</button>`
            : `<button class="btn btn-pri btn-bloco btn-grande" id="carimbar">${U.svgBigode('#fff')} Confirmar corte (+1)</button>`}
        </div>
      </div>
      <section class="bloco"><h2>Histórico</h2>${U.htmlHistorico(visitas.slice(0, 10))}</section>`;
    U.$('#voltar').addEventListener('click', () => { aberto = null; listar(); });
    const bc = U.$('#carimbar'); if (bc) bc.addEventListener('click', () => carimbar(c));
    const br = U.$('#resgatar'); if (br) br.addEventListener('click', () => resgatar(c));
    U.$('#ficha').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function carimbar(c, forcar = false) {
    const ok = forcar || await U.confirmar({ titulo: 'Confirmar corte?', texto: `Dar +1 carimbo para <b style="color:var(--texto)">${U.esc(c.nome)}</b> (${c.carimbos} → ${c.carimbos + 1} de ${cfg.meta}).`, ok: 'Sim, carimbar' });
    if (!ok) return;
    try {
      const novo = await D.carimbar(c.uid, forcar);
      U.toast(novo.carimbos >= cfg.meta ? `Cartão completo! Próximo corte é grátis 🎁` : `Carimbo dado! ${novo.carimbos}/${cfg.meta}`, 'ok');
      abrirFicha(c.uid, c.carimbos);
    } catch (err) {
      if (err.codigo === 'INTERVALO') {
        const demo = D.demo && !/[?&]limpo\b/.test(location.search);
        const de = await U.confirmar({
          titulo: 'Já carimbado',
          texto: `${U.esc(err.message)} O sistema evita carimbo duplicado (intervalo de ${cfg.intervaloHoras}h).${demo ? '<br><br><i>Na demonstração você pode carimbar mesmo assim para testar.</i>' : ''}`,
          ok: demo ? 'Carimbar mesmo assim (demo)' : 'Entendi', cancelar: demo ? 'Cancelar' : 'Fechar'
        });
        if (de && demo) carimbar(c, true);
      } else U.toast(err.message, 'erro');
    }
  }

  async function resgatar(c) {
    const ok = await U.confirmar({ titulo: `Resgatar ${cfg.recompensa.toLowerCase()}?`, texto: `O corte de hoje de <b style="color:var(--texto)">${U.esc(c.nome)}</b> sai de graça e o cartão recomeça do zero.`, ok: 'Confirmar resgate' });
    if (!ok) return;
    try { await D.resgatar(c.uid); U.toast('Brinde resgatado! Cartão zerado.', 'ok'); abrirFicha(c.uid); }
    catch (err) { U.toast(err.message, 'erro'); }
  }

  // ---------- Leitor de QR (câmera) ----------
  async function abrirLeitor() {
    if (typeof Html5Qrcode === 'undefined') return U.toast('Leitor indisponível. Use a busca.', 'erro');
    U.$('#area-leitor').hidden = false; U.$('#ler').hidden = true;
    leitor = new Html5Qrcode('leitor');
    try {
      await leitor.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 230, height: 230 } }, (txt) => {
        const m = /^BARBERMAN:([A-Z0-9]{4,})$/.exec(txt.trim());
        if (!m) { U.toast('Esse QR não é de um cartão BarbermaN.', 'erro'); return; }
        if (navigator.vibrate) navigator.vibrate(80);
        pararLeitor(); abrirFicha(m[1]);
      });
    } catch (e) {
      pararLeitor();
      U.toast('Não consegui abrir a câmera. Permita o acesso ou use a busca pelo código.', 'erro');
    }
  }
  function pararLeitor() {
    if (leitor) { leitor.stop().catch(() => {}).finally(() => { try { leitor.clear(); } catch (e) {} leitor = null; }); }
    const a = U.$('#area-leitor'); if (a) a.hidden = true;
    const b = U.$('#ler'); if (b) b.hidden = false;
  }

  // Atualiza se outro aparelho/aba mexer nos dados
  D.observar(async () => {
    cfg = await D.config();
    if (eq && !aberto && U.$('#lista')) listar(); // cliente novo cadastrado agora aparece na lista
  });

  iniciar();
})();
