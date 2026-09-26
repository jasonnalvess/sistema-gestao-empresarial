export const NOVAS_PERMISSOES_RH = [
  {
    chave: 'funcionarios.situacao.gerenciar',
    nome: 'Gerenciar situação funcional',
  },
  {
    chave: 'funcionarios.dados_pessoais.visualizar',
    nome: 'Visualizar dados pessoais de funcionários',
  },
  {
    chave: 'funcionarios.dados_pessoais.editar',
    nome: 'Editar dados pessoais de funcionários',
  },
  {
    chave: 'funcionarios.estrutura.gerenciar',
    nome: 'Gerenciar estrutura de RH',
  },
  {
    chave: 'funcionarios.acesso.gerenciar',
    nome: 'Gerenciar acesso associado ao funcionário',
  },
].map((item) => ({ ...item, descricao: item.nome, modulo: 'funcionarios' }));

export const PERMISSOES_EXCLUIDAS_RH = [
  'agenda.excluir',
  'funcionarios.acesso.gerenciar',
];
