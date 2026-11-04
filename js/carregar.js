// Carrega a camada de dados certa e depois o script da tela.
// Uso: <script src="../js/carregar.js" data-tela="cartao.js"></script>
//  - BM_CONFIG.firebaseConfig preenchido → js/dados-firebase.js (Firebase de verdade)
//  - vazio → js/dados.js (modo demonstração, dados só no navegador)
(function () {
  const eu = document.currentScript;
  const base = new URL('.', eu.src).href; // pasta js/
  const tela = eu.dataset.tela;
  const classico = (arq) => new Promise((ok, falha) => {
    const s = document.createElement('script');
    s.src = base + arq; s.onload = ok; s.onerror = () => falha(new Error('Falha ao carregar ' + arq));
    document.head.appendChild(s);
  });
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register(new URL('../sw.js', base).href).catch(() => {});
  }
  (async () => {
    try {
      const forcarDemo = /[?&]demo\b/.test(location.search); // ex.: prints da apresentação
      if (window.BM_CONFIG && BM_CONFIG.firebaseConfig && !forcarDemo) await import(base + 'dados-firebase.js');
      else await classico('dados.js');
      if (tela) await classico(tela);
    } catch (e) {
      console.error(e);
      document.body.insertAdjacentHTML('beforeend', '<p style="padding:24px;text-align:center;color:#FFB4A8">Não foi possível carregar. Verifique a internet e recarregue a página.</p>');
    }
  })();
})();
