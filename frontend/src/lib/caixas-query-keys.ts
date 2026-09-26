import type {
  FiltrosCaixas,
  FiltrosMovimentacoesCaixa,
  FiltrosResumoCaixas,
} from "@/services/caixas.service";

export const caixasQueryKeys = {
  raiz: (empresaId: string) => ["caixas", empresaId] as const,
  listas: (empresaId: string) =>
    [...caixasQueryKeys.raiz(empresaId), "lista"] as const,
  lista: (empresaId: string, filtros: FiltrosCaixas = {}) =>
    [...caixasQueryKeys.listas(empresaId), filtros] as const,
  detalhe: (empresaId: string, id: string) =>
    [...caixasQueryKeys.raiz(empresaId), "detalhe", id] as const,
  resumo: (empresaId: string, filtros: FiltrosResumoCaixas = {}) =>
    [...caixasQueryKeys.raiz(empresaId), "resumo", filtros] as const,
  movimentacoes: (empresaId: string) =>
    [...caixasQueryKeys.raiz(empresaId), "movimentacoes"] as const,
  movimentacoesLista: (
    empresaId: string,
    filtros: FiltrosMovimentacoesCaixa = {},
  ) => [...caixasQueryKeys.movimentacoes(empresaId), filtros] as const,
  aberturaAtual: (empresaId: string, caixaId: string) =>
    [...caixasQueryKeys.detalhe(empresaId, caixaId), "abertura-atual"] as const,
  aberturas: (empresaId: string, caixaId: string) =>
    [...caixasQueryKeys.detalhe(empresaId, caixaId), "aberturas"] as const,
  selects: (empresaId: string) =>
    [...caixasQueryKeys.raiz(empresaId), "selects"] as const,
  abertosPagamento: (empresaId: string) =>
    [...caixasQueryKeys.selects(empresaId), "abertos-pagamento"] as const,
  abertosRecebimento: (empresaId: string) =>
    [...caixasQueryKeys.selects(empresaId), "abertos-recebimento"] as const,
};
