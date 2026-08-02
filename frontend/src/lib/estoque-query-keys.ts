export const estoqueQueryKeys = {
  produtos: (empresaId: string) => ["produtos", empresaId] as const,
  produto: (empresaId: string, produtoId: string) =>
    ["produto", empresaId, produtoId] as const,
  produtosDetalhes: (empresaId: string) => ["produto", empresaId] as const,
  produtoHistorico: (empresaId: string, produtoId: string) =>
    ["produto-historico", empresaId, produtoId] as const,
  categorias: (empresaId: string) => ["categorias", empresaId] as const,
  marcas: (empresaId: string) => ["marcas-produtos", empresaId] as const,
  unidades: (empresaId: string) => ["unidades-medida", empresaId] as const,
  depositos: (empresaId: string) => ["depositos", empresaId] as const,
  estoque: (empresaId: string) => ["estoque", empresaId] as const,
  movimentacoes: (empresaId: string) => ["movimentacoes", empresaId] as const,
  categoriasSelect: (empresaId: string) =>
    ["categorias-produtos-select", empresaId] as const,
  marcasSelect: (empresaId: string) =>
    ["marcas-produtos-select", empresaId] as const,
  unidadesSelect: (empresaId: string) =>
    ["unidades-medida-select", empresaId] as const,
  produtosSelect: (empresaId: string, consumidor: string) =>
    ["produtos-select", empresaId, consumidor] as const,
  depositosSelect: (empresaId: string, consumidor: string) =>
    ["depositos-select", empresaId, consumidor] as const,
};
