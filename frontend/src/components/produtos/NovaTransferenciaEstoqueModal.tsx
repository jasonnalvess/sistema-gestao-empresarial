"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { listarProdutos } from "@/services/produtos.service";
import { listarDepositos } from "@/services/depositos.service";
import { criarTransferenciaEstoque } from "@/services/movimentacoes.service";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_DEPOSITOS_VISUALIZAR, PERMISSAO_PRODUTOS_VISUALIZAR, PERMISSAO_TRANSFERENCIAS_REALIZAR } from "@/lib/auth";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import { obterMensagemErro } from "@/lib/api-error";

export function NovaTransferenciaEstoqueModal() {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeTransferir = temPermissao(PERMISSAO_TRANSFERENCIAS_REALIZAR);

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [produtoId, setProdutoId] = useState("");
  const [depositoOrigemId, setDepositoOrigemId] = useState("");
  const [depositoDestinoId, setDepositoDestinoId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [documentoReferencia, setDocumentoReferencia] = useState("");
  const [observacao, setObservacao] = useState("");

  const { data: produtosResponse } = useQuery({
    queryKey: estoqueQueryKeys.produtosSelect(empresaEfetivaId ?? "", "transferencia"),
    queryFn: () =>
      listarProdutos({
        page: 1,
        limit: 100,
        sortBy: "nome",
        order: "asc",
        ativo: true,
      }),
    enabled: aberto && podeTransferir && temPermissao(PERMISSAO_PRODUTOS_VISUALIZAR) && Boolean(empresaEfetivaId) && !carregando,
  });

  const { data: depositosResponse } = useQuery({
    queryKey: estoqueQueryKeys.depositosSelect(empresaEfetivaId ?? "", "transferencia"),
    queryFn: () =>
      listarDepositos({
        page: 1,
        limit: 100,
        sortBy: "nome",
        order: "asc",
        ativo: true,
      }),
    enabled: aberto && podeTransferir && temPermissao(PERMISSAO_DEPOSITOS_VISUALIZAR) && Boolean(empresaEfetivaId) && !carregando,
  });

  function limparCampos() {
    setProdutoId("");
    setDepositoOrigemId("");
    setDepositoDestinoId("");
    setQuantidade("");
    setDocumentoReferencia("");
    setObservacao("");
  }

  async function salvar() {
    if (!podeTransferir || !empresaEfetivaId || carregando) return;
    if (!produtoId) {
      toast.error("Selecione o produto.");
      return;
    }

    if (!depositoOrigemId || !depositoDestinoId) {
      toast.error("Selecione os depósitos de origem e destino.");
      return;
    }

    if (depositoOrigemId === depositoDestinoId) {
      toast.error("Origem e destino devem ser diferentes.");
      return;
    }

    const quantidadeNumero = Number(quantidade);

    if (!quantidade || quantidadeNumero <= 0) {
      toast.error("Informe uma quantidade válida.");
      return;
    }

    try {
      setSalvando(true);

      await criarTransferenciaEstoque({
        produtoId,
        depositoOrigemId,
        depositoDestinoId,
        quantidade: quantidadeNumero,
        documentoReferencia:
          documentoReferencia.trim() || undefined,
        observacao: observacao.trim() || undefined,
      });

      toast.success("Transferência realizada com sucesso!");

      limparCampos();
      setAberto(false);

      queryClient.invalidateQueries({
        queryKey: estoqueQueryKeys.movimentacoes(empresaEfetivaId),
      });

      queryClient.invalidateQueries({
        queryKey: estoqueQueryKeys.estoque(empresaEfetivaId),
      });

      queryClient.invalidateQueries({
        queryKey: estoqueQueryKeys.produtos(empresaEfetivaId),
      });

      queryClient.invalidateQueries({
        queryKey: estoqueQueryKeys.produtosDetalhes(empresaEfetivaId),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao realizar transferência"));
    } finally {
      setSalvando(false);
    }
  }

  if (!podeTransferir || !empresaEfetivaId || carregando) return null;

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button className="w-full md:w-auto" variant="outline">
          <ArrowRightLeft aria-hidden="true" />
          Nova transferência
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transferência entre depósitos</DialogTitle>
        </DialogHeader>

        <div className="min-w-0 space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Produto *
            </label>

            <select
              value={produtoId}
              onChange={(e) => setProdutoId(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Selecione um produto</option>

              {produtosResponse?.data.map((produto) => (
                <option key={produto.id} value={produto.id}>
                  {produto.codigo
                    ? `${produto.codigo} - ${produto.nome}`
                    : produto.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Depósito de origem *
              </label>

              <select
                value={depositoOrigemId}
                onChange={(e) =>
                  setDepositoOrigemId(e.target.value)
                }
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Selecionar origem</option>

                {depositosResponse?.data.map((deposito) => (
                  <option key={deposito.id} value={deposito.id}>
                    {deposito.codigo} - {deposito.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Depósito de destino *
              </label>

              <select
                value={depositoDestinoId}
                onChange={(e) =>
                  setDepositoDestinoId(e.target.value)
                }
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Selecionar destino</option>

                {depositosResponse?.data
                  .filter(
                    (deposito) =>
                      deposito.id !== depositoOrigemId
                  )
                  .map((deposito) => (
                    <option key={deposito.id} value={deposito.id}>
                      {deposito.codigo} - {deposito.nome}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Quantidade *
            </label>

            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Documento de referência
            </label>

            <Input
              value={documentoReferencia}
              onChange={(e) =>
                setDocumentoReferencia(e.target.value)
              }
              placeholder="Ex: TRANSF-001"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Observação
            </label>

            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Motivo ou detalhes da transferência."
            />
          </div>

          <div className="sticky -bottom-4 -mx-4 flex flex-col-reverse gap-2 border-t bg-white p-4 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setAberto(false)}
              disabled={salvando}
            >
              Cancelar
            </Button>

            <Button
              onClick={salvar}
              disabled={
                salvando ||
                !produtoId ||
                !depositoOrigemId ||
                !depositoDestinoId ||
                !quantidade
              }
            >
              {salvando
                ? "Transferindo..."
                : "Realizar transferência"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
