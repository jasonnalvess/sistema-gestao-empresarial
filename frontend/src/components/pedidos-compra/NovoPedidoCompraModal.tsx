"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/forms/FormDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import {
  PERMISSAO_FORNECEDORES_VISUALIZAR,
  PERMISSAO_PEDIDOS_COMPRA_CRIAR,
} from "@/lib/auth";
import { PERMISSAO_DEPOSITOS_VISUALIZAR, PERMISSAO_PRODUTOS_VISUALIZAR } from "@/lib/auth";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";

import { listarFornecedores } from "@/services/fornecedores.service";
import { listarDepositos } from "@/services/depositos.service";
import { listarProdutos } from "@/services/produtos.service";
import {
  criarPedidoCompra,
  pedidosCompraQueryKeys,
  obterMensagemErroPedidoCompra,
} from "@/services/pedidos-compra.service";

type ItemFormulario = {
  idTemporario: string;
  produtoId: string;
  quantidadeSolicitada: string;
  valorUnitario: string;
  valorDesconto: string;
};

function criarItemVazio(): ItemFormulario {
  return {
    idTemporario:
      Date.now().toString() + "-" + Math.random().toString(36).substring(2, 9),

    produtoId: "",
    quantidadeSolicitada: "",
    valorUnitario: "",
    valorDesconto: "",
  };
}

export function NovoPedidoCompraModal() {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeCriarPedido = temPermissao(PERMISSAO_PEDIDOS_COMPRA_CRIAR);
  const podeVisualizarFornecedores = temPermissao(
    PERMISSAO_FORNECEDORES_VISUALIZAR,
  );
  const podeVisualizarDepositos = temPermissao(PERMISSAO_DEPOSITOS_VISUALIZAR);
  const podeVisualizarProdutos = temPermissao(PERMISSAO_PRODUTOS_VISUALIZAR);

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [fornecedorId, setFornecedorId] = useState("");
  const [depositoId, setDepositoId] = useState("");
  const [dataPrevistaEntrega, setDataPrevistaEntrega] = useState("");

  const [observacao, setObservacao] = useState("");
  const [observacaoInterna, setObservacaoInterna] = useState("");

  const [valorDesconto, setValorDesconto] = useState("");
  const [valorFrete, setValorFrete] = useState("");
  const [valorOutros, setValorOutros] = useState("");

  const [itens, setItens] = useState<ItemFormulario[]>([criarItemVazio()]);

  const { data: fornecedoresResponse } = useQuery({
    queryKey: ["fornecedores-select-novo-pedido", empresaEfetivaId],
    queryFn: () =>
      listarFornecedores({
        ativo: true,
        page: 1,
        limit: 100,
        sortBy: "razaoSocial",
        order: "asc",
      }),
    enabled:
      aberto &&
      podeCriarPedido &&
      podeVisualizarFornecedores &&
      Boolean(empresaEfetivaId) &&
      !carregando,
  });

  const { data: depositosResponse } = useQuery({
    queryKey: estoqueQueryKeys.depositosSelect(empresaEfetivaId ?? "", "novo-pedido"),
    queryFn: () =>
      listarDepositos({
        ativo: true,
        page: 1,
        limit: 100,
        sortBy: "nome",
        order: "asc",
      }),
    enabled:
      aberto && podeCriarPedido && podeVisualizarDepositos && Boolean(empresaEfetivaId) && !carregando,
  });

  const { data: produtosResponse } = useQuery({
    queryKey: estoqueQueryKeys.produtosSelect(empresaEfetivaId ?? "", "novo-pedido"),
    queryFn: () =>
      listarProdutos({
        ativo: true,
        page: 1,
        limit: 100,
        sortBy: "nome",
        order: "asc",
      }),
    enabled:
      aberto && podeCriarPedido && podeVisualizarProdutos && Boolean(empresaEfetivaId) && !carregando,
  });

  const totais = useMemo(() => {
    const valorProdutos = itens.reduce((total, item) => {
      const quantidade = Number(item.quantidadeSolicitada || 0);

      const valorUnitarioNumero = Number(item.valorUnitario || 0);

      const descontoItem = Number(item.valorDesconto || 0);

      return (
        total + Math.max(quantidade * valorUnitarioNumero - descontoItem, 0)
      );
    }, 0);

    const descontoGeral = Number(valorDesconto || 0);
    const frete = Number(valorFrete || 0);
    const outros = Number(valorOutros || 0);

    return {
      valorProdutos,
      valorTotal: valorProdutos - descontoGeral + frete + outros,
    };
  }, [itens, valorDesconto, valorFrete, valorOutros]);

  function limparCampos() {
    setFornecedorId("");
    setDepositoId("");
    setDataPrevistaEntrega("");
    setObservacao("");
    setObservacaoInterna("");
    setValorDesconto("");
    setValorFrete("");
    setValorOutros("");
    setItens([criarItemVazio()]);
  }

  function adicionarItem() {
    setItens((estadoAtual) => [...estadoAtual, criarItemVazio()]);
  }

  function removerItem(idTemporario: string) {
    setItens((estadoAtual) => {
      if (estadoAtual.length === 1) {
        toast.error("O pedido precisa possuir pelo menos um item.");
        return estadoAtual;
      }

      return estadoAtual.filter((item) => item.idTemporario !== idTemporario);
    });
  }

  function atualizarItem(
    idTemporario: string,
    campo: keyof Omit<ItemFormulario, "idTemporario">,
    valor: string,
  ) {
    setItens((estadoAtual) =>
      estadoAtual.map((item) =>
        item.idTemporario === idTemporario
          ? {
              ...item,
              [campo]: valor,
            }
          : item,
      ),
    );
  }

  async function salvar() {
    if (!podeCriarPedido || !empresaEfetivaId || carregando) {
      toast.error("Você não possui permissão para esta ação.");
      return;
    }
    if (!fornecedorId) {
      toast.error("Selecione o fornecedor.");
      return;
    }

    if (!depositoId) {
      toast.error("Selecione o depósito de recebimento.");
      return;
    }

    const possuiItemInvalido = itens.some(
      (item) =>
        !item.produtoId ||
        Number(item.quantidadeSolicitada) <= 0 ||
        Number(item.valorUnitario) < 0,
    );

    if (possuiItemInvalido) {
      toast.error(
        "Preencha produto, quantidade e valor unitário de todos os itens.",
      );
      return;
    }

    const produtosSelecionados = itens.map((item) => item.produtoId);

    if (new Set(produtosSelecionados).size !== produtosSelecionados.length) {
      toast.error("O mesmo produto não pode ser adicionado mais de uma vez.");
      return;
    }

    if (totais.valorTotal < 0) {
      toast.error("O desconto geral não pode tornar o pedido negativo.");
      return;
    }

    try {
      setSalvando(true);

      await criarPedidoCompra({
        fornecedorId,
        depositoId,

        dataPrevistaEntrega: dataPrevistaEntrega || undefined,

        observacao: observacao.trim() || undefined,

        observacaoInterna: observacaoInterna.trim() || undefined,

        valorDesconto: Number(valorDesconto || 0),
        valorFrete: Number(valorFrete || 0),
        valorOutros: Number(valorOutros || 0),

        itens: itens.map((item) => ({
          produtoId: item.produtoId,
          quantidadeSolicitada: Number(item.quantidadeSolicitada),
          valorUnitario: Number(item.valorUnitario),
          valorDesconto: Number(item.valorDesconto || 0),
        })),
      });

      toast.success("Pedido de compra criado com sucesso!");

      limparCampos();
      setAberto(false);

      queryClient.invalidateQueries({
        queryKey: pedidosCompraQueryKeys.listas(empresaEfetivaId),
      });
    } catch (error: unknown) {
      toast.error(
        obterMensagemErroPedidoCompra(error, "Erro ao criar pedido de compra"),
      );
    } finally {
      setSalvando(false);
    }
  }

  if (!podeCriarPedido || !empresaEfetivaId || carregando) return null;

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title="Novo pedido de compra"
      trigger={
        <Button>
          <Plus size={16} className="mr-2" />
          Novo pedido
        </Button>
      }
    >
      <div className="max-h-[78vh] space-y-6 overflow-y-auto pr-2">
        <section className="space-y-4">
          <h3 className="font-semibold text-slate-900">Dados gerais</h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Fornecedor *
              </label>

              <select
                value={fornecedorId}
                onChange={(e) => setFornecedorId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Selecione um fornecedor</option>

                {fornecedoresResponse?.data.map((fornecedor) => (
                  <option key={fornecedor.id} value={fornecedor.id}>
                    {fornecedor.nomeFantasia || fornecedor.razaoSocial}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Depósito de recebimento *
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

            <div>
              <label className="text-sm font-medium text-slate-700">
                Previsão de entrega
              </label>

              <Input
                type="date"
                value={dataPrevistaEntrega}
                onChange={(e) => setDataPrevistaEntrega(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 border-t pt-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Itens do pedido</h3>

              <p className="text-sm text-slate-500">
                Adicione os produtos que serão comprados.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={adicionarItem}
            >
              <Plus size={14} className="mr-2" />
              Adicionar item
            </Button>
          </div>

          <div className="space-y-4">
            {itens.map((item, indice) => {
              const produtosSelecionadosEmOutrosItens = itens
                .filter(
                  (outroItem) => outroItem.idTemporario !== item.idTemporario,
                )
                .map((outroItem) => outroItem.produtoId);

              const valorTotalItem =
                Number(item.quantidadeSolicitada || 0) *
                  Number(item.valorUnitario || 0) -
                Number(item.valorDesconto || 0);

              return (
                <div
                  key={item.idTemporario}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-medium text-slate-800">
                      Item {indice + 1}
                    </p>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removerItem(item.idTemporario)}
                    >
                      <Trash2 size={15} className="text-red-600" />
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-slate-700">
                        Produto *
                      </label>

                      <select
                        value={item.produtoId}
                        onChange={(e) =>
                          atualizarItem(
                            item.idTemporario,
                            "produtoId",
                            e.target.value,
                          )
                        }
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="">Selecione um produto</option>

                        {produtosResponse?.data
                          .filter(
                            (produto) =>
                              !produtosSelecionadosEmOutrosItens.includes(
                                produto.id,
                              ),
                          )
                          .map((produto) => (
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
                        Quantidade *
                      </label>

                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantidadeSolicitada}
                        onChange={(e) =>
                          atualizarItem(
                            item.idTemporario,
                            "quantidadeSolicitada",
                            e.target.value,
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        Valor unitário *
                      </label>

                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.valorUnitario}
                        onChange={(e) =>
                          atualizarItem(
                            item.idTemporario,
                            "valorUnitario",
                            e.target.value,
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        Desconto do item
                      </label>

                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.valorDesconto}
                        onChange={(e) =>
                          atualizarItem(
                            item.idTemporario,
                            "valorDesconto",
                            e.target.value,
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        Total do item
                      </label>

                      <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium">
                        {formatarMoeda(Math.max(valorTotalItem, 0))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-4 border-t pt-5">
          <h3 className="font-semibold text-slate-900">Valores adicionais</h3>

          <div className="grid gap-4 md:grid-cols-3">
            <CampoValor
              label="Desconto geral"
              value={valorDesconto}
              onChange={setValorDesconto}
            />

            <CampoValor
              label="Frete"
              value={valorFrete}
              onChange={setValorFrete}
            />

            <CampoValor
              label="Outros valores"
              value={valorOutros}
              onChange={setValorOutros}
            />
          </div>

          <div className="grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-2">
            <ResumoValor
              label="Valor dos produtos"
              valor={totais.valorProdutos}
            />

            <ResumoValor
              label="Valor total"
              valor={totais.valorTotal}
              destaque
            />
          </div>
        </section>

        <section className="space-y-4 border-t pt-5">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Observação para o fornecedor
            </label>

            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Observação interna
            </label>

            <Textarea
              value={observacaoInterna}
              onChange={(e) => setObservacaoInterna(e.target.value)}
            />
          </div>
        </section>

        <div className="flex justify-end gap-3 border-t pt-5">
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
              salvando || !fornecedorId || !depositoId || itens.length === 0
            }
          >
            <ShoppingCart size={16} className="mr-2" />

            {salvando ? "Criando..." : "Criar pedido"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}

function CampoValor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>

      <Input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ResumoValor({
  label,
  valor,
  destaque = false,
}: {
  label: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={
          destaque
            ? "mt-1 text-xl font-bold text-slate-900"
            : "mt-1 text-base font-semibold text-slate-700"
        }
      >
        {formatarMoeda(valor)}
      </p>
    </div>
  );
}

function formatarMoeda(valor: number) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
