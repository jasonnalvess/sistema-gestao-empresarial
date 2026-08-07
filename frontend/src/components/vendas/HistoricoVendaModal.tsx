"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/forms/FormDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import {
  PERMISSAO_VENDAS_HISTORICO_ADICIONAR,
  PERMISSAO_VENDAS_VISUALIZAR,
} from "@/lib/auth";
import { vendasQueryKeys } from "@/lib/vendas-query-keys";

import {
  adicionarHistoricoVenda,
  listarHistoricoVenda,
} from "@/services/vendas.service";

type Props = {
  vendaId: string;
  podeAdicionar: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type HistoricoItem = {
  id?: string;
  descricao?: string;
  observacao?: string;
  mensagem?: string;
  acao?: string;
  statusAnterior?: string;
  statusNovo?: string;
  criadoEm?: string;
  createdAt?: string;
  data?: string;
  usuario?: {
    id?: string;
    nome?: string;
    email?: string;
  };
};

export function HistoricoVendaModal({
  vendaId,
  podeAdicionar,
  open,
  onOpenChange,
}: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeVisualizar = temPermissao(PERMISSAO_VENDAS_VISUALIZAR);
  const podeAdicionarHistorico =
    podeAdicionar && temPermissao(PERMISSAO_VENDAS_HISTORICO_ADICIONAR);

  const [novaObservacao, setNovaObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: vendasQueryKeys.historico(empresaEfetivaId ?? "", vendaId),
    queryFn: () => listarHistoricoVenda(vendaId),
    enabled:
      open &&
      Boolean(vendaId) &&
      Boolean(empresaEfetivaId) &&
      !carregando &&
      podeVisualizar,
  });

  const historico = normalizarHistorico(data);

  async function adicionarObservacao() {
    if (!empresaEfetivaId || carregando || !podeAdicionarHistorico) {
      toast.error("Você não possui permissão para adicionar histórico.");
      return;
    }
    const descricao = novaObservacao.trim();

    if (!descricao) {
      toast.error("Digite uma observação.");
      return;
    }

    try {
      setSalvando(true);

      await adicionarHistoricoVenda(vendaId, {
        descricao,
      });

      toast.success("Observação adicionada ao histórico.");

      setNovaObservacao("");

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: vendasQueryKeys.historico(empresaEfetivaId, vendaId),
        }),

        queryClient.invalidateQueries({
          queryKey: vendasQueryKeys.detalhe(empresaEfetivaId, vendaId),
        }),
      ]);

      await refetch();
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao adicionar observação."));
    } finally {
      setSalvando(false);
    }
  }

  if (!podeVisualizar || !empresaEfetivaId || carregando) return null;

  return (
    <FormDialog
      open={open}
      onOpenChange={(novoEstado) => {
        if (salvando) {
          return;
        }

        onOpenChange(novoEstado);

        if (!novoEstado) {
          setNovaObservacao("");
        }
      }}
      title="Histórico da venda"
      trigger={<span className="hidden" />}
    >
      <div className="space-y-6">
        {podeAdicionarHistorico && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquarePlus size={18} className="text-slate-600" />

              <h3 className="font-semibold text-slate-900">
                Adicionar observação
              </h3>
            </div>

            <Textarea
              rows={3}
              value={novaObservacao}
              disabled={salvando}
              onChange={(event) => setNovaObservacao(event.target.value)}
              placeholder="Digite uma observação sobre esta venda"
            />

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                disabled={salvando || !novaObservacao.trim()}
                onClick={adicionarObservacao}
              >
                {salvando ? "Adicionando..." : "Adicionar ao histórico"}
              </Button>
            </div>
          </section>
        )}

        <section className="space-y-4 border-t pt-5">
          <div className="flex items-center gap-2">
            <Clock3 size={18} className="text-slate-600" />

            <h3 className="font-semibold text-slate-900">Registros</h3>
          </div>

          {isLoading && (
            <div className="rounded-lg border border-slate-200 p-6 text-center text-sm text-slate-500">
              Carregando histórico...
            </div>
          )}

          {isError && !isLoading && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">
                Não foi possível carregar o histórico.
              </p>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => refetch()}
              >
                Tentar novamente
              </Button>
            </div>
          )}

          {!isLoading && !isError && historico.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
              <Clock3 size={28} className="mx-auto mb-3 text-slate-400" />

              <p className="text-sm text-slate-500">
                Nenhum registro encontrado.
              </p>
            </div>
          )}

          {!isLoading && !isError && historico.length > 0 && (
            <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
              {historico.map((item, indice) => {
                const descricao =
                  item.descricao ||
                  item.observacao ||
                  item.mensagem ||
                  item.acao ||
                  "Alteração registrada na venda.";

                const dataRegistro =
                  item.criadoEm || item.createdAt || item.data;

                const nomeUsuario =
                  item.usuario?.nome || item.usuario?.email || "Sistema";

                return (
                  <article
                    key={item.id ?? `${indice}-${dataRegistro}`}
                    className="relative rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {descricao}
                        </p>

                        {(item.statusAnterior || item.statusNovo) && (
                          <p className="mt-2 text-xs text-slate-500">
                            Status:{" "}
                            <span className="font-medium">
                              {formatarStatus(item.statusAnterior)}
                            </span>
                            {" → "}
                            <span className="font-medium">
                              {formatarStatus(item.statusNovo)}
                            </span>
                          </p>
                        )}
                      </div>

                      <time className="whitespace-nowrap text-xs text-slate-500">
                        {formatarDataHora(dataRegistro)}
                      </time>
                    </div>

                    <p className="mt-3 text-xs text-slate-500">
                      Registrado por: {nomeUsuario}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </section>

          <div className="sticky bottom-0 flex flex-col-reverse border-t bg-white pt-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={salvando}
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}

function normalizarHistorico(resposta: unknown): HistoricoItem[] {
  if (Array.isArray(resposta)) {
    return resposta as HistoricoItem[];
  }

  if (typeof resposta === "object" && resposta !== null) {
    const objeto = resposta as {
      data?: unknown;
      historico?: unknown;
      items?: unknown;
    };

    if (Array.isArray(objeto.data)) {
      return objeto.data as HistoricoItem[];
    }

    if (Array.isArray(objeto.historico)) {
      return objeto.historico as HistoricoItem[];
    }

    if (Array.isArray(objeto.items)) {
      return objeto.items as HistoricoItem[];
    }
  }

  return [];
}

function formatarDataHora(data?: string) {
  if (!data) {
    return "Data não informada";
  }

  const valor = new Date(data);

  if (Number.isNaN(valor.getTime())) {
    return data;
  }

  return valor.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatarStatus(status?: string) {
  if (!status) {
    return "Não informado";
  }

  return status
    .replaceAll("_", " ")
    .toLocaleLowerCase("pt-BR")
    .replace(/^\p{L}/u, (letra) => letra.toLocaleUpperCase("pt-BR"));
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
