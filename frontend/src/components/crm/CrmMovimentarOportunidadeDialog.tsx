"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CrudPagination } from "@/components/crud/CrudPagination";
import { obterMensagemErro } from "@/lib/api-error";
import { crmQueryKeys } from "@/lib/crm-query-keys";
import {
  movimentarCrmOportunidade,
  reabrirCrmOportunidade,
  listarCrmEtapas,
  type CrmOportunidade,
  type TipoEtapaCRM,
} from "@/services/crm.service";

type ModoMovimentacao = "MOVER" | "GANHAR" | "PERDER" | "REABRIR";

type Props = {
  empresaId: string;
  oportunidade: CrmOportunidade;
};

const LIMITE_ETAPAS = 100;

const selectClassName =
  "min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100";

const configuracoes: Record<
  ModoMovimentacao,
  { titulo: string; acao: string; tipoDestino: TipoEtapaCRM }
> = {
  MOVER: {
    titulo: "Mover oportunidade",
    acao: "Confirmar movimentação",
    tipoDestino: "ABERTA",
  },
  GANHAR: {
    titulo: "Marcar como ganha",
    acao: "Confirmar ganho",
    tipoDestino: "GANHA",
  },
  PERDER: {
    titulo: "Marcar como perdida",
    acao: "Confirmar perda",
    tipoDestino: "PERDIDA",
  },
  REABRIR: {
    titulo: "Reabrir oportunidade",
    acao: "Confirmar reabertura",
    tipoDestino: "ABERTA",
  },
};

export function CrmMovimentarOportunidadeDialog({
  empresaId,
  oportunidade,
}: Props) {
  const queryClient = useQueryClient();
  const destinoId = useId();
  const motivoId = useId();
  const empresaAtualRef = useRef(empresaId);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [modo, setModo] = useState<ModoMovimentacao | null>(null);
  const [etapaDestinoId, setEtapaDestinoId] = useState("");
  const [motivoPerda, setMotivoPerda] = useState("");
  const [paginaEtapas, setPaginaEtapas] = useState(1);

  const etapasQuery = useQuery({
    queryKey: crmQueryKeys.listaEtapas(empresaId, {
      page: paginaEtapas,
      limit: LIMITE_ETAPAS,
    }),
    queryFn: () =>
      listarCrmEtapas({ page: paginaEtapas, limit: LIMITE_ETAPAS }),
  });
  const etapas = etapasQuery.data?.data ?? [];
  const totalPaginasEtapas = etapasQuery.data?.meta.totalPages ?? 1;

  function limparFormulario() {
    setModo(null);
    setEtapaDestinoId("");
    setMotivoPerda("");
    setPaginaEtapas(1);
  }

  function fecharDialogo() {
    setAberto(false);
    limparFormulario();
  }

  useLayoutEffect(() => {
    if (empresaAtualRef.current === empresaId) return;

    empresaAtualRef.current = empresaId;
    setAberto(false);
    setSalvando(false);
    limparFormulario();
  }, [empresaId]);

  useEffect(() => {
    const totalPages = etapasQuery.data?.meta.totalPages;
    if (totalPages === undefined) return;

    const paginaValida = Math.max(1, totalPages);
    if (paginaEtapas <= paginaValida) return;

    const empresaDaResposta = empresaId;
    const timeoutId = window.setTimeout(() => {
      if (empresaAtualRef.current !== empresaDaResposta) return;

      setEtapaDestinoId("");
      setPaginaEtapas(paginaValida);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [empresaId, etapasQuery.data?.meta.totalPages, paginaEtapas]);

  const tipoAtual = oportunidade.etapa.tipo;
  const configuracao = modo ? configuracoes[modo] : null;
  const etapasElegiveis = configuracao
    ? etapas.filter(
        (etapa) =>
          etapa.ativo &&
          etapa.tipo === configuracao.tipoDestino &&
          (modo !== "MOVER" || etapa.id !== oportunidade.etapaId),
      )
    : [];
  const etapasAbertasAlternativas = etapas.filter(
    (etapa) =>
      etapa.ativo &&
      etapa.tipo === "ABERTA" &&
      etapa.id !== oportunidade.etapaId,
  );
  const etapasGanhas = etapas.filter(
    (etapa) => etapa.ativo && etapa.tipo === "GANHA",
  );
  const etapasPerdidas = etapas.filter(
    (etapa) => etapa.ativo && etapa.tipo === "PERDIDA",
  );

  function abrir(novoModo: ModoMovimentacao) {
    limparFormulario();
    setModo(novoModo);
    setAberto(true);
  }

  function alterarPaginaEtapas(pagina: number) {
    setEtapaDestinoId("");
    setPaginaEtapas(Math.min(Math.max(pagina, 1), totalPaginasEtapas));
  }

  async function confirmar() {
    if (!modo || !etapaDestinoId) return;

    const motivoNormalizado = motivoPerda.trim();
    if (modo === "PERDER" && !motivoNormalizado) {
      toast.error("Informe o motivo da perda.");
      return;
    }

    const empresaDaOperacao = empresaId;
    try {
      setSalvando(true);
      if (modo === "REABRIR") {
        await reabrirCrmOportunidade(oportunidade.id, {
          etapaId: etapaDestinoId,
          versaoRegistro: oportunidade.versaoRegistro,
        });
      } else {
        await movimentarCrmOportunidade(oportunidade.id, {
          etapaId: etapaDestinoId,
          versaoRegistro: oportunidade.versaoRegistro,
          ...(modo === "PERDER" ? { motivoPerda: motivoNormalizado } : {}),
        });
      }

      await queryClient.invalidateQueries({
        queryKey: crmQueryKeys.oportunidades(empresaDaOperacao),
      });
      if (empresaAtualRef.current !== empresaDaOperacao) return;

      toast.success(
        modo === "MOVER"
          ? "Oportunidade movimentada com sucesso!"
          : modo === "GANHAR"
            ? "Oportunidade marcada como ganha!"
            : modo === "PERDER"
              ? "Oportunidade marcada como perdida!"
              : "Oportunidade reaberta com sucesso!",
      );
      fecharDialogo();
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 409) {
        if (empresaAtualRef.current !== empresaDaOperacao) return;

        toast.error(
          "Esta oportunidade foi alterada por outro usuário. Os dados foram atualizados; inicie a operação novamente.",
        );
        fecharDialogo();
        await queryClient.invalidateQueries({
          queryKey: crmQueryKeys.oportunidades(empresaDaOperacao),
        });
      } else if (empresaAtualRef.current === empresaDaOperacao) {
        toast.error(
          obterMensagemErro(
            error,
            "Não foi possível atualizar a oportunidade.",
          ),
        );
      }
    } finally {
      if (empresaAtualRef.current === empresaDaOperacao) setSalvando(false);
    }
  }

  const podeMover = tipoAtual === "ABERTA";
  const podeReabrir = tipoAtual === "GANHA" || tipoAtual === "PERDIDA";
  const semEtapaElegivelNestaPagina =
    Boolean(configuracao) && !etapasElegiveis.length;
  const haOutrasPaginas = totalPaginasEtapas > 1;
  const podeHaverEtapaElegivel = (quantidade: number) =>
    quantidade > 0 || haOutrasPaginas;
  const carregandoEtapas = etapasQuery.isLoading || etapasQuery.isFetching;

  return (
    <>
      {podeMover && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={
              carregandoEtapas ||
              etapasQuery.isError ||
              !podeHaverEtapaElegivel(etapasAbertasAlternativas.length)
            }
            onClick={() => abrir("MOVER")}
          >
            <ArrowRightLeft aria-hidden="true" />
            Mover oportunidade
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={
              carregandoEtapas ||
              etapasQuery.isError ||
              !podeHaverEtapaElegivel(etapasGanhas.length)
            }
            onClick={() => abrir("GANHAR")}
          >
            <CheckCircle2 aria-hidden="true" />
            Marcar como ganha
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={
              carregandoEtapas ||
              etapasQuery.isError ||
              !podeHaverEtapaElegivel(etapasPerdidas.length)
            }
            onClick={() => abrir("PERDER")}
          >
            <XCircle aria-hidden="true" />
            Marcar como perdida
          </Button>
        </div>
      )}
      {podeReabrir && (
        <Button
          type="button"
          variant="outline"
          disabled={
            carregandoEtapas ||
            etapasQuery.isError ||
            !podeHaverEtapaElegivel(etapasAbertasAlternativas.length)
          }
          onClick={() => abrir("REABRIR")}
        >
          <RotateCcw aria-hidden="true" />
          Reabrir oportunidade
        </Button>
      )}
      {podeMover &&
        !carregandoEtapas &&
        !etapasQuery.isError &&
        !haOutrasPaginas &&
        !etapasAbertasAlternativas.length && (
          <p className="text-sm text-slate-500">
            Não há outra etapa ABERTA ativa para movimentar ou reabrir a
            oportunidade.
          </p>
        )}
      {podeMover &&
        !carregandoEtapas &&
        !etapasQuery.isError &&
        !haOutrasPaginas &&
        !etapasGanhas.length && (
          <p className="text-sm text-slate-500">
            Não há etapa GANHA ativa disponível.
          </p>
        )}
      {podeMover &&
        !carregandoEtapas &&
        !etapasQuery.isError &&
        !haOutrasPaginas &&
        !etapasPerdidas.length && (
          <p className="text-sm text-slate-500">
            Não há etapa PERDIDA ativa disponível.
          </p>
        )}
      {podeReabrir &&
        !carregandoEtapas &&
        !etapasQuery.isError &&
        !haOutrasPaginas &&
        !etapasAbertasAlternativas.length && (
          <p className="text-sm text-slate-500">
            Não há etapa ABERTA ativa disponível para reabrir a oportunidade.
          </p>
        )}
      {etapasQuery.isError && (
        <p className="text-sm text-rose-600">
          Não foi possível carregar as etapas CRM para movimentação.
        </p>
      )}

      <Dialog
        open={aberto}
        onOpenChange={(novoAberto) => {
          if (novoAberto) {
            setAberto(true);
            return;
          }
          if (!salvando) fecharDialogo();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{configuracao?.titulo}</DialogTitle>
          </DialogHeader>
          {configuracao && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Oportunidade: <strong>{oportunidade.titulo}</strong>
              </p>
              <p className="text-sm text-slate-600">
                Etapa atual: <strong>{oportunidade.etapa.nome}</strong>
              </p>
              {modo === "GANHAR" && (
                <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                  A oportunidade será fechada como ganha. Nenhuma venda será
                  criada automaticamente.
                </p>
              )}
              {modo === "PERDER" && (
                <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
                  A oportunidade será fechada como perdida.
                </p>
              )}
              {modo === "REABRIR" && (
                <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                  A oportunidade voltará para uma etapa ABERTA. O vínculo de
                  venda, se existir, será preservado.
                </p>
              )}
              <div>
                <label
                  htmlFor={destinoId}
                  className="text-sm font-medium text-slate-700"
                >
                  Etapa de destino *
                </label>
                <select
                  id={destinoId}
                  className={selectClassName}
                  value={etapaDestinoId}
                  disabled={
                    salvando ||
                    etapasQuery.isLoading ||
                    Boolean(semEtapaElegivelNestaPagina)
                  }
                  onChange={(event) => setEtapaDestinoId(event.target.value)}
                >
                  <option value="">Selecionar etapa</option>
                  {etapasElegiveis.map((etapa) => (
                    <option key={etapa.id} value={etapa.id}>
                      {etapa.nome}
                    </option>
                  ))}
                </select>
                {etapasQuery.isLoading && (
                  <p className="mt-1 text-sm text-slate-500">
                    Carregando etapas elegíveis...
                  </p>
                )}
                {semEtapaElegivelNestaPagina && !etapasQuery.isLoading && (
                  <p className="mt-1 text-sm text-slate-500">
                    {haOutrasPaginas
                      ? "Nenhuma etapa elegível nesta página. Consulte as demais páginas."
                      : "Não há etapa ativa elegível para esta operação."}
                  </p>
                )}
                {totalPaginasEtapas > 1 && (
                  <CrudPagination
                    page={paginaEtapas}
                    totalPages={totalPaginasEtapas}
                    onPageChange={alterarPaginaEtapas}
                  />
                )}
              </div>
              {modo === "PERDER" && (
                <div>
                  <label
                    htmlFor={motivoId}
                    className="text-sm font-medium text-slate-700"
                  >
                    Motivo da perda *
                  </label>
                  <Textarea
                    id={motivoId}
                    value={motivoPerda}
                    disabled={salvando}
                    onChange={(event) => setMotivoPerda(event.target.value)}
                  />
                </div>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={salvando}
                  onClick={fecharDialogo}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={
                    salvando ||
                    !etapaDestinoId ||
                    Boolean(semEtapaElegivelNestaPagina) ||
                    (modo === "PERDER" && !motivoPerda.trim())
                  }
                  onClick={confirmar}
                >
                  {salvando ? "Salvando..." : configuracao.acao}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
