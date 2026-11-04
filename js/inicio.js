// Página inicial: links, serviços e horário. Contatos vêm das Configurações do painel (com os padrões do config.js).
(function () {
  const C = BM_CONFIG;
  const svgAgenda = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>';

  U.$('#logo').innerHTML = U.svgLogo();
  U.$('#ic-bigode').innerHTML = U.svgBigode('#fff');
  U.$('#ic-estrela').innerHTML = U.svgEstrela();
  U.$('#ic-whats').innerHTML = U.svgWhats();
  U.$('#ic-agenda').innerHTML = svgAgenda;
  U.$('#bairro').textContent = C.bairro;
  U.$('#link-mapa').href = C.linkMapa;
  U.$('#link-mapa').textContent = C.endereco;
  U.$('#pagamento').textContent = 'Formas de pagamento: ' + C.pagamento;

  const fmt = (v) => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 });
  U.$('#servicos').innerHTML = C.servicos.map(([nome, preco, min]) =>
    `<li><span>${U.esc(nome)}<small>${min} min</small></span><b>${fmt(preco)}</b></li>`).join('');

  function pintar() {
    U.$('#link-agendar').href = C.linkAgendamento;
    U.$('#link-avaliar').href = C.linkAvaliacao;
    U.$('#horario').textContent = C.horario;
    const w = U.$('#link-whats');
    w.href = C.whatsapp ? U.linkWhats(C.whatsapp, 'Olá! Vim pelo site da BarbermaN.') : '#';
    if (C.instagram) {
      U.$('#linha-insta').hidden = false;
      const a = U.$('#link-insta'); a.href = 'https://instagram.com/' + C.instagram; a.textContent = '@' + C.instagram;
    }
  }
  pintar();
  // valores editados pelo dono no painel
  BM_DADOS.config().then(pintar).catch(() => {});
})();
