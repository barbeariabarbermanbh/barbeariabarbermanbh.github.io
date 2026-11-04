// Utilidades comuns às telas.
(function () {
  const U = {};

  U.$ = (sel, el = document) => el.querySelector(sel);
  U.$$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  U.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  U.soDigitos = (s) => String(s || '').replace(/\D/g, '');

  U.cpfValido = (cpf) => {
    cpf = U.soDigitos(cpf);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    for (let t = 9; t < 11; t++) {
      let soma = 0;
      for (let i = 0; i < t; i++) soma += Number(cpf[i]) * (t + 1 - i);
      const dv = ((soma * 10) % 11) % 10;
      if (dv !== Number(cpf[t])) return false;
    }
    return true;
  };

  U.fmtCpf = (cpf) => {
    const d = U.soDigitos(cpf).slice(0, 11);
    return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
  };

  U.fmtTel = (tel) => {
    let d = U.soDigitos(tel);
    if (d.startsWith('55') && d.length > 11) d = d.slice(2);
    d = d.slice(0, 11);
    if (d.length <= 2) return d ? '(' + d : '';
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
  };

  // Máscaras de digitação
  U.mascara = (input, tipo) => {
    input.addEventListener('input', () => {
      input.value = tipo === 'cpf' ? U.fmtCpf(input.value) : U.fmtTel(input.value);
    });
  };

  U.fmtData = (ms) => ms ? new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
  U.fmtDataHora = (ms) => ms ? new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
  U.fmtHora = (ms) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  U.diasDesde = (ms) => ms ? Math.floor((Date.now() - ms) / 86400000) : null;

  U.relativo = (ms) => {
    const d = U.diasDesde(ms);
    if (d === null) return 'nunca';
    if (d === 0) return 'hoje';
    if (d === 1) return 'ontem';
    if (d < 30) return `há ${d} dias`;
    const m = Math.floor(d / 30);
    return m === 1 ? 'há 1 mês' : `há ${m} meses`;
  };

  U.primeiroNome = (n) => String(n || '').trim().split(/\s+/)[0] || '';

  U.linkWhats = (numero, texto) => {
    let d = U.soDigitos(numero);
    if (!d) return '';
    if (d.length <= 11) d = '55' + d;
    return `https://wa.me/${d}${texto ? '?text=' + encodeURIComponent(texto) : ''}`;
  };

  // Ícones (SVG inline)
  U.svgBigode = (cor = 'currentColor') =>
    `<svg viewBox="0 0 200 80" aria-hidden="true"><path fill="${cor}" d="M100 30C88 12 62 10 48 24 38 34 26 40 10 32 6 30 4 34 7 38 20 58 44 66 64 60 80 55 92 46 100 40 108 46 120 55 136 60 156 66 180 58 193 38 196 34 194 30 190 32 174 40 162 34 152 24 138 10 112 12 100 30Z"/></svg>`;

  U.svgPresente = () =>
    `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>`;

  U.svgWhats = () =>
    `<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>`;

  U.svgEstrela = () =>
    `<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>`;

  // Mascote desenhado a partir da placa da fachada (provisório até recebermos a logo original)
  U.svgLogo = () => `
  <svg viewBox="0 0 200 190" role="img" aria-label="Logo Barbearia BarbermaN">
    <circle cx="100" cy="26" r="20" fill="#F2F2EE"/>
    <rect x="30" y="40" width="140" height="132" rx="48" fill="#B5653A"/>
    <rect x="49" y="58" width="102" height="96" rx="32" fill="#2A2A2C"/>
    <path d="M60 82 L94 96 L94 105 L60 92Z" fill="#F2F2EE"/>
    <path d="M140 82 L106 96 L106 105 L140 92Z" fill="#F2F2EE"/>
    <rect x="76" y="101" width="9" height="20" rx="2" fill="#F2F2EE"/>
    <rect x="115" y="101" width="9" height="20" rx="2" fill="#F2F2EE"/>
    <path fill="#F2F2EE" d="M100 136C88 118 62 116 48 130 38 140 26 146 10 138 6 136 4 140 7 144 20 164 44 172 64 166 80 161 92 152 100 146 108 152 120 161 136 166 156 172 180 164 193 144 196 140 194 136 190 138 174 146 162 140 152 130 138 116 112 118 100 136Z"/>
  </svg>`;

  // Avisos rápidos (no lugar de alert)
  U.toast = (msg, tipo = '') => {
    let box = U.$('#toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast ' + tipo;
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.classList.add('sai'), 3200);
    setTimeout(() => t.remove(), 3700);
  };

  // Janela de confirmação (no lugar de confirm). Retorna Promise<boolean>.
  U.confirmar = ({ titulo, texto = '', ok = 'Confirmar', cancelar = 'Cancelar', perigo = false }) => new Promise((res) => {
    const d = document.createElement('div');
    d.className = 'modal-fundo';
    d.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt">
      <h2 id="mt">${U.esc(titulo)}</h2>${texto ? `<p>${texto}</p>` : ''}
      <div class="modal-botoes"><button class="btn btn-sec" data-r="0">${U.esc(cancelar)}</button>
      <button class="btn ${perigo ? 'btn-perigo' : 'btn-pri'}" data-r="1">${U.esc(ok)}</button></div></div>`;
    document.body.appendChild(d);
    const fim = (v) => { d.remove(); res(v); };
    d.addEventListener('click', (e) => {
      if (e.target === d) fim(false);
      const b = e.target.closest('[data-r]');
      if (b) fim(b.dataset.r === '1');
    });
    U.$('[data-r="1"]', d).focus();
  });

  U.modal = (html, aoAbrir) => {
    const d = document.createElement('div');
    d.className = 'modal-fundo';
    d.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(d);
    const fechar = () => d.remove();
    d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-fechar]')) fechar(); });
    if (aoAbrir) aoAbrir(d, fechar);
    return fechar;
  };

  // ?limpo = esconde avisos e atalhos de demonstração (usado nos prints da apresentação)
  U.limpo = /[?&]limpo\b/.test(location.search);

  // Campos que o dono edita no painel e que sobrescrevem os padrões do config.js
  U.CAMPOS_CONTATO = ['whatsapp', 'instagram', 'horario', 'linkAvaliacao', 'linkAgendamento'];
  // Valida o formulário de Configurações do painel (usado pelas duas camadas de dados)
  U.normalizarConfig = (c) => {
    const n = {
      meta: Math.max(3, Math.min(20, parseInt(c.meta, 10) || 10)),
      recompensa: String(c.recompensa || '').trim() || 'Corte grátis',
      regras: String(c.regras || '').trim(),
      intervaloHoras: Math.max(0, Math.min(168, parseInt(c.intervaloHoras, 10) || 0))
    };
    U.CAMPOS_CONTATO.forEach((k) => { n[k] = String(c[k] || '').trim(); });
    n.whatsapp = U.soDigitos(n.whatsapp);
    n.instagram = n.instagram.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/.*$/, '');
    return n;
  };

  U.aplicarConfig = (cfg) => {
    U.CAMPOS_CONTATO.forEach((k) => { if (cfg && cfg[k]) BM_CONFIG[k] = cfg[k]; });
    return cfg;
  };

  U.faixaDemo = (extra = '') => {
    if (!window.BM_DADOS || !BM_DADOS.demo || /[?&]limpo\b/.test(location.search)) return;
    const f = document.createElement('div');
    f.className = 'faixa-demo';
    f.innerHTML = `<strong>Modo demonstração</strong> · dados fictícios, salvos só neste aparelho${extra}`;
    document.body.prepend(f);
  };

  window.U = U;
})();
