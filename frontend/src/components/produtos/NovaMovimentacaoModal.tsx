"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";

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

import {
  criarMovimentacao,
  CriarMovimentacaoInput,
} from "@/services/movimentacoes.service";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_DEPOSITOS_VISUALIZAR, PERMISSAO_ENTRADAS_REGISTRAR, PERMISSAO_ESTOQUE_AJUSTAR, PERMISSAO_PRODUTOS_VISUALIZAR, PERMISSAO_SAIDAS_REGISTRAR } from "@/lib/auth";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import { obterMensagemErro } from "@/lib/api-error";

type TipoPermitido =
  | "ENTRADA"
  | "SAIDA"
  | "AJUSTE";

export function NovaMovimentacaoModal() {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const permissoesPorTipo: Record<TipoPermitido, boolean> = {
    ENTRADA: temPermissao(PERMISSAO_ENTRADAS_REGISTRAR),
    SAIDA: temPermissao(PERMISSAO_SAIDAS_REGISTRAR),
    AJUSTE: temPermissao(PERMISSAO_ESTOQUE_AJUSTAR),
  };
  const podeRegistrar = Object.values(permissoesPorTipo).some(Boolean);

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [produtoId, setProdutoId] = useState("");
  const [depositoId, setDepositoId] = useState("");
  const [tipo, setTipo] = useState<TipoPermitido>(() => {
    if (permissoesPorTipo.ENTRADA) return "ENTRADA";
    if (permissoesPorTipo.SAIDA) return "SAIDA";
    if (permissoesPorTipo.AJUSTE) return "AJUSTE";
    return "AJUSTE";
  });

  const [quantidade, setQuantidade] = useState("");
  const [custoUnitario, setCustoUnitario] = useState("");
  const [documentoReferencia, setDocumentoReferencia] =
    useState("");
  const [observacao, setObservacao] = useState("");

  const { data: produtosResponse } = useQuery({
    queryKey: estoqueQueryKeys.produtosSelect(empresaEfetivaId ?? "", "movimentacao"),
    queryFn: () =>
      listarProdutos({
        page: 1,
        limit: 100,
        sortBy: "nome",
        order: "asc",
        ativo: true,
      }),
    enabled: aberto && podeRegistrar && temPermissao(PERMISSAO_PRODUTOS_VISUALIZAR) && Boolean(empresaEfetivaId) && !carregando,
  });

  const { data: depositosResponse } = useQuery({
    queryKey: estoqueQueryKeys.depositosSelect(empresaEfetivaId ?? "", "movimentacao"),
    queryFn: () =>
      listarDepositos({
        page: 1,
        limit: 100,
        sortBy: "nome",
        order: "asc",
        ativo: true,
      }),
    enabled: aberto && podeRegistrar && temPermissao(PERMISSAO_DEPOSITOS_VISUALIZAR) && Boolean(empresaEfetivaId) && !carregando,
  });

  function limparCampos() {
    setProdutoId("");
    setDepositoId("");
    setTipo("ENTRADA");
    setQuantidade("");
    setCustoUnitario("");
    setDocumentoReferencia("");
    setObservacao("");
  }

  async function salvar() {
    if (!empresaEfetivaId || carregando || !permissoesPorTipo[tipo]) return;
    if (!produtoId) {
      toast.error("Selecione o produto.");
      return;
    }

    if (!depositoId) {
      toast.error("Selecione o depósito.");
      return;
    }

    const quantidadeNumero = Number(quantidade);

    if (!quantidade || quantidadeNumero <= 0) {
      toast.error("Informe uma quantidade válida.");
      return;
    }

    try {
      setSalvando(true);

      const dados: CriarMovimentacaoInput = {
        produtoId,
        depositoId,
        tipo,
        quantidade: quantidadeNumero,
        custoUnitario:
          tipo === "ENTRADA" && custoUnitario
            ? Number(custoUnitario)
            : undefined,
        documentoReferencia:
          documentoReferencia.trim() || undefined,
        observacao: observacao.trim() || undefined,
      };

      await criarMovimentacao(dados);

      toast.success("Movimentação registrada com sucesso!");

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
      toast.error(obterMensagemErro(error, "Erro ao registrar movimentação"));
    } finally {
      setSalvando(false);
    }
  }

  if (!podeRegistrar || !empresaEfetivaId || carregando) return null;

  function obterAjudaTipo() {
    switch (tipo) {
      case "ENTRADA":
        return "A quantidade será somada ao saldo atual.";

      case "SAIDA":
        return "A quantidade será subtraída do saldo atual.";

      case "AJUSTE":
        return "A quantidade informada será o novo saldo do depósito.";


      default:
        return "";
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button>
          <Plus size={16} className="mr-2" />
          Nova movimentação
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova movimentação de estoque</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
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

            <div>
              <label className="text-sm font-medium text-slate-700">
                Depósito *
              </label>

              <select
                value={depositoId}
                onChange={(e) => setDepositoId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Selecione um depósito</option>

                {depositosResponse?.data.map((deposito) => (
                  <option key={deposito.id} value={deposito.id}>
                    {deposito.codigo} - {deposito.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Tipo de movimentação *
            </label>

            <select
              value={tipo}
              onChange={(e) =>
                setTipo(e.target.value as TipoPermitido)
              }
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {permissoesPorTipo.ENTRADA && <option value="ENTRADA">Entrada</option>}
              {permissoesPorTipo.SAIDA && <option value="SAIDA">Saída</option>}
              {permissoesPorTipo.AJUSTE && <option value="AJUSTE">Ajuste de saldo</option>}
            </select>

            <p className="mt-1 text-xs text-slate-500">
              {obterAjudaTipo()}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
                Custo unitário
              </label>

              <Input
                type="number"
                min="0"
                step="0.01"
                value={custoUnitario}
                onChange={(e) =>
                  setCustoUnitario(e.target.value)
                }
                disabled={tipo !== "ENTRADA"}
                placeholder={
                  tipo === "ENTRADA"
                    ? "Custo da entrada"
                    : "Disponível somente para entrada"
                }
              />
            </div>
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
              placeholder="Ex: NF-12345, COMPRA-001, AJUSTE-2026..."
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Observação
            </label>

            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Informe o motivo ou detalhes da movimentação."
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
                !depositoId ||
                !quantidade
              }
            >
              {salvando
                ? "Registrando..."
                : "Registrar movimentação"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
