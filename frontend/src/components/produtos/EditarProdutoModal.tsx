"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

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

import { atualizarProduto, Produto } from "@/services/produtos.service";
import { listarCategorias } from "@/services/categorias.service";
import { listarMarcasProdutos } from "@/services/marcas-produtos.service";
import { listarUnidadesMedida } from "@/services/unidades-medida.service";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import {
  PERMISSAO_CATEGORIAS_VISUALIZAR,
  PERMISSAO_MARCAS_VISUALIZAR,
  PERMISSAO_PRODUTOS_EDITAR,
  PERMISSAO_UNIDADES_VISUALIZAR,
} from "@/lib/auth";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import { obterMensagemErro } from "@/lib/api-error";

type Props = {
  produto: Produto;
};

export function EditarProdutoModal({ produto }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeEditar = temPermissao(PERMISSAO_PRODUTOS_EDITAR);

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState(produto.nome);
  const [descricao, setDescricao] = useState(produto.descricao ?? "");
  const [codigo, setCodigo] = useState(produto.codigo ?? "");
  const [codigoBarras, setCodigoBarras] = useState(produto.codigoBarras ?? "");
  const [ncm, setNcm] = useState(produto.ncm ?? "");
  const [precoCusto, setPrecoCusto] = useState(produto.precoCusto ?? "0");
  const [precoVenda, setPrecoVenda] = useState(produto.precoVenda ?? "0");
  const [estoqueMinimo, setEstoqueMinimo] = useState(
    produto.estoqueMinimo ?? "0",
  );
  const [estoqueMaximo, setEstoqueMaximo] = useState(
    produto.estoqueMaximo ?? "",
  );
  const [peso, setPeso] = useState(produto.peso ?? "");
  const [altura, setAltura] = useState(produto.altura ?? "");
  const [largura, setLargura] = useState(produto.largura ?? "");
  const [comprimento, setComprimento] = useState(produto.comprimento ?? "");
  const [categoriaId, setCategoriaId] = useState(produto.categoriaId ?? "");
  const [marcaId, setMarcaId] = useState(produto.marcaId ?? "");
  const [unidadeMedidaId, setUnidadeMedidaId] = useState(
    produto.unidadeMedidaId ?? "",
  );

  const { data: categoriasResponse } = useQuery({
    queryKey: estoqueQueryKeys.categoriasSelect(empresaEfetivaId ?? ""),
    queryFn: () =>
      listarCategorias({
        page: 1,
        limit: 100,
        sortBy: "nome",
        order: "asc",
      }),
    enabled:
      aberto &&
      podeEditar &&
      temPermissao(PERMISSAO_CATEGORIAS_VISUALIZAR) &&
      Boolean(empresaEfetivaId) &&
      !carregando,
  });

  const { data: marcasResponse } = useQuery({
    queryKey: estoqueQueryKeys.marcasSelect(empresaEfetivaId ?? ""),
    queryFn: () => listarMarcasProdutos({ page: 1, limit: 100 }),
    enabled:
      aberto &&
      podeEditar &&
      temPermissao(PERMISSAO_MARCAS_VISUALIZAR) &&
      Boolean(empresaEfetivaId) &&
      !carregando,
  });

  const { data: unidadesResponse } = useQuery({
    queryKey: estoqueQueryKeys.unidadesSelect(empresaEfetivaId ?? ""),
    queryFn: () => listarUnidadesMedida({ page: 1, limit: 100 }),
    enabled:
      aberto &&
      podeEditar &&
      temPermissao(PERMISSAO_UNIDADES_VISUALIZAR) &&
      Boolean(empresaEfetivaId) &&
      !carregando,
  });

  async function salvar() {
    if (!podeEditar || !empresaEfetivaId || carregando) return;
    if (!nome.trim()) {
      toast.error("Informe o nome do produto.");
      return;
    }

    if (!precoVenda) {
      toast.error("Informe o preço de venda.");
      return;
    }

    try {
      setSalvando(true);

      await atualizarProduto(produto.id, {
        nome,
        descricao: descricao || undefined,
        codigo: codigo || undefined,
        codigoBarras: codigoBarras || undefined,
        ncm: ncm || undefined,
        precoCusto: precoCusto ? Number(precoCusto) : undefined,
        precoVenda: Number(precoVenda),
        estoqueMinimo: estoqueMinimo ? Number(estoqueMinimo) : undefined,
        estoqueMaximo: estoqueMaximo ? Number(estoqueMaximo) : undefined,
        peso: peso ? Number(peso) : undefined,
        altura: altura ? Number(altura) : undefined,
        largura: largura ? Number(largura) : undefined,
        comprimento: comprimento ? Number(comprimento) : undefined,
        categoriaId: categoriaId || undefined,
        marcaId: marcaId || undefined,
        unidadeMedidaId: unidadeMedidaId || undefined,
      });

      toast.success("Produto atualizado com sucesso!");
      setAberto(false);

      queryClient.invalidateQueries({
        queryKey: estoqueQueryKeys.produtos(empresaEfetivaId),
      });
      queryClient.invalidateQueries({
        queryKey: estoqueQueryKeys.produtosDetalhes(empresaEfetivaId),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao atualizar produto"));
    } finally {
      setSalvando(false);
    }
  }

  if (!podeEditar || !empresaEfetivaId || carregando) return null;

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button className="shrink-0" variant="outline" size="sm">
          <Pencil aria-hidden="true" />
          Editar
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar produto</DialogTitle>
        </DialogHeader>

        <div className="min-w-0 space-y-5">
          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Nome *
              </label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Código interno
              </label>
              <Input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Descrição
            </label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Código de barras
              </label>
              <Input
                value={codigoBarras}
                onChange={(e) => setCodigoBarras(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">NCM</label>
              <Input value={ncm} onChange={(e) => setNcm(e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Unidade
              </label>
              <select
                value={unidadeMedidaId}
                onChange={(e) => setUnidadeMedidaId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Selecionar unidade</option>
                {unidadesResponse?.data.map((unidade) => (
                  <option key={unidade.id} value={unidade.id}>
                    {unidade.sigla} - {unidade.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Categoria
              </label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Sem categoria</option>
                {categoriasResponse?.data.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Marca
              </label>
              <select
                value={marcaId}
                onChange={(e) => setMarcaId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Sem marca</option>
                {marcasResponse?.data.map((marca) => (
                  <option key={marca.id} value={marca.id}>
                    {marca.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Preço de custo
              </label>
              <Input
                type="number"
                step="0.01"
                value={precoCusto}
                onChange={(e) => setPrecoCusto(e.target.value)}
              />
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Preço de venda *
              </label>
              <Input
                type="number"
                step="0.01"
                value={precoVenda}
                onChange={(e) => setPrecoVenda(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Estoque mínimo
              </label>
              <Input
                type="number"
                step="0.01"
                value={estoqueMinimo}
                onChange={(e) => setEstoqueMinimo(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Estoque máximo
              </label>
              <Input
                type="number"
                step="0.01"
                value={estoqueMaximo}
                onChange={(e) => setEstoqueMaximo(e.target.value)}
              />
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Peso</label>
              <Input
                type="number"
                step="0.01"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Altura
              </label>
              <Input
                type="number"
                step="0.01"
                value={altura}
                onChange={(e) => setAltura(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Largura
              </label>
              <Input
                type="number"
                step="0.01"
                value={largura}
                onChange={(e) => setLargura(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Comprimento
              </label>
              <Input
                type="number"
                step="0.01"
                value={comprimento}
                onChange={(e) => setComprimento(e.target.value)}
              />
            </div>
          </div>

          <div className="sticky -bottom-4 -mx-4 flex flex-col-reverse gap-2 border-t bg-white p-4 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setAberto(false)}
              disabled={salvando}
            >
              Cancelar
            </Button>

            <Button onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
