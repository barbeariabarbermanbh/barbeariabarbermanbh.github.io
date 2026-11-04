// Componentes visuais compartilhados (cliente e barbeiro).
(function () {
  // Cartão de carimbos estilo "cartão físico". animarDe = quantidade antes (anima os novos).
  U.htmlCartao = (cli, cfg, animarDe = null) => {
    const meta = cfg.meta;
    const n = Math.min(cli.carimbos, meta);
    const completo = n >= meta;
    let slots = '';
    for (let i = 1; i <= meta; i++) {
      const ultimo = i === meta;
      const feito = i <= n;
      const novo = animarDe !== null && feito && i > animarDe ? ' novo' : '';
      if (ultimo) {
        slots += `<div class="carimbo brinde${completo ? ' liberado' : ''}${novo}" title="${U.esc(cfg.recompensa)}">${U.svgPresente()}</div>`;
      } else if (feito) {
        slots += `<div class="carimbo feito${novo}" style="${novo ? `animation-delay:${(i - animarDe - 1) * 0.12}s` : ''}">${U.svgBigode('#fff')}</div>`;
      } else {
        slots += `<div class="carimbo"><span class="num">${i}</span></div>`;
      }
    }
    const falta = meta - n;
    return `<div class="cartao-fid">
      <div class="cab">
        <div><small>Cartão fidelidade</small><div class="nome-cartao">BarbermaN</div>
          ${completo ? '<span class="selo-completo">COMPLETO</span>' : ''}</div>
        <div class="contador"><small>Carimbos</small><b>${n}/${meta}</b></div>
      </div>
      <div class="grade-carimbos" role="img" aria-label="${n} de ${meta} carimbos">${slots}</div>
      <p class="falta">${completo
        ? `<b>${U.esc(cfg.recompensa)} liberado!</b>`
        : `Falta${falta > 1 ? 'm' : ''} <b>${falta} corte${falta > 1 ? 's' : ''}</b> para o seu <b>${U.esc(cfg.recompensa.toLowerCase())}</b>`}</p>
    </div>`;
  };

  U.htmlMini = (cli, meta) => {
    let s = '';
    for (let i = 1; i <= meta; i++) s += `<i class="${i <= cli.carimbos ? 'f' : ''}"></i>`;
    return `<span class="mini${cli.carimbos >= meta ? ' completo' : ''}" aria-label="${cli.carimbos} de ${meta}">${s}</span>`;
  };

  U.htmlHistorico = (visitas) => visitas.length
    ? `<ul class="historico">${visitas.map((v) => `<li><span>${U.fmtDataHora(v.data)} · ${U.esc(v.barbeiroNome)}</span>
        <span class="tag ${v.tipo === 'resgate' ? 'resgate' : ''}">${v.tipo === 'resgate' ? 'Brinde resgatado' : '+1 carimbo'}</span></li>`).join('')}</ul>`
    : '<p class="vazio">Nenhum corte registrado ainda.</p>';

  U.svgGoogle = () => `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

  U.svgLupa = () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`;
  U.svgCamera = () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>`;
})();
