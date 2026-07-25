import { api } from "./api";

export type ResumoFinanceiro = {
  periodo: {
    vencimentoInicio: string | null;
    vencimentoFim: string | null;
  };

  pagar: {
    valorOriginal: number;
    valorPago: number;
    valorAberto: number;
    valorVencido: number;
    descontos: number;
    juros: number;
    multas: number;
    quantidade: number;
    quantidadeEmAberto: number;
    quantidadeVencidas: number;
  };

  receber: {
    valorOriginal: number;
    valorRecebido: number;
    valorAberto: number;
    valorVencido: number;
    descontos: number;
    juros: number;
    multas: number;
    quantidade: number;
    quantidadeEmAberto: number;
    quantidadeVencidas: number;
  };

  consolidado: {
    saldoProjetado: number;
    resultadoRealizado: number;
    saldoVencido: number;
    totalVencido: number;
    contasEmAberto: number;
    contasVencidas: number;
  };
};

export async function buscarResumoFinanceiro(params?: {
  vencimentoInicio?: string;
  vencimentoFim?: string;
}) {
  const { data } = await api.get<{
    success: boolean;
    data: ResumoFinanceiro;
  }>("/financeiro/resumo", {
    params,
  });

  return data.data;
}
