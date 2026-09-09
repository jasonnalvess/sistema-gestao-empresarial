"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  CheckCircle2,
  ClipboardCheck,
  FileClock,
  MoreHorizontal,
  Pencil,
  ReceiptText,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import {
  PERMISSAO_VENDAS_APROVAR,
  PERMISSAO_VENDAS_CANCELAR,
  PERMISSAO_VENDAS_EDITAR,
  PERMISSAO_VENDAS_FATURAR,
  PERMISSAO_VENDAS_HISTORICO_ADICIONAR,
} from "@/lib/auth";
import { vendasQueryKeys } from "@/lib/vendas-query-keys";

import { EditarVendaModal } from "./EditarVendaModal";
import { FaturarVendaModal } from "./FaturarVendaModal";
import { CancelarVendaModal } from "./CancelarVendaModal";
import { HistoricoVendaModal } from "./HistoricoVendaModal";

import {
  aprovarVenda,
  enviarParaAprovacao,
  StatusVenda,
} from "@/services/vendas.service";

type VendaAcoesProps = {
  vendaId: string;
  status: StatusVenda;
};

export function VendaAcoes({ vendaId, status }: VendaAcoesProps) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();

  const [menuAberto, setMenuAberto] = useState(false);
  const [editarAberto, setEditarAberto] = useState(false);
  const [faturarAberto, setFaturarAberto] = useState(false);
  const [cancelarAberto, setCancelarAberto] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(false);

  const [processando, setProcessando] = useState(false);

  const podeEditar =
    temPermissao(PERMISSAO_VENDAS_EDITAR) && status === "RASCUNHO";
  const podeEnviarAprovacao =
    temPermissao(PERMISSAO_VENDAS_EDITAR) && status === "RASCUNHO";
  const podeAprovar =
    temPermissao(PERMISSAO_VENDAS_APROVAR) && status === "PENDENTE";
  const podeFaturar =
    temPermissao(PERMISSAO_VENDAS_FATURAR) && status === "APROVADA";

  const podeCancelar =
    temPermissao(PERMISSAO_VENDAS_CANCELAR) &&
    !["CANCELADA", "CONCLUIDA"].includes(status);

  const podeAdicionarHistorico = temPermissao(
    PERMISSAO_VENDAS_HISTORICO_ADICIONAR,
  );

  async function atualizarConsultas() {
    if (!empresaEfetivaId) return;
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: vendasQueryKeys.listas(empresaEfetivaId),
      }),

      queryClient.invalidateQueries({
        queryKey: vendasQueryKeys.detalhe(empresaEfetivaId, vendaId),
      }),

      queryClient.invalidateQueries({
        queryKey: vendasQueryKeys.dashboards(empresaEfetivaId),
      }),

      queryClient.invalidateQueries({
        queryKey: vendasQueryKeys.historico(empresaEfetivaId, vendaId),
      }),
    ]);
  }

  function obterMensagemErro(error: unknown, mensagemPadrao: string) {
    if (typeof error === "object" && error !== null && "response" in error) {
      const response = (
        error as {
          response?: {
            data?: {
              message?: string | string[];
            };
          };
        }
      ).response;

      const mensagem = response?.data?.message;

      if (Array.isArray(mensagem)) {
        return mensagem.join(", ");
      }

      if (mensagem) {
        return mensagem;
      }
    }

    return mensagemPadrao;
  }

  async function enviarAprovacao() {
    if (!podeEnviarAprovacao || !empresaEfetivaId || carregando) return;
    try {
      setProcessando(true);
      setMenuAberto(false);

      await enviarParaAprovacao(vendaId);

      toast.success("Venda enviada para aprovação com sucesso.");

      await atualizarConsultas();
    } catch (error) {
      toast.error(
        obterMensagemErro(error, "Erro ao enviar venda para aprovação."),
      );
    } finally {
      setProcessando(false);
    }
  }

  async function aprovar() {
    if (!podeAprovar || !empresaEfetivaId || carregando) return;
    try {
      setProcessando(true);
      setMenuAberto(false);

      await aprovarVenda(vendaId);

      toast.success("Venda aprovada com sucesso.");

      await atualizarConsultas();
    } catch (error) {
      toast.error(obterMensagemErro(error, "Erro ao aprovar venda."));
    } finally {
      setProcessando(false);
    }
  }

  function abrirEdicao() {
    if (!podeEditar || !empresaEfetivaId || carregando) return;
    setMenuAberto(false);
    setEditarAberto(true);
  }

  function abrirFaturamento() {
    if (!podeFaturar || !empresaEfetivaId || carregando) return;
    setMenuAberto(false);
    setFaturarAberto(true);
  }

  function abrirCancelamento() {
    if (!podeCancelar || !empresaEfetivaId || carregando) return;
    setMenuAberto(false);
    setCancelarAberto(true);
  }

  function abrirHistorico() {
    if (!empresaEfetivaId || carregando) return;
    setMenuAberto(false);
    setHistoricoAberto(true);
  }

  return (
    <>
      <div className="relative inline-flex">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={processando}
          onClick={() => setMenuAberto((estadoAtual) => !estadoAtual)}
          aria-label="Abrir ações da venda"
        >
          <MoreHorizontal size={16} />

          <span className="ml-2 hidden sm:inline">
            {processando ? "Processando..." : "Ações"}
          </span>
        </Button>

        {menuAberto && (
          <>
            <button
              type="button"
              aria-label="Fechar menu"
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setMenuAberto(false)}
            />

            <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              {podeEditar && (
                <button
                  type="button"
                  onClick={abrirEdicao}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Pencil size={16} />
                  Editar venda
                </button>
              )}

              {podeEnviarAprovacao && (
                <button
                  type="button"
                  onClick={enviarAprovacao}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Send size={16} />
                  Enviar para aprovação
                </button>
              )}

              {podeAprovar && (
                <button
                  type="button"
                  onClick={aprovar}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-emerald-700 hover:bg-emerald-50"
                >
                  <CheckCircle2 size={16} />
                  Aprovar venda
                </button>
              )}

              {podeFaturar && (
                <button
                  type="button"
                  onClick={abrirFaturamento}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-blue-700 hover:bg-blue-50"
                >
                  <ReceiptText size={16} />
                  Faturar venda
                </button>
              )}

              <button
                type="button"
                onClick={abrirHistorico}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                <FileClock size={16} />
                Histórico
              </button>

              {podeCancelar && (
                <>
                  <div className="my-1 border-t border-slate-200" />

                  <button
                    type="button"
                    onClick={abrirCancelamento}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <Ban size={16} />
                    Cancelar venda
                  </button>
                </>
              )}

              {!podeEditar &&
                !podeEnviarAprovacao &&
                !podeAprovar &&
                !podeFaturar &&
                !podeCancelar && (
                  <div className="flex items-center gap-3 px-4 py-2 text-sm text-slate-500">
                    <ClipboardCheck size={16} />
                    Venda finalizada
                  </div>
                )}
            </div>
          </>
        )}
      </div>

      <EditarVendaModal
        vendaId={vendaId}
        open={editarAberto}
        onOpenChange={setEditarAberto}
      />

      <FaturarVendaModal
        vendaId={vendaId}
        open={faturarAberto}
        onOpenChange={setFaturarAberto}
      />

      <CancelarVendaModal
        vendaId={vendaId}
        open={cancelarAberto}
        onOpenChange={setCancelarAberto}
      />

      <HistoricoVendaModal
        podeAdicionar={podeAdicionarHistorico}
        vendaId={vendaId}
        open={historicoAberto}
        onOpenChange={setHistoricoAberto}
      />
    </>
  );
}
