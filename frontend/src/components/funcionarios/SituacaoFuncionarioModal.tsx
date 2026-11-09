"use client";
import { rhDialogClass } from "./rh-rotulos";
import { PERMISSAO_FUNCIONARIOS_SITUACAO_GERENCIAR } from "@/lib/auth";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { FormDialog } from "@/components/forms/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  alterarSituacao,
  type Funcionario,
  type StatusFuncionario,
} from "@/services/funcionarios.service";
import { selectClass, statusRotulos, transicoes } from "./rh-rotulos";
import { useRhOperation } from "./RhShared";
export function SituacaoFuncionarioModal({
  empresa,
  funcionario,
}: {
  empresa: string;
  funcionario: Funcionario;
}) {
  const { temPermissao } = useAuth();
  const [open, setOpen] = useState(false);
  if (
    !temPermissao(PERMISSAO_FUNCIONARIOS_SITUACAO_GERENCIAR) ||
    funcionario.status === "DESLIGADO"
  )
    return null;
  return (
    <FormDialog
      contentClassName={rhDialogClass}
      open={open}
      onOpenChange={setOpen}
      title="Alterar situação"
      trigger={<Button variant="outline">Alterar situação</Button>}
    >
      {open && (
        <Formulario
          empresa={empresa}
          funcionario={funcionario}
          fechar={() => setOpen(false)}
        />
      )}
    </FormDialog>
  );
}
function Formulario({
  empresa,
  funcionario,
  fechar,
}: {
  empresa: string;
  funcionario: Funcionario;
  fechar: () => void;
}) {
  const [original] = useState(funcionario);
  const [status, setStatus] = useState<StatusFuncionario>(
    transicoes[original.status][0],
  );
  const { pending, executar } = useRhOperation(empresa);
  const temporaria = ["FERIAS", "AFASTADO", "LICENCA"].includes(status);
  const escolherAcesso =
    temporaria && original.estadoAcesso === "USUARIO_ATIVO";
  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await executar(
      () =>
        alterarSituacao(original.id, {
          versaoRegistro: original.versaoRegistro,
          status,
          ...(status === "DESLIGADO"
            ? { dataDesligamento: String(form.get("dataDesligamento")) }
            : {}),
          ...(escolherAcesso
            ? {
                acaoAcesso: String(form.get("acaoAcesso")) as
                  | "PRESERVAR"
                  | "SUSPENDER",
              }
            : {}),
        }),
      fechar,
      fechar,
    );
  }
  return (
    <form
      onSubmit={enviar}
      className="min-w-0 space-y-4 [overflow-wrap:anywhere]"
    >
      <fieldset
        disabled={pending}
        className="min-w-0 space-y-4 [overflow-wrap:anywhere]"
      >
        <p>Situação atual: {statusRotulos[original.status]}</p>
        <label className="block min-w-0 space-y-1">
          Nova situação
          <select
            className={selectClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFuncionario)}
          >
            {transicoes[original.status].map((s) => (
              <option key={s} value={s}>
                {statusRotulos[s]}
              </option>
            ))}
          </select>
        </label>
        {escolherAcesso && (
          <label className="block min-w-0 space-y-1">
            Acesso ao sistema
            <select
              name="acaoAcesso"
              className={selectClass}
              required
              defaultValue=""
            >
              <option value="" disabled>
                Escolha uma ação
              </option>
              <option value="PRESERVAR">Preservar acesso ativo</option>
              <option value="SUSPENDER">Suspender acesso</option>
            </select>
          </label>
        )}
        {status === "DESLIGADO" && (
          <label className="block min-w-0 space-y-1">
            Data de desligamento
            <Input
              name="dataDesligamento"
              type="date"
              min={original.dataAdmissao.slice(0, 10)}
              max={new Date().toISOString().slice(0, 10)}
              required
            />
          </label>
        )}
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          {status === "DESLIGADO"
            ? "O desligamento é definitivo nesta versão e inativa o acesso associado."
            : status === "INATIVO"
              ? "O acesso associado será inativado."
              : status === "ATIVO"
                ? "O retorno a Ativo preserva o acesso atual. Não reativa uma conta inativa."
                : "A situação será atualizada conforme a decisão de acesso informada."}
        </p>
        <label className="flex items-start gap-2">
          <input type="checkbox" required className="mt-1 shrink-0" />
          Confirmo a alteração de situação e seus efeitos no acesso.
        </label>
      </fieldset>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">
        <Button
          type="button"
          variant="outline"
          onClick={fechar}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Alterando..." : "Confirmar alteração"}
        </Button>
      </div>
    </form>
  );
}
