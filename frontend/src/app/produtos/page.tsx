"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { listarProdutos } from "@/services/produtos.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/common/PageHeader";
import { NovoProdutoModal } from "@/components/produtos/NovoProdutoModal";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudToolbar } from "@/components/crud/CrudToolbar";
import { CrudSearch } from "@/components/crud/CrudSearch";
import { CrudStatusBadge } from "@/components/crud/CrudStatusBadge";
import { CrudPagination } from "@/components/crud/CrudPagination";
import { CrudEmpty } from "@/components/crud/CrudEmpty";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { EditarProdutoModal } from "@/components/produtos/EditarProdutoModal";
import { AlterarStatusProdutoButton } from "@/components/produtos/AlterarStatusProdutoButton";
import { listarCategorias } from "@/services/categorias.service";
import { listarMarcasProdutos } from "@/services/marcas-produtos.service";
import { listarUnidadesMedida } from "@/services/unidades-medida.service";
import { ProdutosSummaryCards } from "@/components/produtos/ProdutosSummaryCards";
import { DetailsButton } from "@/components/actions/DetailsButton";
import { AcessoNegado } from "@/components/common/AcessoNegado";
import { EmpresaNaoSelecionada } from "@/components/common/EmpresaNaoSelecionada";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import {
  PERMISSAO_CATEGORIAS_VISUALIZAR,
  PERMISSAO_MARCAS_VISUALIZAR,
  PERMISSAO_PRODUTOS_CRIAR,
  PERMISSAO_PRODUTOS_EDITAR,
  PERMISSAO_PRODUTOS_VISUALIZAR,
  PERMISSAO_UNIDADES_VISUALIZAR,
} from "@/lib/auth";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";

export default function ProdutosPage() {
  const { temPermissao } = useAuth();
  const { empresaSelecionadaId, empresaEfetivaId, carregando, requerSelecao } = useEmpresaSelecionada();
  const possuiEmpresaEfetiva = !requerSelecao || Boolean(empresaSelecionadaId);
  const podeVisualizar = temPermissao(PERMISSAO_PRODUTOS_VISUALIZAR);
  const podeCriar = temPermissao(PERMISSAO_PRODUTOS_CRIAR);
  const podeEditar = temPermissao(PERMISSAO_PRODUTOS_EDITAR);
  const podeVisualizarCategorias = temPermissao(PERMISSAO_CATEGORIAS_VISUALIZAR);
  const podeVisualizarMarcas = temPermissao(PERMISSAO_MARCAS_VISUALIZAR);
  const podeVisualizarUnidades = temPermissao(PERMISSAO_UNIDADES_VISUALIZAR);
  const [search, setSearch] = useState("");
  const [searchAplicado, setSearchAplicado] = useState("");
  const [page, setPage] = useState(1);
  const [categoriaId, setCategoriaId] = useState("");
  const [marcaId, setMarcaId] = useState("");
  const [unidadeMedidaId, setUnidadeMedidaId] = useState("");
  const [ativo, setAtivo] = useState("");

  const { data: categoriasResponse } = useQuery({
    queryKey: estoqueQueryKeys.categoriasSelect(empresaEfetivaId ?? ""),
    queryFn: () =>
      listarCategorias({
        page: 1,
        limit: 100,
        sortBy: "nome",
        order: "asc",
      }),
    enabled: podeVisualizar && podeVisualizarCategorias && possuiEmpresaEfetiva && Boolean(empresaEfetivaId) && !carregando,
  });

  const { data: marcasResponse } = useQuery({
    queryKey: estoqueQueryKeys.marcasSelect(empresaEfetivaId ?? ""),
    queryFn: () =>
      listarMarcasProdutos({
        page: 1,
        limit: 100,
      }),
    enabled: podeVisualizar && podeVisualizarMarcas && possuiEmpresaEfetiva && Boolean(empresaEfetivaId) && !carregando,
  });

  const { data: unidadesResponse } = useQuery({
    queryKey: estoqueQueryKeys.unidadesSelect(empresaEfetivaId ?? ""),
    queryFn: () =>
      listarUnidadesMedida({
        page: 1,
        limit: 100,
      }),
    enabled: podeVisualizar && podeVisualizarUnidades && possuiEmpresaEfetiva && Boolean(empresaEfetivaId) && !carregando,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: [
      ...estoqueQueryKeys.produtos(empresaEfetivaId ?? ""),
      searchAplicado,
      categoriaId,
      marcaId,
      unidadeMedidaId,
      ativo,
      page,
    ],
    queryFn: () =>
      listarProdutos({
        search: searchAplicado,
        categoriaId: categoriaId || undefined,
        marcaId: marcaId || undefined,
        unidadeMedidaId: unidadeMedidaId || undefined,
        ativo:
          ativo === ""
            ? undefined
            : ativo === "true",
        page,
        limit: 10,
        sortBy: "createdAt",
        order: "desc",
      }),
    enabled: podeVisualizar && possuiEmpresaEfetiva && Boolean(empresaEfetivaId) && !carregando,
  });

  function pesquisar() {
    setPage(1);
    setSearchAplicado(search);
  }

  const produtos = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  if (!podeVisualizar) return <AppLayout><AcessoNegado /></AppLayout>;
  if (carregando) return <AppLayout><CrudLoading /></AppLayout>;
  if (!possuiEmpresaEfetiva) return <AppLayout><EmpresaNaoSelecionada /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Produtos"
          description="Gerencie os produtos cadastrados no sistema."
          actions={podeCriar ? <NovoProdutoModal /> : undefined}
        />

        <ProdutosSummaryCards produtos={produtos} />

        <CrudCard>
          <CrudToolbar>
            <CrudSearch
              value={search}
              onChange={setSearch}
              onSearch={pesquisar}
              placeholder="Pesquisar por nome, código, código de barras, NCM, marca ou categoria..."
            />
          </CrudToolbar>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
            <select
              value={categoriaId}
              onChange={(e) => {
                setCategoriaId(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Todas as categorias</option>

              {categoriasResponse?.data.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </option>
              ))}
            </select>

            <select
              value={marcaId}
              onChange={(e) => {
                setMarcaId(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Todas as marcas</option>

              {marcasResponse?.data.map((marca) => (
                <option key={marca.id} value={marca.id}>
                  {marca.nome}
                </option>
              ))}
            </select>

            <select
              value={unidadeMedidaId}
              onChange={(e) => {
                setUnidadeMedidaId(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Todas as unidades</option>

              {unidadesResponse?.data.map((unidade) => (
                <option key={unidade.id} value={unidade.id}>
                  {unidade.sigla}
                </option>
              ))}
            </select>

            <select
              value={ativo}
              onChange={(e) => {
                setAtivo(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Todos os status</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select>
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Erro ao carregar produtos.
            </div>
          )}

          {isLoading ? (
            <CrudLoading />
          ) : (
            <>
              <div className="mt-5 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Custo</TableHead>
                      <TableHead>Venda</TableHead>
                      <TableHead>Estoque</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {produtos.map((produto) => (
                      <TableRow key={produto.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-900">{produto.nome}</p>
                            {produto.descricao && (
                              <p className="text-xs text-slate-500">{produto.descricao}</p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div>
                            <p>{produto.codigo || "-"}</p>
                            {produto.codigoBarras && (
                              <p className="text-xs text-slate-500">
                                Barras: {produto.codigoBarras}
                              </p>
                            )}
                            {produto.ncm && (
                              <p className="text-xs text-slate-500">NCM: {produto.ncm}</p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>{produto.categoria?.nome || "-"}</TableCell>

                        <TableCell>{produto.marca?.nome || "-"}</TableCell>

                        <TableCell>{produto.unidadeMedida?.sigla || "-"}</TableCell>

                        <TableCell>R$ {Number(produto.precoCusto).toFixed(2)}</TableCell>

                        <TableCell>R$ {Number(produto.precoVenda).toFixed(2)}</TableCell>

                        <TableCell>
                          {produto.estoques?.length
                            ? produto.estoques
                                .reduce(
                                  (total, estoque) =>
                                    total + Number(estoque.quantidadeAtual),
                                  0
                                )
                                .toFixed(2)
                            : "0.00"}
                        </TableCell>

                        <TableCell>
                          <CrudStatusBadge ativo={produto.ativo} />
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <DetailsButton href={`/produtos/${produto.id}`} />
                            {podeEditar && <><EditarProdutoModal produto={produto} /><AlterarStatusProdutoButton produto={produto} /></>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {produtos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10}>
                          <CrudEmpty message="Nenhum produto encontrado." />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <CrudPagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </>
          )}
        </CrudCard>
      </div>
    </AppLayout>
  );
}
