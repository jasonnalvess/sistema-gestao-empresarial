"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { listarClientes } from "@/services/clientes.service";
import { listarDepositos } from "@/services/depositos.service";
import { listarProdutos, Produto } from "@/services/produtos.service";

import {
  CondicaoPagamentoVenda,
  criarVenda,
  FormaPagamentoVenda,
} from "@/services/vendas.service";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import {
  PERMISSAO_CLIENTES_VISUALIZAR,
  PERMISSAO_DEPOSITOS_VISUALIZAR,
  PERMISSAO_PRODUTOS_VISUALIZAR,
} from "@/lib/auth";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import { vendasQueryKeys } from "@/lib/vendas-query-keys";

export type VendaFormPayload = Parameters<typeof criarVenda>[0];

export type VendaFormInitialData = {
  clienteId?: string;
  depositoId?: string;
  dataVenda?: string;

  condicaoPagamento?: CondicaoPagamentoVenda;
  formaPagamento?: FormaPagamentoVenda;

  quantidadeParcelas?: number;
  intervaloParcelas?: number;
  primeiroVencimento?: string;

  valorDesconto?: number;
  valorFrete?: number;
  valorOutros?: number;

  observacao?: string;
  observacaoInterna?: string;

  itens?: Array<{
    produtoId: string;
    quantidade: number;
    valorUnitario: number;
    valorDesconto?: number;
    observacao?: string;
  }>;
};

type ItemFormulario = {
  idTemporario: string;
  produtoId: string;
  quantidade: string;
  valorUnitario: string;
  valorDesconto: string;
  observacao: string;
};

type VendaFormProps = {
  ativo?: boolean;
  initialData?: VendaFormInitialData;
  salvando?: boolean;
  textoBotao?: string;
  onSubmit: (dados: VendaFormPayload) => Promise<void> | void;
  onCancelar?: () => void;
};

function gerarIdTemporario() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function criarItemVazio(): ItemFormulario {
  return {
    idTemporario: gerarIdTemporario(),
    produtoId: "",
    quantidade: "",
    valorUnitario: "",
    valorDesconto: "",
    observacao: "",
  };
}

function converterItensIniciais(
  itens?: VendaFormInitialData["itens"],
): ItemFormulario[] {
  if (!itens?.length) {
    return [criarItemVazio()];
  }

  return itens.map((item) => ({
    idTemporario: gerarIdTemporario(),
    produtoId: item.produtoId,
    quantidade: String(item.quantidade),
    valorUnitario: String(item.valorUnitario),
    valorDesconto: String(item.valorDesconto ?? 0),
    observacao: item.observacao ?? "",
  }));
}

export function VendaForm({
  ativo = true,
  initialData,
  salvando = false,
  textoBotao = "Salvar",
  onSubmit,
  onCancelar,
}: VendaFormProps) {
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const [clienteId, setClienteId] = useState(initialData?.clienteId ?? "");

  const [depositoId, setDepositoId] = useState(initialData?.depositoId ?? "");

  const [dataVenda, setDataVenda] = useState(
    normalizarDataInput(initialData?.dataVenda),
  );

  const [condicaoPagamento, setCondicaoPagamento] =
    useState<CondicaoPagamentoVenda>(
      initialData?.condicaoPagamento ?? "AVISTA",
    );

  const [formaPagamento, setFormaPagamento] = useState<
    FormaPagamentoVenda | ""
  >(initialData?.formaPagamento ?? "");

  const [quantidadeParcelas, setQuantidadeParcelas] = useState(
    String(initialData?.quantidadeParcelas ?? 1),
  );

  const [intervaloParcelas, setIntervaloParcelas] = useState(
    String(initialData?.intervaloParcelas ?? 30),
  );

  const [primeiroVencimento, setPrimeiroVencimento] = useState(
    normalizarDataInput(initialData?.primeiroVencimento),
  );

  const [valorDesconto, setValorDesconto] = useState(
    String(initialData?.valorDesconto ?? ""),
  );

  const [valorFrete, setValorFrete] = useState(
    String(initialData?.valorFrete ?? ""),
  );

  const [valorOutros, setValorOutros] = useState(
    String(initialData?.valorOutros ?? ""),
  );

  const [observacao, setObservacao] = useState(initialData?.observacao ?? "");

  const [observacaoInterna, setObservacaoInterna] = useState(
    initialData?.observacaoInterna ?? "",
  );

  const [itens, setItens] = useState<ItemFormulario[]>(() =>
    converterItensIniciais(initialData?.itens),
  );

  const { data: clientesResponse } = useQuery({
    queryKey: vendasQueryKeys.clientesSelect(empresaEfetivaId ?? ""),
    queryFn: () =>
      listarClientes({
        ativo: "true",
        page: 1,
        limit: 100,
      }),
    enabled:
      ativo &&
      temPermissao(PERMISSAO_CLIENTES_VISUALIZAR) &&
      Boolean(empresaEfetivaId) &&
      !carregando,
  });

  const { data: depositosResponse } = useQuery({
    queryKey: estoqueQueryKeys.depositosSelect(
      empresaEfetivaId ?? "",
      "venda-form",
    ),
    queryFn: () =>
      listarDepositos({
        ativo: true,
        page: 1,
        limit: 100,
        sortBy: "nome",
        order: "asc",
      }),
    enabled:
      ativo &&
      temPermissao(PERMISSAO_DEPOSITOS_VISUALIZAR) &&
      Boolean(empresaEfetivaId) &&
      !carregando,
  });

  const { data: produtosResponse } = useQuery({
    queryKey: estoqueQueryKeys.produtosSelect(
      empresaEfetivaId ?? "",
      "venda-form",
    ),
    queryFn: () =>
      listarProdutos({
        ativo: true,
        page: 1,
        limit: 100,
        sortBy: "nome",
        order: "asc",
      }),
    enabled:
      ativo &&
      temPermissao(PERMISSAO_PRODUTOS_VISUALIZAR) &&
      Boolean(empresaEfetivaId) &&
      !carregando,
  });

  const clientes = clientesResponse?.data ?? [];
  const depositos = depositosResponse?.data ?? [];
  const produtos = produtosResponse?.data ?? [];

  const totais = useMemo(() => {
    const valorProdutos = itens.reduce((total, item) => {
      const quantidade = Number(item.quantidade || 0);
      const valorUnitario = Number(item.valorUnitario || 0);
      const desconto = Number(item.valorDesconto || 0);

      return total + Math.max(quantidade * valorUnitario - desconto, 0);
    }, 0);

    const descontoGeral = Number(valorDesconto || 0);
    const frete = Number(valorFrete || 0);
    const outros = Number(valorOutros || 0);

    return {
      valorProdutos,
      valorTotal: valorProdutos - descontoGeral + frete + outros,
    };
  }, [itens, valorDesconto, valorFrete, valorOutros]);

  function adicionarItem() {
    setItens((estadoAtual) => [...estadoAtual, criarItemVazio()]);
  }

  function removerItem(idTemporario: string) {
    if (itens.length === 1) {
      toast.error("A venda precisa possuir pelo menos um item.");
      return;
    }

    setItens((estadoAtual) =>
      estadoAtual.filter((item) => item.idTemporario !== idTemporario),
    );
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

  function selecionarProduto(idTemporario: string, produtoId: string) {
    const produto = produtos.find((item) => item.id === produtoId);

    setItens((estadoAtual) =>
      estadoAtual.map((item) =>
        item.idTemporario === idTemporario
          ? {
              ...item,
              produtoId,
              valorUnitario: produto ? String(produto.precoVenda) : "",
            }
          : item,
      ),
    );
  }

  function obterEstoqueProduto(produto: Produto | undefined) {
    if (!produto?.estoques?.length || !depositoId) {
      return 0;
    }

    return produto.estoques
      .filter((estoque) => estoque.depositoId === depositoId)
      .reduce(
        (total, estoque) => total + Number(estoque.quantidadeAtual || 0),
        0,
      );
  }

  function validarFormulario() {
    if (!clienteId) {
      toast.error("Selecione o cliente.");
      return false;
    }

    if (!depositoId) {
      toast.error("Selecione o depósito.");
      return false;
    }

    if (!formaPagamento) {
      toast.error("Selecione a forma de pagamento.");
      return false;
    }

    if (condicaoPagamento === "APRAZO" && Number(quantidadeParcelas) < 1) {
      toast.error("Informe uma quantidade válida de parcelas.");
      return false;
    }

    if (condicaoPagamento === "APRAZO" && Number(intervaloParcelas) < 1) {
      toast.error("Informe um intervalo válido entre as parcelas.");
      return false;
    }

    if (condicaoPagamento === "APRAZO" && !primeiroVencimento) {
      toast.error("Informe o primeiro vencimento.");
      return false;
    }

    const itemInvalido = itens.some(
      (item) =>
        !item.produtoId ||
        Number(item.quantidade) <= 0 ||
        Number(item.valorUnitario) < 0 ||
        Number(item.valorDesconto || 0) < 0,
    );

    if (itemInvalido) {
      toast.error("Preencha corretamente todos os itens da venda.");
      return false;
    }

    const descontoItemInvalido = itens.some(
      (item) =>
        Number(item.valorDesconto || 0) >
        Number(item.quantidade || 0) * Number(item.valorUnitario || 0),
    );

    if (descontoItemInvalido) {
      toast.error("O desconto do item não pode superar seu valor bruto.");
      return false;
    }

    const produtosSelecionados = itens.map((item) => item.produtoId);

    if (new Set(produtosSelecionados).size !== produtosSelecionados.length) {
      toast.error("O mesmo produto não pode aparecer duas vezes.");
      return false;
    }

    if (
      Number(valorDesconto || 0) < 0 ||
      Number(valorFrete || 0) < 0 ||
      Number(valorOutros || 0) < 0
    ) {
      toast.error("Os valores adicionais não podem ser negativos.");
      return false;
    }

    if (totais.valorTotal <= 0) {
      toast.error("O valor total da venda precisa ser maior que zero.");
      return false;
    }

    return true;
  }

  async function salvarFormulario() {
    if (!ativo || !empresaEfetivaId || carregando) return;
    if (!validarFormulario()) {
      return;
    }

    const dados: VendaFormPayload = {
      clienteId,
      depositoId,

      dataVenda: dataVenda || undefined,

      condicaoPagamento,

      formaPagamento: formaPagamento || undefined,

      quantidadeParcelas:
        condicaoPagamento === "AVISTA" ? 1 : Number(quantidadeParcelas),

      intervaloParcelas:
        condicaoPagamento === "AVISTA" ? 30 : Number(intervaloParcelas),

      primeiroVencimento:
        condicaoPagamento === "APRAZO"
          ? primeiroVencimento || undefined
          : undefined,

      valorDesconto: Number(valorDesconto || 0),
      valorFrete: Number(valorFrete || 0),
      valorOutros: Number(valorOutros || 0),

      observacao: observacao.trim() || undefined,

      observacaoInterna: observacaoInterna.trim() || undefined,

      itens: itens.map((item) => ({
        produtoId: item.produtoId,
        quantidade: Number(item.quantidade),
        valorUnitario: Number(item.valorUnitario),
        valorDesconto: Number(item.valorDesconto || 0),
        observacao: item.observacao.trim() || undefined,
      })),
    };

    await onSubmit(dados);
  }

  return (
    <div className="max-h-[78vh] space-y-6 overflow-y-auto pr-2">
      <section className="space-y-4">
        <div>
          <h3 className="font-semibold text-slate-900">Dados gerais</h3>

          <p className="text-sm text-slate-500">
            Informe o cliente e o depósito de saída.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Cliente *
            </label>

            <select
              value={clienteId}
              onChange={(event) => setClienteId(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Selecione um cliente</option>

              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Depósito de saída *
            </label>

            <select
              value={depositoId}
              onChange={(event) => setDepositoId(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Selecione um depósito</option>

              {depositos.map((deposito) => (
                <option key={deposito.id} value={deposito.id}>
                  {deposito.codigo} - {deposito.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Data da venda
            </label>

            <Input
              type="date"
              value={dataVenda}
              onChange={(event) => setDataVenda(event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t pt-5">
        <div>
          <h3 className="font-semibold text-slate-900">Pagamento</h3>

          <p className="text-sm text-slate-500">
            Defina a condição e a forma de pagamento.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Condição *
            </label>

            <select
              value={condicaoPagamento}
              onChange={(event) => {
                const valor = event.target.value as CondicaoPagamentoVenda;

                setCondicaoPagamento(valor);

                if (valor === "AVISTA") {
                  setQuantidadeParcelas("1");
                  setIntervaloParcelas("30");
                  setPrimeiroVencimento("");
                }
              }}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="AVISTA">À vista</option>
              <option value="APRAZO">A prazo</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Forma de pagamento *
            </label>

            <select
              value={formaPagamento}
              onChange={(event) =>
                setFormaPagamento(
                  event.target.value as FormaPagamentoVenda | "",
                )
              }
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Selecione a forma</option>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="PIX">PIX</option>
              <option value="CARTAO_CREDITO">Cartão de crédito</option>
              <option value="CARTAO_DEBITO">Cartão de débito</option>
              <option value="BOLETO">Boleto</option>
              <option value="TRANSFERENCIA">Transferência</option>
              <option value="CHEQUE">Cheque</option>
              <option value="OUTRA">Outra</option>
            </select>
          </div>

          {condicaoPagamento === "APRAZO" && (
            <>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Parcelas *
                </label>

                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={quantidadeParcelas}
                  onChange={(event) =>
                    setQuantidadeParcelas(event.target.value)
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Intervalo em dias *
                </label>

                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={intervaloParcelas}
                  onChange={(event) => setIntervaloParcelas(event.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Primeiro vencimento *
                </label>

                <Input
                  type="date"
                  value={primeiroVencimento}
                  onChange={(event) =>
                    setPrimeiroVencimento(event.target.value)
                  }
                />
              </div>
            </>
          )}
        </div>
      </section>

      <section className="space-y-4 border-t pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">Itens da venda</h3>

            <p className="text-sm text-slate-500">
              Adicione os produtos vendidos.
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
            const produtoSelecionado = produtos.find(
              (produto) => produto.id === item.produtoId,
            );

            const produtosUtilizados = itens
              .filter(
                (outroItem) => outroItem.idTemporario !== item.idTemporario,
              )
              .map((outroItem) => outroItem.produtoId);

            const totalItem = Math.max(
              Number(item.quantidade || 0) * Number(item.valorUnitario || 0) -
                Number(item.valorDesconto || 0),
              0,
            );

            return (
              <div
                key={item.idTemporario}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <strong className="text-sm">Item {indice + 1}</strong>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removerItem(item.idTemporario)}
                    className="text-red-600"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-slate-700">
                      Produto *
                    </label>

                    <select
                      value={item.produtoId}
                      onChange={(event) =>
                        selecionarProduto(item.idTemporario, event.target.value)
                      }
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Selecione um produto</option>

                      {produtos.map((produto) => (
                        <option
                          key={produto.id}
                          value={produto.id}
                          disabled={produtosUtilizados.includes(produto.id)}
                        >
                          {produto.codigo ? `${produto.codigo} - ` : ""}
                          {produto.nome}
                        </option>
                      ))}
                    </select>

                    {produtoSelecionado && (
                      <p className="mt-1 text-xs text-slate-500">
                        Estoque no depósito:{" "}
                        {formatarQuantidade(
                          obterEstoqueProduto(produtoSelecionado),
                        )}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Quantidade *
                    </label>

                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantidade}
                      onChange={(event) =>
                        atualizarItem(
                          item.idTemporario,
                          "quantidade",
                          event.target.value,
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
                      onChange={(event) =>
                        atualizarItem(
                          item.idTemporario,
                          "valorUnitario",
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Desconto
                    </label>

                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.valorDesconto}
                      onChange={(event) =>
                        atualizarItem(
                          item.idTemporario,
                          "valorDesconto",
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Total
                    </label>

                    <div className="mt-1 rounded-md border bg-slate-50 px-3 py-2 text-sm font-semibold">
                      {formatarMoeda(totalItem)}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-slate-700">
                      Observação
                    </label>

                    <Input
                      value={item.observacao}
                      onChange={(event) =>
                        atualizarItem(
                          item.idTemporario,
                          "observacao",
                          event.target.value,
                        )
                      }
                    />
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
          <div>
            <label className="text-sm font-medium text-slate-700">
              Desconto geral
            </label>

            <Input
              type="number"
              min="0"
              step="0.01"
              value={valorDesconto}
              onChange={(event) => setValorDesconto(event.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Frete</label>

            <Input
              type="number"
              min="0"
              step="0.01"
              value={valorFrete}
              onChange={(event) => setValorFrete(event.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Outros valores
            </label>

            <Input
              type="number"
              min="0"
              step="0.01"
              value={valorOutros}
              onChange={(event) => setValorOutros(event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 border-t pt-5 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">
            Observação para o cliente
          </label>

          <Textarea
            rows={4}
            value={observacao}
            onChange={(event) => setObservacao(event.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Observação interna
          </label>

          <Textarea
            rows={4}
            value={observacaoInterna}
            onChange={(event) => setObservacaoInterna(event.target.value)}
          />
        </div>
      </section>

      <section className="rounded-lg border bg-slate-50 p-4">
        <h3 className="mb-3 font-semibold">Resumo da venda</h3>

        <LinhaResumo label="Produtos" valor={totais.valorProdutos} />

        <LinhaResumo
          label="Desconto geral"
          valor={-Number(valorDesconto || 0)}
        />

        <LinhaResumo label="Frete" valor={Number(valorFrete || 0)} />

        <LinhaResumo label="Outros valores" valor={Number(valorOutros || 0)} />

        <div className="mt-2 border-t pt-2">
          <LinhaResumo label="Total" valor={totais.valorTotal} destaque />
        </div>
      </section>

      <div className="flex justify-end gap-2 border-t pt-5">
        {onCancelar && (
          <Button
            type="button"
            variant="outline"
            disabled={salvando}
            onClick={onCancelar}
          >
            Cancelar
          </Button>
        )}

        <Button type="button" disabled={salvando} onClick={salvarFormulario}>
          {salvando ? "Salvando..." : textoBotao}
        </Button>
      </div>
    </div>
  );
}

function LinhaResumo({
  label,
  valor,
  destaque = false,
}: {
  label: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span
        className={
          destaque ? "font-semibold text-slate-900" : "text-sm text-slate-600"
        }
      >
        {label}
      </span>

      <span className={destaque ? "text-lg font-bold" : "font-medium"}>
        {formatarMoeda(valor)}
      </span>
    </div>
  );
}

function formatarMoeda(valor: number | string) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarQuantidade(valor: number | string) {
  return Number(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function normalizarDataInput(valor?: string) {
  if (!valor) {
    return "";
  }

  return valor.substring(0, 10);
}
