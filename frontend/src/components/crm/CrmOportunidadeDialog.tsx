"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";

import { CrudPagination } from "@/components/crud/CrudPagination";
import { FormDialog } from "@/components/forms/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { obterMensagemErro } from "@/lib/api-error";
import { crmQueryKeys } from "@/lib/crm-query-keys";
import { listarClientes } from "@/services/clientes.service";
import {
  atualizarCrmOportunidade,
  criarCrmOportunidade,
  type CrmEtapa,
  type CrmOportunidade,
  type CrmResponsavel,
} from "@/services/crm.service";

type Props = {
  empresaId: string;
  etapas?: CrmEtapa[];
  responsaveis: CrmResponsavel[];
  oportunidade?: CrmOportunidade;
  onConflict?: () => Promise<void> | void;
};

const selectClassName =
  "min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100";

const LIMITE_CLIENTES = 20;

export function CrmOportunidadeDialog({
  empresaId,
  etapas = [],
  responsaveis,
  oportunidade,
  onConflict,
}: Props) {
  const queryClient = useQueryClient();
  const tituloId = useId();
  const clienteInputId = useId();
  const etapaInputId = useId();
  const responsavelInputId = useId();
  const descricaoId = useId();
  const valorId = useId();
  const previsaoId = useId();
  const edicao = Boolean(oportunidade);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [titulo, setTitulo] = useState(oportunidade?.titulo ?? "");
  const [clienteId, setClienteId] = useState(oportunidade?.clienteId ?? "");
  const [etapaId, setEtapaId] = useState(oportunidade?.etapaId ?? "");
  const [responsavelId, setResponsavelId] = useState(
    oportunidade?.responsavelId ?? "",
  );
  const [descricao, setDescricao] = useState(oportunidade?.descricao ?? "");
  const [valorEstimado, setValorEstimado] = useState(
    oportunidade?.valorEstimado ?? "",
  );
  const [previsaoFechamento, setPrevisaoFechamento] = useState(
    oportunidade?.previsaoFechamento?.slice(0, 10) ?? "",
  );
  const [buscaCliente, setBuscaCliente] = useState("");
  const [buscaClienteAplicada, setBuscaClienteAplicada] = useState("");
  const [paginaClientes, setPaginaClientes] = useState(1);
  const [clienteSelecionado, setClienteSelecionado] = useState<{
    id: string;
    nome: string;
  } | null>(null);
  const empresaAtualRef = useRef(empresaId);
  const etapasIniciais = etapas.filter(
    (etapa) => etapa.ativo && etapa.tipo === "ABERTA",
  );

  useLayoutEffect(() => {
    if (empresaAtualRef.current === empresaId) return;

    empresaAtualRef.current = empresaId;
    setAberto(false);
    setSalvando(false);
    setTitulo("");
    setClienteId("");
    setEtapaId("");
    setResponsavelId("");
    setDescricao("");
    setValorEstimado("");
    setPrevisaoFechamento("");
    setBuscaCliente("");
    setBuscaClienteAplicada("");
    setPaginaClientes(1);
    setClienteSelecionado(null);
  }, [empresaId]);
  const clientesQuery = useQuery({
    queryKey: [
      ...crmQueryKeys.raiz(empresaId),
      "clientes",
      "select",
      buscaClienteAplicada,
      paginaClientes,
    ],
    queryFn: () =>
      listarClientes({
        ativo: "true",
        search: buscaClienteAplicada || undefined,
        page: paginaClientes,
        limit: LIMITE_CLIENTES,
      }),
    enabled: aberto && !edicao && Boolean(empresaId),
  });
  const clientes = clientesQuery.data?.data ?? [];
  const clienteSelecionadoNaPagina = clientes.some(
    (cliente) => cliente.id === clienteId,
  );

  function redefinirFormulario() {
    setTitulo(oportunidade?.titulo ?? "");
    setClienteId(oportunidade?.clienteId ?? "");
    setEtapaId(oportunidade?.etapaId ?? "");
    setResponsavelId(oportunidade?.responsavelId ?? "");
    setDescricao(oportunidade?.descricao ?? "");
    setValorEstimado(oportunidade?.valorEstimado ?? "");
    setPrevisaoFechamento(oportunidade?.previsaoFechamento?.slice(0, 10) ?? "");
    setBuscaCliente("");
    setBuscaClienteAplicada("");
    setPaginaClientes(1);
    setClienteSelecionado(null);
  }

  function aoMudarAbertura(novoAberto: boolean) {
    if (novoAberto) redefinirFormulario();
    setAberto(novoAberto);
  }

  async function salvar() {
    const empresaDaOperacao = empresaId;
    const valor = valorEstimado ? Number(valorEstimado) : undefined;
    if (
      !titulo.trim() ||
      !responsavelId ||
      (!edicao && (!clienteId || !etapaId)) ||
      (valor !== undefined && (!Number.isFinite(valor) || valor < 0))
    ) {
      toast.error("Preencha os campos obrigatórios com valores válidos.");
      return;
    }

    try {
      setSalvando(true);
      if (oportunidade) {
        await atualizarCrmOportunidade(oportunidade.id, {
          titulo: titulo.trim(),
          descricao: descricao || null,
          valorEstimado: valor,
          previsaoFechamento: previsaoFechamento || undefined,
          responsavelId,
          versaoRegistro: oportunidade.versaoRegistro,
        });
      } else {
        await criarCrmOportunidade({
          titulo: titulo.trim(),
          clienteId,
          etapaId,
          responsavelId,
          descricao: descricao || undefined,
          valorEstimado: valor,
          previsaoFechamento: previsaoFechamento || undefined,
        });
      }
      await queryClient.invalidateQueries({
        queryKey: crmQueryKeys.oportunidades(empresaDaOperacao),
      });
      if (empresaAtualRef.current !== empresaDaOperacao) return;

      toast.success(
        edicao
          ? "Oportunidade atualizada com sucesso!"
          : "Oportunidade criada com sucesso!",
      );
      setAberto(false);
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 409) {
        if (empresaAtualRef.current !== empresaDaOperacao) return;

        toast.error(
          "Esta oportunidade foi alterada por outro usuário. Os dados foram atualizados; revise antes de editar novamente.",
        );
        redefinirFormulario();
        setAberto(false);
        await onConflict?.();
      } else if (empresaAtualRef.current === empresaDaOperacao) {
        toast.error(
          obterMensagemErro(error, "Não foi possível salvar a oportunidade."),
        );
      }
    } finally {
      if (empresaAtualRef.current === empresaDaOperacao) setSalvando(false);
    }
  }

  return (
    <FormDialog
      open={aberto}
      onOpenChange={aoMudarAbertura}
      title={edicao ? "Editar oportunidade" : "Nova oportunidade"}
      trigger={
        <Button variant={edicao ? "outline" : "default"} disabled={salvando}>
          {edicao ? <Pencil aria-hidden="true" /> : <Plus aria-hidden="true" />}
          {edicao ? "Editar" : "Nova oportunidade"}
        </Button>
      }
      contentClassName="max-w-2xl"
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor={tituloId}
            className="text-sm font-medium text-slate-700"
          >
            Título *
          </label>
          <Input
            id={tituloId}
            value={titulo}
            disabled={salvando}
            onChange={(event) => setTitulo(event.target.value)}
          />
        </div>
        {!edicao && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor={clienteInputId}
                className="text-sm font-medium text-slate-700"
              >
                Cliente *
              </label>
              <form
                className="flex gap-2"
                role="search"
                onSubmit={(event) => {
                  event.preventDefault();
                  setPaginaClientes(1);
                  setBuscaClienteAplicada(buscaCliente.trim());
                }}
              >
                <Input
                  aria-label="Buscar cliente"
                  value={buscaCliente}
                  disabled={salvando}
                  onChange={(event) => setBuscaCliente(event.target.value)}
                  placeholder="Buscar cliente"
                />
                <Button
                  type="submit"
                  variant="outline"
                  size="icon"
                  disabled={salvando}
                  aria-label="Pesquisar cliente"
                >
                  <Search aria-hidden="true" />
                </Button>
                {buscaClienteAplicada && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={salvando}
                    aria-label="Limpar busca de clientes"
                    onClick={() => {
                      setBuscaCliente("");
                      setBuscaClienteAplicada("");
                      setPaginaClientes(1);
                    }}
                  >
                    <X aria-hidden="true" />
                  </Button>
                )}
              </form>
              <select
                id={clienteInputId}
                className={selectClassName}
                value={clienteId}
                disabled={salvando || clientesQuery.isLoading}
                onChange={(event) => {
                  const novoClienteId = event.target.value;
                  const cliente = clientes.find(
                    (item) => item.id === novoClienteId,
                  );
                  setClienteId(novoClienteId);
                  setClienteSelecionado(
                    cliente ? { id: cliente.id, nome: cliente.nome } : null,
                  );
                }}
              >
                <option value="">Selecionar cliente</option>
                {clienteId && !clienteSelecionadoNaPagina && (
                  <option value={clienteId}>
                    {clienteSelecionado?.nome ?? "Cliente selecionado"}
                  </option>
                )}
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
              {clientesQuery.isLoading && (
                <p className="text-xs text-slate-500">Carregando clientes...</p>
              )}
              {clientesQuery.error && (
                <p role="alert" className="text-xs text-red-600">
                  Não foi possível carregar os clientes.
                </p>
              )}
              {!clientesQuery.isLoading &&
                !clientesQuery.error &&
                clientesQuery.data &&
                !clientes.length && (
                  <p className="text-xs text-slate-500">
                    Nenhum cliente ativo encontrado para esta busca.
                  </p>
                )}
              {clientesQuery.data && clientesQuery.data.meta.totalPages > 1 && (
                <CrudPagination
                  page={clientesQuery.data.meta.page}
                  totalPages={clientesQuery.data.meta.totalPages}
                  onPageChange={setPaginaClientes}
                />
              )}
            </div>
            <div>
              <label
                htmlFor={etapaInputId}
                className="text-sm font-medium text-slate-700"
              >
                Etapa inicial *
              </label>
              <select
                id={etapaInputId}
                className={selectClassName}
                value={etapaId}
                disabled={salvando}
                onChange={(event) => setEtapaId(event.target.value)}
              >
                <option value="">Selecionar etapa</option>
                {etapasIniciais.map((etapa) => (
                  <option key={etapa.id} value={etapa.id}>
                    {etapa.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor={responsavelInputId}
              className="text-sm font-medium text-slate-700"
            >
              Responsável *
            </label>
            <select
              id={responsavelInputId}
              className={selectClassName}
              value={responsavelId}
              disabled={salvando}
              onChange={(event) => setResponsavelId(event.target.value)}
            >
              <option value="">Selecionar responsável</option>
              {responsaveis.map((responsavel) => (
                <option key={responsavel.id} value={responsavel.id}>
                  {responsavel.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor={valorId}
              className="text-sm font-medium text-slate-700"
            >
              Valor estimado
            </label>
            <Input
              id={valorId}
              type="number"
              min="0"
              step="0.01"
              value={valorEstimado}
              disabled={salvando}
              onChange={(event) => setValorEstimado(event.target.value)}
            />
          </div>
        </div>
        <div>
          <label
            htmlFor={previsaoId}
            className="text-sm font-medium text-slate-700"
          >
            Previsão de fechamento
          </label>
          <Input
            id={previsaoId}
            type="date"
            value={previsaoFechamento}
            disabled={salvando}
            onChange={(event) => setPrevisaoFechamento(event.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor={descricaoId}
            className="text-sm font-medium text-slate-700"
          >
            Descrição
          </label>
          <Textarea
            id={descricaoId}
            value={descricao}
            disabled={salvando}
            onChange={(event) => setDescricao(event.target.value)}
          />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            disabled={salvando}
            onClick={() => setAberto(false)}
          >
            Cancelar
          </Button>
          <Button
            disabled={
              salvando ||
              !titulo.trim() ||
              !responsavelId ||
              (!edicao && (!clienteId || !etapaId))
            }
            onClick={salvar}
          >
            {salvando
              ? "Salvando..."
              : edicao
                ? "Salvar alterações"
                : "Criar oportunidade"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
