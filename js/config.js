// Dados da barbearia. WhatsApp, Instagram, horário e links também podem ser
// alterados pelo dono no painel (Configurações); estes são os valores padrão.
// firebaseConfig vazio (null) = MODO DEMONSTRAÇÃO (dados fictícios só neste navegador).
window.BM_CONFIG = {
  nome: 'Barbearia BarbermaN',
  bairro: 'Caiçaras · Belo Horizonte',
  endereco: 'R. Belmiro Braga, 1315 - Caiçaras, Belo Horizonte - MG, 30720-552',
  whatsapp: '5531975068362',
  instagram: 'Barberman_barbearia',
  horario: 'Segunda a sexta · 09h às 20h\nSábado · 09h às 18h\nDomingo · fechado',
  linkAvaliacao: 'https://search.google.com/local/writereview?placeid=ChIJLcQmhSmRpgARbwfCgB1OdYI',
  linkMapa: 'https://www.google.com/maps/search/?api=1&query=BarbermaN+Barbearia&query_place_id=ChIJLcQmhSmRpgARbwfCgB1OdYI',
  linkAgendamento: 'https://sites.appbarber.com.br/barberman-t3yk',
  pagamento: 'Dinheiro · Pix · Cartão de crédito e débito',
  // Tabela de serviços (fonte: página de agendamento da barbearia, 04/11/2026)
  servicos: [
    ['Corte', 45, 40], ['Corte máquina', 30, 15], ['Barba', 35, 20], ['Corte + barba', 80, 60],
    ['Corte máquina + barba', 65, 40], ['Barboterapia', 45, 20], ['Pezinho', 15, 10], ['Sobrancelha', 15, 10],
    ['Penteado', 10, 10], ['Hidratação', 30, 20], ['Pigmentação / tintura', 50, 30], ['Camuflagem', 90, 60],
    ['Luzes', 100, 60], ['Selagem', 100, 60], ['Platinado', 150, 60],
    ['Depilação orelha ou nariz', 15, 10], ['Depilação orelha + nariz', 25, 20]
  ],
  // Firebase da barbearia (conta barbeariabarbermanbh@gmail.com). Chave pública por natureza: a segurança está no firestore.rules.
  firebaseConfig: {
    apiKey: 'AIzaSyCo0QitybFlVL-OEQ_UvgB7kVBKdLL4h08',
    authDomain: 'barberman-barbearia.firebaseapp.com',
    projectId: 'barberman-barbearia',
    storageBucket: 'barberman-barbearia.firebasestorage.app',
    messagingSenderId: '827647356014',
    appId: '1:827647356014:web:a362c62367732e4d528a7f'
  }
};
