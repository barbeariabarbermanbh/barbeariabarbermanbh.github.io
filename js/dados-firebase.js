// Camada de dados REAL (Firebase Auth + Firestore). Mesma interface de js/dados.js.
// A segurança de verdade está em firestore.rules: aqui só deixamos as mensagens amigáveis.
import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, setPersistence, browserLocalPersistence,
  EmailAuthProvider, reauthenticateWithCredential, updatePassword
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, collection, collectionGroup, query, where, orderBy, limit,
  onSnapshot, writeBatch, runTransaction, serverTimestamp, increment, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const CFG = BM_CONFIG.firebaseConfig;
const app = initializeApp(CFG);
const auth = getAuth(app);
const db = getFirestore(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});

const DOM_CLI = '@cliente.barbermanbh.app';
const DOM_EQ = '@equipe.barbermanbh.app';
const HORA = 3600000;

const erro = (codigo, msg) => Object.assign(new Error(msg || codigo), { codigo });
const ms = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : (typeof v === 'number' ? v : null));
const ler = (snap) => snap.exists() ? snap.data({ serverTimestamps: 'estimate' }) : null;

const cliDe = (id, d) => d && ({
  uid: id, nome: d.nome || '', cpf: d.cpf || '', whatsapp: d.whatsapp || '', nascimento: d.nascimento || '',
  email: d.email || '', aceitaPromo: !!d.aceitaPromo, carimbos: d.carimbos || 0, totalCortes: d.totalCortes || 0,
  resgates: d.resgates || 0, ultimaVisita: ms(d.ultimaVisita), criadoEm: ms(d.criadoEm)
});
const visitaDe = (id, d, uid) => ({ id, uid, data: ms(d.data), tipo: d.tipo, barbeiroId: d.barbeiroId, barbeiroNome: d.barbeiroNome || '' });

function traduzAuth(e) {
  const c = (e && e.code) || '';
  if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(c)) return erro('LOGIN', 'Dados de acesso incorretos.');
  if (/too-many-requests/.test(c)) return erro('BLOQUEIO', 'Muitas tentativas. Espere alguns minutos e tente de novo.');
  if (/network-request-failed/.test(c)) return erro('REDE', 'Sem conexão com a internet.');
  if (/weak-password/.test(c)) return erro('SENHA_CURTA', 'A senha precisa ter pelo menos 6 caracteres.');
  if (/popup-closed|cancelled-popup/.test(c)) return erro('CANCELADO', 'Login cancelado.');
  if (/unauthorized-domain/.test(c)) return erro('DOMINIO', 'Este endereço ainda não foi autorizado no login. Avise a barbearia.');
  if (/permission-denied/.test(c)) return erro('PERMISSAO', 'Sem permissão para fazer isso.');
  return erro(c || 'ERRO', 'Algo deu errado. Tente de novo.');
}

// ---------- estado da sessão ----------
let usuario = null;      // usuário do Firebase Auth
let perfilCli = null;    // clientes/{uid}
let perfilEq = null;     // equipe/{uid}
let configCache = null;
let clientesCache = null; // lista para a equipe (tempo real)
const ouvintes = new Set();
const avisar = () => ouvintes.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
let pararCli = null, pararLista = null;

let seq = 0;
async function carregarPerfil(u) {
  const meu = ++seq;
  usuario = u; perfilCli = null; perfilEq = null; clientesCache = null;
  if (pararCli) { pararCli(); pararCli = null; }
  if (pararLista) { pararLista(); pararLista = null; }
  if (!u) return;
  const [e, c] = await Promise.all([
    getDoc(doc(db, 'equipe', u.uid)).catch(() => null),
    getDoc(doc(db, 'clientes', u.uid)).catch(() => null)
  ]);
  if (meu !== seq) return; // outra carga mais nova assumiu
  perfilEq = e && e.exists() ? { id: u.uid, ...e.data() } : null;
  perfilCli = c && c.exists() ? cliDe(u.uid, c.data()) : null;
  if (perfilCli) {
    let primeira = true;
    pararCli = onSnapshot(doc(db, 'clientes', u.uid), (s) => {
      perfilCli = cliDe(u.uid, ler(s));
      if (primeira) { primeira = false; return; }
      avisar();
    });
  }
}

let resolverPronto;
const prontoP = new Promise((r) => { resolverPronto = r; });
let primeiraVez = true;
getRedirectResult(auth).catch(() => {});
onAuthStateChanged(auth, async (u) => {
  // o login feito pelas funções abaixo já carrega o perfil; evita carregar duas vezes
  const mesmo = u && usuario && u.uid === usuario.uid;
  if (!mesmo || primeiraVez) await carregarPerfil(u);
  if (primeiraVez) { primeiraVez = false; resolverPronto(); }
});

function pendenteAtual() {
  if (!usuario || perfilCli) return null;
  const email = usuario.email || '';
  if (email.endsWith(DOM_CLI)) return { pendente: true, via: 'cpf', cpf: email.slice(0, 11) };
  if (email.endsWith(DOM_EQ)) return null;
  return { pendente: true, via: 'google', email, nome: usuario.displayName || '' };
}

function provedorGoogle() {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  return p;
}

const exigirEquipe =() => { if (!perfilEq || !perfilEq.ativo) throw erro('SEM_SESSAO', 'Faça login novamente.'); return perfilEq; };
const exigirDono = () => { const e = exigirEquipe(); if (e.papel !== 'dono') throw erro('PERMISSAO', 'Só o dono pode fazer isso.'); return e; };

async function garantirLista() {
  if (clientesCache) return clientesCache;
  exigirEquipe();
  await new Promise((ok, falha) => {
    let primeira = true;
    pararLista = onSnapshot(collection(db, 'clientes'), (s) => {
      clientesCache = s.docs.map((d) => cliDe(d.id, d.data({ serverTimestamps: 'estimate' })));
      if (primeira) { primeira = false; ok(); } else avisar();
    }, (e) => { if (primeira) falha(traduzAuth(e)); });
  });
  return clientesCache;
}

const D = {
  demo: false,
  pronto: () => prontoP,
  observar(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn); },

  async config() {
    if (!configCache) {
      const s = await getDoc(doc(db, 'config', 'geral')).catch(() => null);
      const d = (s && s.exists()) ? s.data() : {};
      const padrao = {}; U.CAMPOS_CONTATO.forEach((k) => { padrao[k] = BM_CONFIG[k] || ''; });
      configCache = {
        meta: 10, recompensa: 'Corte grátis', intervaloHoras: 12,
        regras: 'A cada corte você ganha 1 carimbo. Completou 10, o próximo corte é por nossa conta! Mostre seu cartão ao barbeiro.',
        ...padrao, ...Object.fromEntries(Object.entries(d).filter(([, v]) => v !== '' && v !== null))
      };
    }
    return U.aplicarConfig({ ...configCache });
  },

  // ---------------- CLIENTE ----------------
  clienteLogado() {
    if (!usuario || perfilEq) return null;
    return perfilCli ? { ...perfilCli } : pendenteAtual();
  },

  async criarContaCpf(cpf, senha) {
    cpf = U.soDigitos(cpf);
    if (!U.cpfValido(cpf)) throw erro('CPF_INVALIDO', 'CPF inválido. Confira os números.');
    if (String(senha).length < 6) throw erro('SENHA_CURTA', 'A senha precisa ter pelo menos 6 caracteres.');
    const ja = await getDoc(doc(db, 'cpfs', cpf));
    if (ja.exists()) throw erro('CPF_EXISTE', 'Esse CPF já tem um cartão.');
    try {
      const r = await createUserWithEmailAndPassword(auth, cpf + DOM_CLI, senha);
      await carregarPerfil(r.user);
    } catch (e) {
      if (/email-already-in-use/.test(e.code)) throw erro('CPF_EXISTE', 'Esse CPF já tem um cadastro. Entre com sua senha.');
      throw traduzAuth(e);
    }
    return true;
  },

  async entrarCpf(cpf, senha) {
    cpf = U.soDigitos(cpf);
    const s = await getDoc(doc(db, 'cpfs', cpf));
    const login = s.exists() ? s.data().login : cpf + DOM_CLI;
    if (login === 'google') throw erro('USA_GOOGLE', 'Esse cartão foi criado com o Google. Toque em "Entrar com Google".');
    try {
      const r = await signInWithEmailAndPassword(auth, login, senha);
      await carregarPerfil(r.user);
    } catch (e) { const t = traduzAuth(e); if (t.codigo === 'LOGIN') t.message = 'CPF ou senha incorretos.'; throw t; }
    if (perfilEq) { await signOut(auth); throw erro('LOGIN', 'Esse acesso é da equipe. Use a Área do barbeiro.'); }
    return D.clienteLogado();
  },

  async entrarGoogle() {
    const p = provedorGoogle();
    const instalado = window.matchMedia && matchMedia('(display-mode: standalone)').matches;
    try {
      if (instalado) { await signInWithRedirect(auth, p); return null; }
      const r = await signInWithPopup(auth, p);
      await carregarPerfil(r.user);
    } catch (e) {
      if (/popup-blocked|operation-not-supported/.test(e.code)) { await signInWithRedirect(auth, p); return null; }
      throw traduzAuth(e);
    }
    return D.clienteLogado();
  },

  async completarPerfil(p) {
    const pend = pendenteAtual();
    if (!pend) throw erro('SEM_SESSAO', 'Entre novamente.');
    const cpf = U.soDigitos(pend.cpf || p.cpf);
    if (!U.cpfValido(cpf)) throw erro('CPF_INVALIDO', 'CPF inválido. Confira os números.');
    if (String(p.nome).trim().split(/\s+/).length < 2) throw erro('NOME', 'Digite nome e sobrenome.');
    if (U.soDigitos(p.whatsapp).length < 10) throw erro('WHATS', 'Confira o número do WhatsApp com DDD.');
    const uid = usuario.uid;
    const login = pend.via === 'google' ? 'google' : usuario.email;
    try {
      await runTransaction(db, async (t) => {
        const c = await t.get(doc(db, 'cpfs', cpf));
        if (c.exists()) throw erro('CPF_EXISTE', 'Esse CPF já tem um cartão.');
        t.set(doc(db, 'cpfs', cpf), { uid, login });
        t.set(doc(db, 'clientes', uid), {
          nome: p.nome.trim(), cpf, whatsapp: U.soDigitos(p.whatsapp), nascimento: p.nascimento || '',
          email: pend.email || '', aceitaPromo: !!p.aceitaPromo, carimbos: 0, totalCortes: 0, resgates: 0,
          ultimaVisita: null, criadoEm: serverTimestamp()
        });
      });
    } catch (e) { if (e.codigo) throw e; throw traduzAuth(e); }
    await carregarPerfil(usuario);
    return D.clienteLogado();
  },

  async atualizarPerfil(uid, p) {
    const dados = {};
    if (p.nome) dados.nome = p.nome.trim();
    if (p.whatsapp) dados.whatsapp = U.soDigitos(p.whatsapp);
    if (p.nascimento !== undefined) dados.nascimento = p.nascimento;
    if (p.aceitaPromo !== undefined) dados.aceitaPromo = !!p.aceitaPromo;
    try { await updateDoc(doc(db, 'clientes', uid), dados); } catch (e) { throw traduzAuth(e); }
    return D.cliente(uid);
  },

  // Esqueceu a senha: cria um acesso novo e um pedido; o dono aprova e o cartão é transferido.
  // Com senha → acesso novo por CPF. Sem senha → usa a conta atual (ex.: entrou com Google).
  async pedirRecuperacao(cpf, novaSenha, whatsapp) {
    cpf = U.soDigitos(cpf);
    if (!U.cpfValido(cpf)) throw erro('CPF_INVALIDO', 'CPF inválido. Confira os números.');
    let login;
    if (novaSenha !== null) {
      if (String(novaSenha).length < 6) throw erro('SENHA_CURTA', 'A senha precisa ter pelo menos 6 caracteres.');
      login = `${cpf}.r${Date.now().toString(36)}${DOM_CLI}`;
      try { await createUserWithEmailAndPassword(auth, login, novaSenha); } catch (e) { throw traduzAuth(e); }
    } else {
      if (!usuario) throw erro('SEM_SESSAO', 'Entre novamente.');
      login = 'google';
    }
    try {
      await setDoc(doc(collection(db, 'recuperacoes')), {
        cpf, uidNovo: auth.currentUser.uid, login, whatsapp: U.soDigitos(whatsapp),
        nome: auth.currentUser.displayName || '', status: 'pendente', criadoEm: serverTimestamp()
      });
    } finally { if (novaSenha !== null) await signOut(auth); }
    return true;
  },

  sairCliente() { perfilCli = null; signOut(auth); },

  async visitas(uid) {
    const s = await getDocs(query(collection(db, 'clientes', uid, 'visitas'), orderBy('data', 'desc'), limit(40)));
    return s.docs.map((d) => visitaDe(d.id, d.data({ serverTimestamps: 'estimate' }), uid));
  },
  async cliente(uid) {
    if (perfilCli && perfilCli.uid === uid) return { ...perfilCli };
    const s = await getDoc(doc(db, 'clientes', uid));
    return cliDe(uid, ler(s));
  },

  // ---------------- EQUIPE ----------------
  equipeLogada() {
    return perfilEq && perfilEq.ativo
      ? { id: perfilEq.id, nome: perfilEq.nome, papel: perfilEq.papel, google: String(perfilEq.login || '').includes('@') } : null;
  },

  async entrarEquipe(login, senha) {
    login = String(login).trim().toLowerCase();
    const email = login.includes('@') ? login : login + DOM_EQ;
    try {
      const r = await signInWithEmailAndPassword(auth, email, senha);
      await carregarPerfil(r.user);
    } catch (e) { const t = traduzAuth(e); if (t.codigo === 'LOGIN') t.message = 'Usuário ou senha incorretos.'; throw t; }
    if (!perfilEq) { await signOut(auth); throw erro('LOGIN', 'Esse acesso não é da equipe.'); }
    if (!perfilEq.ativo) { await signOut(auth); throw erro('INATIVO', 'Este acesso foi desativado pelo dono.'); }
    return D.equipeLogada();
  },
  // Administração entrando com a conta Google da barbearia (só popup: precisa voltar para esta função)
  async entrarEquipeGoogle() {
    let r;
    try { r = await signInWithPopup(auth, provedorGoogle()); } catch (e) { throw traduzAuth(e); }
    await carregarPerfil(r.user);
    if (!perfilEq) { await signOut(auth); throw erro('LOGIN', 'Essa conta Google não tem acesso à administração.'); }
    if (!perfilEq.ativo) { await signOut(auth); throw erro('INATIVO', 'Este acesso foi desativado.'); }
    return D.equipeLogada();
  },
  sairEquipe() { perfilEq = null; signOut(auth); },

  async trocarSenha(atual, nova) {
    if (!usuario || !usuario.email) throw erro('SEM_SESSAO', 'Entre novamente.');
    if (String(nova).length < 6) throw erro('SENHA_CURTA', 'A senha nova precisa ter pelo menos 6 caracteres.');
    try {
      await reauthenticateWithCredential(usuario, EmailAuthProvider.credential(usuario.email, atual));
      await updatePassword(usuario, nova);
    } catch (e) { const t = traduzAuth(e); if (t.codigo === 'LOGIN') t.message = 'A senha atual não confere.'; throw t; }
    return true;
  },

  async buscar(termo) {
    const lista = await garantirLista();
    const t = String(termo || '').trim().toLowerCase();
    const dig = U.soDigitos(t);
    const sem = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const r = !t ? lista : lista.filter((c) =>
      sem(c.nome).includes(sem(t)) || c.uid.toLowerCase() === t.replace(/^barberman:/, '').toLowerCase() ||
      (dig.length >= 3 && (c.cpf.includes(dig) || c.whatsapp.includes(dig))));
    return r.map((c) => ({ ...c })).sort((a, b) => (b.ultimaVisita || 0) - (a.ultimaVisita || 0));
  },

  async carimbar(uid) {
    const e = exigirEquipe();
    const cfg = await D.config();
    const c = await D.cliente(uid);
    if (!c) throw erro('NAO_ACHOU', 'Cliente não encontrado.');
    if (c.carimbos >= cfg.meta) throw erro('CHEIO', 'O cartão já está completo. Faça o resgate do brinde.');
    if (c.ultimaVisita && Date.now() - c.ultimaVisita < cfg.intervaloHoras * HORA) {
      throw erro('INTERVALO', `Este cliente já foi carimbado ${U.diasDesde(c.ultimaVisita) === 0 ? 'hoje às ' + U.fmtHora(c.ultimaVisita) : 'há pouco'}.`);
    }
    const b = writeBatch(db);
    b.update(doc(db, 'clientes', uid), { carimbos: increment(1), totalCortes: increment(1), ultimaVisita: serverTimestamp() });
    b.set(doc(collection(db, 'clientes', uid, 'visitas')), { data: serverTimestamp(), tipo: 'carimbo', barbeiroId: e.id, barbeiroNome: e.nome });
    try { await b.commit(); } catch (x) { const t = traduzAuth(x); if (t.codigo === 'PERMISSAO') t.message = 'O sistema recusou o carimbo (intervalo mínimo ou cartão cheio).'; throw t; }
    return D.cliente(uid);
  },

  async resgatar(uid) {
    const e = exigirEquipe();
    const cfg = await D.config();
    const c = await D.cliente(uid);
    if (!c) throw erro('NAO_ACHOU', 'Cliente não encontrado.');
    if (c.carimbos < cfg.meta) throw erro('INCOMPLETO', 'O cartão ainda não está completo.');
    const b = writeBatch(db);
    b.update(doc(db, 'clientes', uid), { carimbos: 0, resgates: increment(1), totalCortes: increment(1), ultimaVisita: serverTimestamp() });
    b.set(doc(collection(db, 'clientes', uid, 'visitas')), { data: serverTimestamp(), tipo: 'resgate', barbeiroId: e.id, barbeiroNome: e.nome });
    try { await b.commit(); } catch (x) { throw traduzAuth(x); }
    return D.cliente(uid);
  },

  // ---------------- DONO ----------------
  async todasVisitas() {
    exigirDono();
    const ini = new Date(); ini.setDate(1); ini.setHours(0, 0, 0, 0);
    const s = await getDocs(query(collectionGroup(db, 'visitas'), where('data', '>=', Timestamp.fromDate(ini))));
    return s.docs.map((d) => visitaDe(d.id, d.data({ serverTimestamps: 'estimate' }), d.ref.parent.parent.id));
  },

  async equipe() {
    exigirDono();
    const s = await getDocs(collection(db, 'equipe'));
    return s.docs.map((d) => ({ id: d.id, nome: d.data().nome, papel: d.data().papel, login: d.data().login, ativo: d.data().ativo !== false }));
  },

  // Cria o login do barbeiro numa segunda instância do Firebase, para o dono não ser deslogado.
  async criarBarbeiro(nome, login, senha) {
    exigirDono();
    nome = String(nome).trim(); login = String(login).trim().toLowerCase();
    if (!nome || !/^[a-z0-9._-]{2,30}$/.test(login)) throw erro('DADOS', 'Preencha o nome e um usuário simples (letras minúsculas, sem espaço).');
    if (String(senha).length < 6) throw erro('SENHA_CURTA', 'A senha precisa ter pelo menos 6 caracteres.');
    const app2 = initializeApp(CFG, 'novo-barbeiro-' + Date.now());
    try {
      const auth2 = getAuth(app2);
      let uid;
      try { uid = (await createUserWithEmailAndPassword(auth2, login + DOM_EQ, senha)).user.uid; }
      catch (e) { if (/email-already-in-use/.test(e.code)) throw erro('EXISTE', 'Esse usuário já existe.'); throw traduzAuth(e); }
      await setDoc(doc(db, 'equipe', uid), { nome, papel: 'barbeiro', login, ativo: true });
      await signOut(auth2);
    } finally { deleteApp(app2).catch(() => {}); }
    return true;
  },

  async ativarBarbeiro(id, ativo) {
    const eu = exigirDono();
    if (id === eu.id) throw erro('PERMISSAO', 'Você não pode desativar a si mesmo.');
    await updateDoc(doc(db, 'equipe', id), { ativo: !!ativo });
    return true;
  },

  async salvarConfig(cfg) {
    exigirDono();
    const n = U.normalizarConfig(cfg);
    try { await setDoc(doc(db, 'config', 'geral'), n, { merge: true }); } catch (e) { throw traduzAuth(e); }
    configCache = null;
    return true;
  },

  async recuperacoes() {
    exigirDono();
    const s = await getDocs(query(collection(db, 'recuperacoes'), where('status', '==', 'pendente')));
    return Promise.all(s.docs.map(async (d) => {
      const r = d.data();
      const c = await getDoc(doc(db, 'cpfs', r.cpf));
      const uid = c.exists() ? c.data().uid : null;
      const cli = uid ? await getDoc(doc(db, 'clientes', uid)) : null;
      return { id: d.id, cpf: r.cpf, uid, uidNovo: r.uidNovo, login: r.login, whatsapp: r.whatsapp || '', criadoEm: ms(r.criadoEm),
        nome: cli && cli.exists() ? cli.data().nome : '(CPF sem cartão)' };
    }));
  },

  // Aprovar: copia o cartão (e o histórico) para a conta nova e aponta o CPF para ela.
  async decidirRecuperacao(id, aprovar) {
    exigirDono();
    const rs = await getDoc(doc(db, 'recuperacoes', id));
    if (!rs.exists()) throw erro('NAO_ACHOU');
    const r = rs.data();
    const b = writeBatch(db);
    if (aprovar) {
      const cs = await getDoc(doc(db, 'cpfs', r.cpf));
      if (!cs.exists()) throw erro('NAO_ACHOU', 'Esse CPF não tem cartão.');
      const velho = cs.data().uid;
      if (velho !== r.uidNovo) {
        const cli = await getDoc(doc(db, 'clientes', velho));
        if (cli.exists()) b.set(doc(db, 'clientes', r.uidNovo), cli.data());
        const vs = await getDocs(collection(db, 'clientes', velho, 'visitas'));
        vs.docs.forEach((v) => { b.set(doc(db, 'clientes', r.uidNovo, 'visitas', v.id), v.data()); b.delete(v.ref); });
        b.delete(doc(db, 'clientes', velho));
      }
      b.set(doc(db, 'cpfs', r.cpf), { uid: r.uidNovo, login: r.login });
    }
    b.update(doc(db, 'recuperacoes', id), { status: aprovar ? 'aprovada' : 'recusada' });
    try { await b.commit(); } catch (e) { throw traduzAuth(e); }
    return true;
  },

  // ---------------- INSTALAÇÃO (página /configurar/) ----------------
  async instalado() { const s = await getDoc(doc(db, 'config', 'instalacao')); return s.exists(); },
  // Com senha: acesso por usuário. Sem login/senha (google=true): usa a conta Google escolhida no popup.
  async instalar(nome, login, senha, google = false) {
    nome = String(nome || '').trim(); login = String(login || '').trim().toLowerCase();
    if (!nome) throw erro('DADOS', 'Preencha o nome.');
    if (!google) {
      if (!/^[a-z0-9._-]{2,30}$/.test(login)) throw erro('DADOS', 'Escolha um usuário simples (letras minúsculas, sem espaço).');
      if (String(senha).length < 6) throw erro('SENHA_CURTA', 'A senha precisa ter pelo menos 6 caracteres.');
    }
    if (await D.instalado()) throw erro('JA', 'O sistema já foi configurado.');
    let u;
    if (google) {
      try { u = (await signInWithPopup(auth, provedorGoogle())).user; } catch (e) { throw traduzAuth(e); }
      login = u.email;
    } else {
      try { u = (await createUserWithEmailAndPassword(auth, login + DOM_EQ, senha)).user; }
      catch (e) { if (/email-already-in-use/.test(e.code)) throw erro('EXISTE', 'Esse usuário já existe.'); throw traduzAuth(e); }
    }
    const padrao = await D.config();
    const b = writeBatch(db);
    b.set(doc(db, 'config', 'instalacao'), { uid: u.uid, em: serverTimestamp() });
    b.set(doc(db, 'equipe', u.uid), { nome, papel: 'dono', login, ativo: true });
    b.set(doc(db, 'config', 'geral'), U.normalizarConfig(padrao));
    try { await b.commit(); } catch (e) { throw traduzAuth(e); }
    configCache = null;
    await carregarPerfil(u);
    return true;
  }
};

window.BM_DADOS = D;
// Só em testes locais: acesso direto para conferir que as regras recusam o que devem recusar
if (location.hostname === 'localhost') window.__bm = { db, auth, doc, getDoc, setDoc, updateDoc, writeBatch, collection, increment, serverTimestamp };
