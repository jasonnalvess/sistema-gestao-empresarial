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

export function NovaTransferenciaEstoqueModal() {
  const queryClient = useQueryClient();

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [produtoId, setProdutoId] = useState("");
  const [depositoOrigemId, setDepositoOrigemId] = useState("");
  const [depositoDestinoId, setDepositoDestinoId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [documentoReferencia, setDocumentoReferencia] = useState("");
  const [observacao, setObservacao] = useState("");

  const { data: produtosResponse } = useQuery({
    queryKey: ["produtos-select-transferencia"],
    queryFn: () =>
      listarProdutos({
        page: 1,
        limit: 100,
        sortBy: "nome",
        order: "asc",
        ativo: true,
      }),
  });

  const { data: depositosResponse } = useQuery({
    queryKey: ["depositos-select-transferencia"],
    queryFn: () =>
      listarDepositos({
        page: 1,
        limit: 100,
        sortBy: "nome",
        order: "asc",
        ativo: true,
      }),
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
        queryKey: ["movimentacoes"],
      });

      queryClient.invalidateQueries({
        queryKey: ["estoque"],
      });

      queryClient.invalidateQueries({
        queryKey: ["produtos"],
      });

      queryClient.invalidateQueries({
        queryKey: ["produto"],
      });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Erro ao realizar transferência"
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ArrowRightLeft size={16} className="mr-2" />
          Nova transferência
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transferência entre depósitos</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
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

          <div className="grid gap-4 md:grid-cols-2">
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

          <div className="flex justify-end gap-3 pt-4">
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
