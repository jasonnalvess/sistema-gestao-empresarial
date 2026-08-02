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

import { criarProduto } from "@/services/produtos.service";
import { listarCategorias } from "@/services/categorias.service";
import { listarMarcasProdutos } from "@/services/marcas-produtos.service";
import { listarUnidadesMedida } from "@/services/unidades-medida.service";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_CATEGORIAS_VISUALIZAR, PERMISSAO_MARCAS_VISUALIZAR, PERMISSAO_PRODUTOS_CRIAR, PERMISSAO_UNIDADES_VISUALIZAR } from "@/lib/auth";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import { obterMensagemErro } from "@/lib/api-error";

export function NovoProdutoModal() {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeCriar = temPermissao(PERMISSAO_PRODUTOS_CRIAR);

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [codigo, setCodigo] = useState("");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [ncm, setNcm] = useState("");
  const [precoCusto, setPrecoCusto] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");
  const [estoqueMinimo, setEstoqueMinimo] = useState("");
  const [estoqueMaximo, setEstoqueMaximo] = useState("");
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [largura, setLargura] = useState("");
  const [comprimento, setComprimento] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [marcaId, setMarcaId] = useState("");
  const [unidadeMedidaId, setUnidadeMedidaId] = useState("");

  const { data: categoriasResponse } = useQuery({
    queryKey: estoqueQueryKeys.categoriasSelect(empresaEfetivaId ?? ""),
    queryFn: () =>
      listarCategorias({
        page: 1,
        limit: 100,
        sortBy: "nome",
        order: "asc",
      }),
    enabled: aberto && podeCriar && temPermissao(PERMISSAO_CATEGORIAS_VISUALIZAR) && Boolean(empresaEfetivaId) && !carregando,
  });

  const { data: marcasResponse } = useQuery({
    queryKey: estoqueQueryKeys.marcasSelect(empresaEfetivaId ?? ""),
    queryFn: () =>
      listarMarcasProdutos({
        page: 1,
        limit: 100,
      }),
    enabled: aberto && podeCriar && temPermissao(PERMISSAO_MARCAS_VISUALIZAR) && Boolean(empresaEfetivaId) && !carregando,
  });

  const { data: unidadesResponse } = useQuery({
    queryKey: estoqueQueryKeys.unidadesSelect(empresaEfetivaId ?? ""),
    queryFn: () =>
      listarUnidadesMedida({
        page: 1,
        limit: 100,
      }),
    enabled: aberto && podeCriar && temPermissao(PERMISSAO_UNIDADES_VISUALIZAR) && Boolean(empresaEfetivaId) && !carregando,
  });

  function limparCampos() {
    setNome("");
    setDescricao("");
    setCodigo("");
    setCodigoBarras("");
    setNcm("");
    setPrecoCusto("");
    setPrecoVenda("");
    setEstoqueMinimo("");
    setEstoqueMaximo("");
    setPeso("");
    setAltura("");
    setLargura("");
    setComprimento("");
    setCategoriaId("");
    setMarcaId("");
    setUnidadeMedidaId("");
  }

  async function salvar() {
    if (!podeCriar || !empresaEfetivaId || carregando) return;
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

      await criarProduto({
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

      toast.success("Produto cadastrado com sucesso!");

      limparCampos();
      setAberto(false);

      queryClient.invalidateQueries({
        queryKey: estoqueQueryKeys.produtos(empresaEfetivaId),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao cadastrar produto"));
    } finally {
      setSalvando(false);
    }
  }

  if (!podeCriar || !empresaEfetivaId || carregando) return null;

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button>
          <Plus size={16} className="mr-2" />
          Novo produto
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo produto</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
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

          <div className="grid gap-4 md:grid-cols-3">
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

          <div className="grid gap-4 md:grid-cols-3">
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

          <div className="grid gap-4 md:grid-cols-3">
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

          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Peso
              </label>
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

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setAberto(false)}
              disabled={salvando}
            >
              Cancelar
            </Button>

            <Button onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar produto"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
