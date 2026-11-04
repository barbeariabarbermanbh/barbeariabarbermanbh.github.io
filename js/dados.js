// Camada de dados. As telas só falam com BM_DADOS.
// Agora: implementação DEMONSTRAÇÃO (localStorage). Na versão real, a mesma interface
// será implementada com Firebase Auth + Firestore (ver firestore.rules).
(function () {
  const CHAVE = 'bm_demo_v1';
  const S_CLIENTE = 'bm_sessao_cliente';
  const S_EQUIPE = 'bm_sessao_equipe';
  const DIA = 86400000;
  const HORA = 3600000;

  const erro = (codigo, msg) => Object.assign(new Error(msg || codigo), { codigo });

  const gerarId = () => {
    const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)];
    return s;
  };

  const gerarCpf = () => {
    const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
    for (let t = 9; t < 11; t++) {
      let soma = 0;
      for (let i = 0; i < t; i++) soma += n[i] * (t + 1 - i);
      n.push(((soma * 10) % 11) % 10);
    }
    return n.join('');
  };

  // ---------- dados fictícios ----------
  function semente() {
    const agora = Date.now();
    const equipe = [
      { id: 'E1', nome: 'Dono', papel: 'dono', login: 'dono', senha: '1234', ativo: true },
      { id: 'E2', nome: 'Lucas', papel: 'barbeiro', login: 'lucas', senha: '1234', ativo: true },
      { id: 'E3', nome: 'Rafa', papel: 'barbeiro', login: 'rafa', senha: '1234', ativo: true }
    ];
    const mes = new Date().getMonth();
    const pessoas = [
      ['Carlos Henrique Souza', 9, 3, 0], ['Matheus Oliveira', 4, 12, 0], ['João Pedro Lima', 10, 2, 0],
      ['Gabriel Santos', 2, 45, 0], ['Felipe Andrade', 7, 9, 1], ['Bruno Costa', 1, 70, 0],
      ['Thiago Ribeiro', 8, 6, 2], ['Rodrigo Alves', 5, 33, 0], ['Leonardo Martins', 3, 15, 0],
      ['André Ferreira', 6, 20, 1], ['Vinícius Rocha', 0, 95, 1], ['Diego Carvalho', 9, 1, 0]
    ];
    const clientes = [];
    const visitas = {};
    pessoas.forEach(([nome, carimbos, diasUltima, resgates], i) => {
      const uid = gerarId();
      const ultima = agora - diasUltima * DIA - (i * 37 % 9) * HORA;
      // aniversário: 3 clientes fazem aniversário neste mês
      const mesNasc = [0, 4, 9].includes(i) ? mes : (mes + i + 1) % 12;
      const nasc = `${1985 + (i * 3) % 18}-${String(mesNasc + 1).padStart(2, '0')}-${String(3 + (i * 5) % 25).padStart(2, '0')}`;
      const c = {
        uid, nome, cpf: gerarCpf(), whatsapp: `319${String(80000000 + i * 1234567).slice(0, 8)}`,
        nascimento: nasc, email: '', aceitaPromo: i % 4 !== 3, carimbos, resgates,
        totalCortes: carimbos + resgates * 11, ultimaVisita: ultima,
        criadoEm: ultima - (carimbos + resgates * 11 + 1) * 18 * DIA, senha: '1234', google: i % 3 === 0
      };
      clientes.push(c);
      const lista = [];
      for (let k = 0; k < carimbos; k++) {
        const b = equipe[1 + ((i + k) % 2)];
        lista.push({ id: gerarId(), data: ultima - k * 18 * DIA, tipo: 'carimbo', barbeiroId: b.id, barbeiroNome: b.nome });
      }
      visitas[uid] = lista;
    });
    return {
      config: {
        meta: 10,
        recompensa: 'Corte grátis',
        regras: 'A cada corte você ganha 1 carimbo. Completou 10, o próximo corte é por nossa conta! Mostre seu cartão ao barbeiro.',
        intervaloHoras: 12
      },
      equipe, clientes, visitas, recuperacoes: []
    };
  }

  let db;
  const ler = () => {
    try { db = JSON.parse(localStorage.getItem(CHAVE)); } catch (e) { db = null; }
    if (!db) { db = semente(); salvar(false); }
    return db;
  };
  const salvar = (avisar = true) => {
    try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch (e) { /* armazenamento bloqueado: segue em memória */ }
    if (avisar) ouvintes.forEach((f) => f());
  };
  const sess = (k, v) => {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) { return null; }
  };

  // "Tempo real": outras abas avisam pelo evento storage (no Firebase será onSnapshot)
  const ouvintes = new Set();
  window.addEventListener('storage', (e) => { if (e.key === CHAVE) { ler(); ouvintes.forEach((f) => f()); } });

  const espera = (v) => new Promise((r) => setTimeout(() => r(v), 180));
  const publico = (c) => { if (!c) return null; const { senha, ...resto } = c; return { ...resto }; };
  const acharCliente = (uid) => db.clientes.find((c) => c.uid === uid);

  ler();

  const D = {
    demo: true,
    async pronto() {},
    observar(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn); },
    async config() {
      ler();
      const padrao = {}; U.CAMPOS_CONTATO.forEach((k) => { padrao[k] = BM_CONFIG[k] || ''; });
      const c = { ...padrao, ...Object.fromEntries(Object.entries(db.config).filter(([, v]) => v !== '')) };
      return espera(U.aplicarConfig(c));
    },

    // ---------- CLIENTE ----------
    clienteLogado() { ler(); const uid = sess(S_CLIENTE); const c = uid && acharCliente(uid); return c ? publico(c) : (uid && uid.startsWith('G:') ? { pendente: true, ...JSON.parse(uid.slice(2)) } : null); },

    async criarContaCpf(cpf, senha) {
      ler(); cpf = U.soDigitos(cpf);
      if (!U.cpfValido(cpf)) throw erro('CPF_INVALIDO', 'CPF inválido. Confira os números.');
      if (String(senha).length < 6) throw erro('SENHA_CURTA', 'A senha precisa ter pelo menos 6 caracteres.');
      if (db.clientes.some((c) => c.cpf === cpf)) throw erro('CPF_EXISTE', 'Esse CPF já tem um cartão.');
      // conta criada, perfil ainda incompleto
      sess(S_CLIENTE, 'G:' + JSON.stringify({ cpf, senha, via: 'cpf' }));
      return espera(true);
    },

    async entrarCpf(cpf, senha) {
      ler(); cpf = U.soDigitos(cpf);
      const c = db.clientes.find((x) => x.cpf === cpf);
      if (!c || c.senha !== senha) throw erro('LOGIN', 'CPF ou senha incorretos.');
      sess(S_CLIENTE, c.uid);
      return espera(publico(c));
    },

    // Demo: simula a janela "Escolha uma conta" do Google
    async entrarGoogle(conta) {
      ler();
      const c = db.clientes.find((x) => x.email && x.email === conta.email);
      if (c) { sess(S_CLIENTE, c.uid); return espera(publico(c)); }
      sess(S_CLIENTE, 'G:' + JSON.stringify({ email: conta.email, nome: conta.nome, via: 'google' }));
      return espera(null);
    },

    async completarPerfil(p) {
      ler();
      const pend = D.clienteLogado();
      if (!pend || !pend.pendente) throw erro('SEM_SESSAO');
      const cpf = U.soDigitos(pend.cpf || p.cpf);
      if (!U.cpfValido(cpf)) throw erro('CPF_INVALIDO', 'CPF inválido. Confira os números.');
      if (db.clientes.some((c) => c.cpf === cpf)) throw erro('CPF_EXISTE', 'Esse CPF já tem um cartão.');
      if (String(p.nome).trim().split(/\s+/).length < 2) throw erro('NOME', 'Digite nome e sobrenome.');
      if (U.soDigitos(p.whatsapp).length < 10) throw erro('WHATS', 'Confira o número do WhatsApp com DDD.');
      const c = {
        uid: gerarId(), nome: p.nome.trim(), cpf, whatsapp: U.soDigitos(p.whatsapp), nascimento: p.nascimento || '',
        email: pend.email || '', aceitaPromo: !!p.aceitaPromo, carimbos: 0, totalCortes: 0, resgates: 0,
        ultimaVisita: null, criadoEm: Date.now(), senha: pend.senha || null, google: pend.via === 'google'
      };
      db.clientes.push(c); db.visitas[c.uid] = [];
      salvar(); sess(S_CLIENTE, c.uid);
      return espera(publico(c));
    },

    async atualizarPerfil(uid, p) {
      ler(); const c = acharCliente(uid); if (!c) throw erro('NAO_ACHOU');
      // o cliente só pode mudar estes campos (no Firebase, as regras garantem isso)
      if (p.nome) c.nome = p.nome.trim();
      if (p.whatsapp) c.whatsapp = U.soDigitos(p.whatsapp);
      if (p.nascimento !== undefined) c.nascimento = p.nascimento;
      if (p.aceitaPromo !== undefined) c.aceitaPromo = !!p.aceitaPromo;
      salvar(); return espera(publico(c));
    },

    async pedirRecuperacao(cpf, novaSenha, whatsapp) {
      ler(); cpf = U.soDigitos(cpf);
      if (!U.cpfValido(cpf)) throw erro('CPF_INVALIDO', 'CPF inválido. Confira os números.');
      if (String(novaSenha).length < 6) throw erro('SENHA_CURTA', 'A senha precisa ter pelo menos 6 caracteres.');
      const c = db.clientes.find((x) => x.cpf === cpf);
      db.recuperacoes = db.recuperacoes.filter((r) => !(r.cpf === cpf && r.status === 'pendente'));
      db.recuperacoes.push({ id: gerarId(), cpf, uid: c ? c.uid : null, nome: c ? c.nome : '(CPF sem cartão)', whatsapp: U.soDigitos(whatsapp), novaSenha, status: 'pendente', criadoEm: Date.now() });
      salvar(); return espera(true);
    },

    sairCliente() { sess(S_CLIENTE, null); },

    async visitas(uid) { ler(); return espera([...(db.visitas[uid] || [])].sort((a, b) => b.data - a.data)); },
    async cliente(uid) { ler(); return espera(publico(acharCliente(uid))); },

    // ---------- EQUIPE ----------
    equipeLogada() { ler(); const id = sess(S_EQUIPE); const e = db.equipe.find((x) => x.id === id && x.ativo); return e ? { id: e.id, nome: e.nome, papel: e.papel } : null; },

    async entrarEquipe(login, senha) {
      ler();
      const e = db.equipe.find((x) => x.login === String(login).trim().toLowerCase() && x.senha === senha);
      if (!e) throw erro('LOGIN', 'Usuário ou senha incorretos.');
      if (!e.ativo) throw erro('INATIVO', 'Este acesso foi desativado pelo dono.');
      sess(S_EQUIPE, e.id);
      return espera({ id: e.id, nome: e.nome, papel: e.papel });
    },
    sairEquipe() { sess(S_EQUIPE, null); },
    async trocarSenha(atual, nova) {
      ler(); const eu = D.equipeLogada(); if (!eu) throw erro('SEM_SESSAO', 'Entre novamente.');
      const e = db.equipe.find((x) => x.id === eu.id);
      if (e.senha !== atual) throw erro('LOGIN', 'A senha atual não confere.');
      if (String(nova).length < 6) throw erro('SENHA_CURTA', 'A senha nova precisa ter pelo menos 6 caracteres.');
      e.senha = nova; salvar(); return espera(true);
    },

    async buscar(termo) {
      ler();
      const t = String(termo || '').trim().toLowerCase();
      const dig = U.soDigitos(t);
      const sem = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      const lista = !t ? db.clientes : db.clientes.filter((c) =>
        sem(c.nome).includes(sem(t)) || c.uid.toLowerCase() === t.replace(/^barberman:/, '') ||
        (dig.length >= 3 && (c.cpf.includes(dig) || c.whatsapp.includes(dig))));
      return espera(lista.map(publico).sort((a, b) => (b.ultimaVisita || 0) - (a.ultimaVisita || 0)));
    },

    async carimbar(uid, ignorarIntervalo = false) {
      ler();
      const e = D.equipeLogada(); if (!e) throw erro('SEM_SESSAO', 'Faça login novamente.');
      const c = acharCliente(uid); if (!c) throw erro('NAO_ACHOU', 'Cliente não encontrado.');
      if (c.carimbos >= db.config.meta) throw erro('CHEIO', 'O cartão já está completo. Faça o resgate do brinde.');
      const limite = db.config.intervaloHoras * HORA;
      if (!ignorarIntervalo && c.ultimaVisita && Date.now() - c.ultimaVisita < limite) {
        throw erro('INTERVALO', `Este cliente já foi carimbado ${U.relativo(c.ultimaVisita) === 'hoje' ? 'hoje às ' + U.fmtHora(c.ultimaVisita) : 'há pouco'}.`);
      }
      c.carimbos += 1; c.totalCortes += 1; c.ultimaVisita = Date.now();
      (db.visitas[uid] = db.visitas[uid] || []).push({ id: gerarId(), data: Date.now(), tipo: 'carimbo', barbeiroId: e.id, barbeiroNome: e.nome });
      salvar(); return espera(publico(c));
    },

    async resgatar(uid) {
      ler();
      const e = D.equipeLogada(); if (!e) throw erro('SEM_SESSAO', 'Faça login novamente.');
      const c = acharCliente(uid); if (!c) throw erro('NAO_ACHOU');
      if (c.carimbos < db.config.meta) throw erro('INCOMPLETO', 'O cartão ainda não está completo.');
      c.carimbos = 0; c.resgates += 1; c.totalCortes += 1; c.ultimaVisita = Date.now();
      (db.visitas[uid] = db.visitas[uid] || []).push({ id: gerarId(), data: Date.now(), tipo: 'resgate', barbeiroId: e.id, barbeiroNome: e.nome });
      salvar(); return espera(publico(c));
    },

    // ---------- DONO ----------
    _dono() { const e = D.equipeLogada(); if (!e || e.papel !== 'dono') throw erro('PERMISSAO', 'Só o dono pode fazer isso.'); return e; },

    async todasVisitas() { ler(); D._dono(); const r = []; Object.entries(db.visitas).forEach(([uid, l]) => l.forEach((v) => r.push({ ...v, uid }))); return espera(r); },
    async equipe() { ler(); D._dono(); return espera(db.equipe.map(({ senha, ...e }) => e)); },
    async criarBarbeiro(nome, login, senha) {
      ler(); D._dono();
      login = String(login).trim().toLowerCase();
      if (!nome.trim() || !login) throw erro('DADOS', 'Preencha nome e usuário.');
      if (String(senha).length < 6) throw erro('SENHA_CURTA', 'A senha precisa ter pelo menos 6 caracteres.');
      if (db.equipe.some((x) => x.login === login)) throw erro('EXISTE', 'Esse usuário já existe.');
      db.equipe.push({ id: 'E' + gerarId(), nome: nome.trim(), papel: 'barbeiro', login, senha, ativo: true });
      salvar(); return espera(true);
    },
    async ativarBarbeiro(id, ativo) { ler(); const eu = D._dono(); if (id === eu.id) throw erro('PERMISSAO', 'Você não pode desativar a si mesmo.'); const e = db.equipe.find((x) => x.id === id); e.ativo = ativo; salvar(); return espera(true); },
    async salvarConfig(cfg) {
      ler(); D._dono();
      db.config = U.normalizarConfig(cfg);
      salvar(); return espera(true);
    },
    async recuperacoes() { ler(); D._dono(); return espera(db.recuperacoes.filter((r) => r.status === 'pendente')); },
    async decidirRecuperacao(id, aprovar) {
      ler(); D._dono();
      const r = db.recuperacoes.find((x) => x.id === id); if (!r) throw erro('NAO_ACHOU');
      r.status = aprovar ? 'aprovada' : 'recusada';
      if (aprovar && r.uid) { const c = acharCliente(r.uid); if (c) c.senha = r.novaSenha; }
      salvar(); return espera(true);
    },
    restaurarDemo() { db = semente(); salvar(); sess(S_CLIENTE, null); }
  };

  window.BM_DADOS = D;
})();
