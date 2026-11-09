"use client";

import { isAxiosError } from "axios";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Box, DollarSign, Package, Tags } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { CrudEmpty } from "@/components/crud/CrudEmpty";
import { CrudStatusBadge } from "@/components/crud/CrudStatusBadge";
import { Button } from "@/components/ui/button";

import { buscarProdutoPorId } from "@/services/produtos.service";
import { ProdutoHistoricoCard } from "@/components/produtos/ProdutoHistoricoCard";
import { AcessoNegado } from "@/components/common/AcessoNegado";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_PRODUTOS_VISUALIZAR } from "@/lib/auth";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";

export default function ProdutoDetalhesPage() {
  const params = useParams();
  const produtoId = params.id as string;
  const { temPermissao } = useAuth();
  const { empresaSelecionadaId, empresaEfetivaId, carregando, requerSelecao } =
    useEmpresaSelecionada();
  const possuiEmpresaEfetiva = !requerSelecao || Boolean(empresaSelecionadaId);
  const podeVisualizar = temPermissao(PERMISSAO_PRODUTOS_VISUALIZAR);

  const {
    data: produto,
    isLoading,
    error,
  } = useQuery({
    queryKey: estoqueQueryKeys.produto(empresaEfetivaId ?? "", produtoId),
    queryFn: () => buscarProdutoPorId(produtoId),
    enabled:
      podeVisualizar &&
      possuiEmpresaEfetiva &&
      Boolean(empresaEfetivaId) &&
      Boolean(produtoId) &&
      !carregando,
  });

  if (!podeVisualizar)
    return (
      <AppLayout>
        <AcessoNegado />
      </AppLayout>
    );
  if (carregando)
    return (
      <AppLayout>
        <CrudLoading />
      </AppLayout>
    );
  if (!possuiEmpresaEfetiva)
    return (
      <AppLayout>
        <EmpresaNaoSelecionada />
      </AppLayout>
    );

  if (isLoading) {
    return (
      <AppLayout>
        <CrudLoading />
      </AppLayout>
    );
  }

  if (error || !produto) {
    return (
      <AppLayout>
        <CrudEmpty
          message={
            error && !(isAxiosError(error) && error.response?.status === 404)
              ? "Erro ao carregar produto."
              : "Produto não encontrado."
          }
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-w-0 space-y-6">
        <PageHeader
          title={produto.nome}
          description="Ficha completa do produto."
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/produtos">Voltar</Link>
            </Button>
          }
        />

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CrudCard>
            <Package className="mb-2 text-blue-600" size={22} />
            <p className="text-sm text-slate-500">Status</p>
            <CrudStatusBadge ativo={produto.ativo} />
          </CrudCard>

          <CrudCard>
            <DollarSign className="mb-2 text-green-600" size={22} />
            <p className="text-sm text-slate-500">Preço de venda</p>
            <p className="font-semibold text-slate-900">
              R$ {Number(produto.precoVenda).toFixed(2)}
            </p>
          </CrudCard>

          <CrudCard>
            <Box className="mb-2 text-purple-600" size={22} />
            <p className="text-sm text-slate-500">Estoque atual</p>
            <p className="font-semibold text-slate-900">
              {(
                produto.estoques?.reduce(
                  (total, estoque) => total + Number(estoque.quantidadeAtual),
                  0,
                ) ?? 0
              ).toFixed(2)}
            </p>
          </CrudCard>

          <CrudCard>
            <Tags className="mb-2 text-orange-600" size={22} />
            <p className="text-sm text-slate-500">Categoria</p>
            <p className="font-semibold text-slate-900">
              {produto.categoria?.nome || "-"}
            </p>
          </CrudCard>
        </div>

        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Identificação
          </h2>

          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-slate-500">Código interno</p>
              <p className="font-medium text-slate-900">
                {produto.codigo || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Código de barras</p>
              <p className="font-medium text-slate-900">
                {produto.codigoBarras || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">NCM</p>
              <p className="font-medium text-slate-900">{produto.ncm || "-"}</p>
            </div>
          </div>

          {produto.descricao && (
            <div className="mt-4">
              <p className="text-sm text-slate-500">Descrição</p>
              <p className="font-medium text-slate-900">{produto.descricao}</p>
            </div>
          )}
        </CrudCard>

        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Classificação
          </h2>

          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-slate-500">Categoria</p>
              <p className="font-medium text-slate-900">
                {produto.categoria?.nome || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Marca</p>
              <p className="font-medium text-slate-900">
                {produto.marca?.nome || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Unidade</p>
              <p className="font-medium text-slate-900">
                {produto.unidadeMedida
                  ? `${produto.unidadeMedida.sigla} - ${produto.unidadeMedida.nome}`
                  : "-"}
              </p>
            </div>
          </div>
        </CrudCard>

        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Preços e estoque
          </h2>

          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-slate-500">Preço de custo</p>
              <p className="font-medium text-slate-900">
                R$ {Number(produto.precoCusto).toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Preço de venda</p>
              <p className="font-medium text-slate-900">
                R$ {Number(produto.precoVenda).toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Estoque mínimo</p>
              <p className="font-medium text-slate-900">
                {Number(produto.estoqueMinimo).toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Estoque máximo</p>
              <p className="font-medium text-slate-900">
                {produto.estoqueMaximo
                  ? Number(produto.estoqueMaximo).toFixed(2)
                  : "-"}
              </p>
            </div>
          </div>
        </CrudCard>

        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Peso e dimensões
          </h2>

          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-slate-500">Peso</p>
              <p className="font-medium text-slate-900">
                {produto.peso ? Number(produto.peso).toFixed(2) : "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Altura</p>
              <p className="font-medium text-slate-900">
                {produto.altura ? Number(produto.altura).toFixed(2) : "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Largura</p>
              <p className="font-medium text-slate-900">
                {produto.largura ? Number(produto.largura).toFixed(2) : "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Comprimento</p>
              <p className="font-medium text-slate-900">
                {produto.comprimento
                  ? Number(produto.comprimento).toFixed(2)
                  : "-"}
              </p>
            </div>
          </div>
        </CrudCard>

        {/* NOVO CARD DE HISTÓRICO */}
        <CrudCard>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Histórico do produto
          </h2>

          <ProdutoHistoricoCard produtoId={produto.id} />
        </CrudCard>
      </div>
    </AppLayout>
  );
}
