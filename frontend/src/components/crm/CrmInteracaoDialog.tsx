"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { FormDialog } from "@/components/forms/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { obterMensagemErro } from "@/lib/api-error";
import { crmQueryKeys } from "@/lib/crm-query-keys";
import {
  atualizarClienteInteracao,
  criarClienteInteracao,
  type ClienteInteracao,
  type CrmResponsavel,
  type TipoInteracaoCRM,
} from "@/services/crm.service";

type Props = {
  empresaId: string;
  clienteId: string;
  oportunidadeId: string;
  responsaveis: CrmResponsavel[];
  interacao?: ClienteInteracao;
};

const tiposInteracao: Array<{ valor: TipoInteracaoCRM; rotulo: string }> = [
  { valor: "LIGACAO", rotulo: "Ligação" },
  { valor: "EMAIL", rotulo: "E-mail" },
  { valor: "MENSAGEM", rotulo: "Mensagem" },
  { valor: "REUNIAO", rotulo: "Reunião" },
  { valor: "VISITA", rotulo: "Visita" },
  { valor: "NOTA", rotulo: "Nota" },
  { valor: "OUTRO", rotulo: "Outro" },
];

const selectClassName =
  "min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100";

function paraInputDataHora(valor?: string) {
  const data = valor ? new Date(valor) : new Date();
  if (Number.isNaN(data.getTime())) return "";

  const ajustar = (numero: number) => String(numero).padStart(2, "0");
  return `${data.getFullYear()}-${ajustar(data.getMonth() + 1)}-${ajustar(
    data.getDate(),
  )}T${ajustar(data.getHours())}:${ajustar(data.getMinutes())}`;
}

export function CrmInteracaoDialog({
  empresaId,
  clienteId,
  oportunidadeId,
  responsaveis,
  interacao,
}: Props) {
  const queryClient = useQueryClient();
  const tipoId = useId();
  const responsavelId = useId();
  const assuntoId = useId();
  const descricaoId = useId();
  const dataHoraId = useId();
  const edicao = Boolean(interacao);
  const origemRef = useRef(`${empresaId}:${oportunidadeId}`);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [tipo, setTipo] = useState<TipoInteracaoCRM>(
    interacao?.tipo ?? "LIGACAO",
  );
  const [responsavelSelecionadoId, setResponsavelSelecionadoId] = useState(
    interacao?.responsavelId ?? "",
  );
  const [assunto, setAssunto] = useState(interacao?.assunto ?? "");
  const [descricao, setDescricao] = useState(interacao?.descricao ?? "");
  const [dataHora, setDataHora] = useState(
    paraInputDataHora(interacao?.dataHora),
  );

  function redefinirFormulario() {
    setTipo(interacao?.tipo ?? "LIGACAO");
    setResponsavelSelecionadoId(interacao?.responsavelId ?? "");
    setAssunto(interacao?.assunto ?? "");
    setDescricao(interacao?.descricao ?? "");
    setDataHora(paraInputDataHora(interacao?.dataHora));
  }

  function fecharDialogo() {
    setAberto(false);
    redefinirFormulario();
  }

  useLayoutEffect(() => {
    const origem = `${empresaId}:${oportunidadeId}`;
    if (origemRef.current === origem) return;

    origemRef.current = origem;
    setAberto(false);
    setSalvando(false);
    setTipo(interacao?.tipo ?? "LIGACAO");
    setResponsavelSelecionadoId(interacao?.responsavelId ?? "");
    setAssunto(interacao?.assunto ?? "");
    setDescricao(interacao?.descricao ?? "");
    setDataHora(paraInputDataHora(interacao?.dataHora));
  }, [empresaId, oportunidadeId, interacao]);

  async function salvar() {
    if (!responsavelSelecionadoId || !descricao.trim() || !dataHora) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }

    const dataHoraNormalizada = new Date(dataHora);
    if (Number.isNaN(dataHoraNormalizada.getTime())) {
      toast.error("Informe uma data e hora válidas.");
      return;
    }

    const empresaDaOperacao = empresaId;
    const oportunidadeDaOperacao = oportunidadeId;
    try {
      setSalvando(true);
      if (interacao) {
        await atualizarClienteInteracao(interacao.id, {
          responsavelId: responsavelSelecionadoId,
          tipo,
          assunto: assunto.trim() || null,
          descricao: descricao.trim(),
          dataHora: dataHoraNormalizada.toISOString(),
          versaoRegistro: interacao.versaoRegistro,
        });
      } else {
        await criarClienteInteracao({
          clienteId,
          oportunidadeId,
          responsavelId: responsavelSelecionadoId,
          tipo,
          assunto: assunto.trim() || undefined,
          descricao: descricao.trim(),
          dataHora: dataHoraNormalizada.toISOString(),
        });
      }

      await queryClient.invalidateQueries({
        queryKey: crmQueryKeys.interacoes(empresaDaOperacao),
      });
      if (
        origemRef.current !== `${empresaDaOperacao}:${oportunidadeDaOperacao}`
      )
        return;

      toast.success(
        edicao
          ? "Interação atualizada com sucesso!"
          : "Interação registrada com sucesso!",
      );
      fecharDialogo();
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 409) {
        if (
          origemRef.current !== `${empresaDaOperacao}:${oportunidadeDaOperacao}`
        )
          return;

        toast.error(
          "Esta interação foi alterada por outro usuário. Os dados foram atualizados; revise antes de editar novamente.",
        );
        fecharDialogo();
        await queryClient.invalidateQueries({
          queryKey: crmQueryKeys.interacoes(empresaDaOperacao),
        });
      } else if (
        origemRef.current === `${empresaDaOperacao}:${oportunidadeDaOperacao}`
      ) {
        toast.error(
          obterMensagemErro(error, "Não foi possível salvar a interação."),
        );
      }
    } finally {
      if (
        origemRef.current === `${empresaDaOperacao}:${oportunidadeDaOperacao}`
      ) {
        setSalvando(false);
      }
    }
  }

  return (
    <FormDialog
      open={aberto}
      onOpenChange={(novoAberto) => {
        if (novoAberto) redefinirFormulario();
        if (!novoAberto && salvando) return;
        setAberto(novoAberto);
        if (!novoAberto) redefinirFormulario();
      }}
      title={edicao ? "Editar interação" : "Registrar interação"}
      trigger={
        <Button
          type="button"
          variant={edicao ? "outline" : "default"}
          size={edicao ? "sm" : "default"}
        >
          {edicao ? <Pencil aria-hidden="true" /> : <Plus aria-hidden="true" />}
          {edicao ? "Editar" : "Registrar interação"}
        </Button>
      }
      contentClassName="max-w-xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor={tipoId}
              className="text-sm font-medium text-slate-700"
            >
              Tipo *
            </label>
            <select
              id={tipoId}
              className={selectClassName}
              value={tipo}
              disabled={salvando}
              onChange={(event) =>
                setTipo(event.target.value as TipoInteracaoCRM)
              }
            >
              {tiposInteracao.map((item) => (
                <option key={item.valor} value={item.valor}>
                  {item.rotulo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor={responsavelId}
              className="text-sm font-medium text-slate-700"
            >
              Responsável *
            </label>
            <select
              id={responsavelId}
              className={selectClassName}
              value={responsavelSelecionadoId}
              disabled={salvando}
              onChange={(event) =>
                setResponsavelSelecionadoId(event.target.value)
              }
            >
              <option value="">Selecionar responsável</option>
              {responsaveis.map((responsavel) => (
                <option key={responsavel.id} value={responsavel.id}>
                  {responsavel.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label
            htmlFor={dataHoraId}
            className="text-sm font-medium text-slate-700"
          >
            Data e hora *
          </label>
          <Input
            id={dataHoraId}
            type="datetime-local"
            value={dataHora}
            disabled={salvando}
            onChange={(event) => setDataHora(event.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor={assuntoId}
            className="text-sm font-medium text-slate-700"
          >
            Assunto
          </label>
          <Input
            id={assuntoId}
            value={assunto}
            disabled={salvando}
            onChange={(event) => setAssunto(event.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor={descricaoId}
            className="text-sm font-medium text-slate-700"
          >
            Descrição *
          </label>
          <Textarea
            id={descricaoId}
            value={descricao}
            disabled={salvando}
            onChange={(event) => setDescricao(event.target.value)}
          />
        </div>
        {interacao?.agendaEventoId && (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            Esta interação possui vínculo com um evento da Agenda. O vínculo não
            é alterado nesta tela.
          </p>
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
          <Button type="button" disabled={salvando} onClick={salvar}>
            {salvando
              ? "Salvando..."
              : edicao
                ? "Salvar alterações"
                : "Registrar interação"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
