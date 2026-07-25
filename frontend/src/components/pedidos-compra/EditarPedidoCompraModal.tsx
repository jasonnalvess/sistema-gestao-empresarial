"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/forms/FormDialog";

import { listarFornecedores } from "@/services/fornecedores.service";
import { listarDepositos } from "@/services/depositos.service";
import { listarProdutos } from "@/services/produtos.service";

import {
  atualizarPedidoCompra,
  PedidoCompraDetalhado,
} from "@/services/pedidos-compra.service";

type Props = {
  pedido: PedidoCompraDetalhado;
};

type ItemFormulario = {
  idTemporario: string;
  produtoId: string;
  quantidadeSolicitada: string;
  valorUnitario: string;
  valorDesconto: string;
};

function gerarIdTemporario() {
  return (
    Date.now().toString() +
    "-" +
    Math.random().toString(36).substring(2, 9)
  );
}

export function EditarPedidoCompraModal({
  pedido,
}: Props) {
  const queryClient = useQueryClient();

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [fornecedorId, setFornecedorId] = useState(
    pedido.fornecedor?.id ?? ""
  );

  const [depositoId, setDepositoId] = useState(
    pedido.deposito?.id ?? ""
  );

  const [dataPrevistaEntrega, setDataPrevistaEntrega] =
    useState(
      pedido.dataPrevistaEntrega
        ? pedido.dataPrevistaEntrega.slice(0, 10)
        : ""
    );

  const [observacao, setObservacao] = useState(
    pedido.observacao ?? ""
  );

  const [observacaoInterna, setObservacaoInterna] =
    useState(pedido.observacaoInterna ?? "");

  const [valorDesconto, setValorDesconto] = useState(
    pedido.valorDesconto
  );

  const [valorFrete, setValorFrete] = useState(
    pedido.valorFrete
  );

  const [valorOutros, setValorOutros] = useState(
    pedido.valorOutros
  );

  const [itens, setItens] = useState<ItemFormulario[]>(
    pedido.itens.map((item) => ({
      idTemporario: gerarIdTemporario(),
      produtoId: item.produtoId,
      quantidadeSolicitada: item.quantidadeSolicitada,
      valorUnitario: item.valorUnitario,
      valorDesconto: item.valorDesconto,
    }))
  );

  const { data: fornecedoresResponse } = useQuery({
    queryKey: ["fornecedores-select-editar-pedido"],
    queryFn: () =>
      listarFornecedores({
        ativo: true,
        page: 1,
        limit: 100,
        sortBy: "razaoSocial",
        order: "asc",
      }),
  });

  const { data: depositosResponse } = useQuery({
    queryKey: ["depositos-select-editar-pedido"],
    queryFn: () =>
      listarDepositos({
        ativo: true,
        page: 1,
        limit: 100,
        sortBy: "nome",
        order: "asc",
      }),
  });

  const { data: produtosResponse } = useQuery({
    queryKey: ["produtos-select-editar-pedido"],
    queryFn: () =>
      listarProdutos({
        ativo: true,
        page: 1,
        limit: 100,
        sortBy: "nome",
        order: "asc",
      }),
  });

  const totais = useMemo(() => {
    const valorProdutos = itens.reduce((total, item) => {
      const quantidade = Number(
        item.quantidadeSolicitada || 0
      );

      const valorUnitarioNumero = Number(
        item.valorUnitario || 0
      );

      const descontoItem = Number(
        item.valorDesconto || 0
      );

      return (
        total +
        Math.max(
          quantidade * valorUnitarioNumero -
            descontoItem,
          0
        )
      );
    }, 0);

    const valorTotal =
      valorProdutos -
      Number(valorDesconto || 0) +
      Number(valorFrete || 0) +
      Number(valorOutros || 0);

    return {
      valorProdutos,
      valorTotal,
    };
  }, [
    itens,
    valorDesconto,
    valorFrete,
    valorOutros,
  ]);

  function adicionarItem() {
    setItens((estadoAtual) => [
      ...estadoAtual,
      {
        idTemporario: gerarIdTemporario(),
        produtoId: "",
        quantidadeSolicitada: "",
        valorUnitario: "",
        valorDesconto: "",
      },
    ]);
  }

  function removerItem(idTemporario: string) {
    if (itens.length === 1) {
      toast.error(
        "O pedido precisa possuir pelo menos um item."
      );
      return;
    }

    setItens((estadoAtual) =>
      estadoAtual.filter(
        (item) =>
          item.idTemporario !== idTemporario
      )
    );
  }

  function atualizarItem(
    idTemporario: string,
    campo: keyof Omit<
      ItemFormulario,
      "idTemporario"
    >,
    valor: string
  ) {
    setItens((estadoAtual) =>
      estadoAtual.map((item) =>
        item.idTemporario === idTemporario
          ? {
              ...item,
              [campo]: valor,
            }
          : item
      )
    );
  }

  async function salvar() {
    if (!fornecedorId || !depositoId) {
      toast.error(
        "Selecione fornecedor e depósito."
      );
      return;
    }

    const itemInvalido = itens.some(
      (item) =>
        !item.produtoId ||
        Number(item.quantidadeSolicitada) <= 0 ||
        Number(item.valorUnitario) < 0
    );

    if (itemInvalido) {
      toast.error(
        "Revise os dados dos itens."
      );
      return;
    }

    const produtoIds = itens.map(
      (item) => item.produtoId
    );

    if (
      new Set(produtoIds).size !==
      produtoIds.length
    ) {
      toast.error(
        "O mesmo produto não pode aparecer mais de uma vez."
      );
      return;
    }

    try {
      setSalvando(true);

      await atualizarPedidoCompra(pedido.id, {
        fornecedorId,
        depositoId,

        dataPrevistaEntrega:
          dataPrevistaEntrega || undefined,

        observacao:
          observacao.trim() || undefined,

        observacaoInterna:
          observacaoInterna.trim() || undefined,

        valorDesconto: Number(
          valorDesconto || 0
        ),

        valorFrete: Number(valorFrete || 0),

        valorOutros: Number(valorOutros || 0),

        itens: itens.map((item) => ({
          produtoId: item.produtoId,
          quantidadeSolicitada: Number(
            item.quantidadeSolicitada
          ),
          valorUnitario: Number(
            item.valorUnitario
          ),
          valorDesconto: Number(
            item.valorDesconto || 0
          ),
        })),
      });

      toast.success(
        "Pedido atualizado com sucesso!"
      );

      setAberto(false);

      await queryClient.invalidateQueries({
        queryKey: [
          "pedido-compra",
          pedido.id,
        ],
      });

      await queryClient.invalidateQueries({
        queryKey: ["pedidos-compra"],
      });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Erro ao atualizar pedido"
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title={`Editar pedido #${String(
        pedido.numero
      ).padStart(5, "0")}`}
      trigger={
        <Button variant="outline">
          <Pencil size={16} className="mr-2" />
          Editar pedido
        </Button>
      }
    >
      <div className="max-h-[78vh] space-y-6 overflow-y-auto pr-2">
        <section className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">
              Fornecedor
            </label>

            <select
              value={fornecedorId}
              onChange={(e) =>
                setFornecedorId(e.target.value)
              }
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">
                Selecione
              </option>

              {fornecedoresResponse?.data.map(
                (fornecedor) => (
                  <option
                    key={fornecedor.id}
                    value={fornecedor.id}
                  >
                    {fornecedor.nomeFantasia ||
                      fornecedor.razaoSocial}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">
              Depósito
            </label>

            <select
              value={depositoId}
              onChange={(e) =>
                setDepositoId(e.target.value)
              }
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">
                Selecione
              </option>

              {depositosResponse?.data.map(
                (deposito) => (
                  <option
                    key={deposito.id}
                    value={deposito.id}
                  >
                    {deposito.codigo} -{" "}
                    {deposito.nome}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">
              Previsão de entrega
            </label>

            <Input
              type="date"
              value={dataPrevistaEntrega}
              onChange={(e) =>
                setDataPrevistaEntrega(
                  e.target.value
                )
              }
            />
          </div>
        </section>

        <section className="space-y-4 border-t pt-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              Itens
            </h3>

            <Button
              variant="outline"
              size="sm"
              onClick={adicionarItem}
            >
              <Plus size={14} className="mr-2" />
              Adicionar
            </Button>
          </div>

          {itens.map((item, indice) => (
            <div
              key={item.idTemporario}
              className="rounded-lg border p-4"
            >
              <div className="mb-4 flex justify-between">
                <span className="font-medium">
                  Item {indice + 1}
                </span>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    removerItem(
                      item.idTemporario
                    )
                  }
                >
                  <Trash2
                    size={15}
                    className="text-red-600"
                  />
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">
                    Produto
                  </label>

                  <select
                    value={item.produtoId}
                    onChange={(e) =>
                      atualizarItem(
                        item.idTemporario,
                        "produtoId",
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="">
                      Selecione
                    </option>

                    {produtosResponse?.data.map(
                      (produto) => (
                        <option
                          key={produto.id}
                          value={produto.id}
                        >
                          {produto.codigo
                            ? `${produto.codigo} - ${produto.nome}`
                            : produto.nome}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <CampoNumero
                  label="Quantidade"
                  value={
                    item.quantidadeSolicitada
                  }
                  onChange={(valor) =>
                    atualizarItem(
                      item.idTemporario,
                      "quantidadeSolicitada",
                      valor
                    )
                  }
                />

                <CampoNumero
                  label="Valor unitário"
                  value={item.valorUnitario}
                  onChange={(valor) =>
                    atualizarItem(
                      item.idTemporario,
                      "valorUnitario",
                      valor
                    )
                  }
                />

                <CampoNumero
                  label="Desconto"
                  value={item.valorDesconto}
                  onChange={(valor) =>
                    atualizarItem(
                      item.idTemporario,
                      "valorDesconto",
                      valor
                    )
                  }
                />
              </div>
            </div>
          ))}
        </section>

        <section className="grid gap-4 border-t pt-5 md:grid-cols-3">
          <CampoNumero
            label="Desconto geral"
            value={valorDesconto}
            onChange={setValorDesconto}
          />

          <CampoNumero
            label="Frete"
            value={valorFrete}
            onChange={setValorFrete}
          />

          <CampoNumero
            label="Outros valores"
            value={valorOutros}
            onChange={setValorOutros}
          />
        </section>

        <section className="rounded-lg bg-slate-50 p-4">
          <div className="flex justify-between">
            <span>Produtos</span>
            <strong>
              {formatarMoeda(
                totais.valorProdutos
              )}
            </strong>
          </div>

          <div className="mt-3 flex justify-between text-lg">
            <span>Total</span>
            <strong>
              {formatarMoeda(totais.valorTotal)}
            </strong>
          </div>
        </section>

        <section className="space-y-4 border-t pt-5">
          <div>
            <label className="text-sm font-medium">
              Observação
            </label>

            <Textarea
              value={observacao}
              onChange={(e) =>
                setObservacao(e.target.value)
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Observação interna
            </label>

            <Textarea
              value={observacaoInterna}
              onChange={(e) =>
                setObservacaoInterna(
                  e.target.value
                )
              }
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
            disabled={salvando}
          >
            {salvando
              ? "Salvando..."
              : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}

function CampoNumero({
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
      <label className="text-sm font-medium">
        {label}
      </label>

      <Input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
      />
    </div>
  );
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
