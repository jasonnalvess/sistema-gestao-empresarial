"use client";
import { rhDialogClass } from "./rh-rotulos";
import { PERMISSAO_FUNCIONARIOS_ACESSO_GERENCIAR } from "@/lib/auth";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CrudCard } from "@/components/crud/CrudCard";
import { FormDialog } from "@/components/forms/FormDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  criarAcesso,
  vincularAcesso,
  desvincularAcesso,
  type Funcionario,
} from "@/services/funcionarios.service";
import { RhBadge, useRhOperation } from "./RhShared";
import { RhSeletor } from "./RhSeletor";
import { acessoRotulos } from "./rh-rotulos";
export function AcessoFuncionarioCard({
  empresa,
  funcionario,
}: {
  empresa: string;
  funcionario: Funcionario;
}) {
  const { usuario, temPermissao } = useAuth();
  const gerenciar =
    temPermissao(PERMISSAO_FUNCIONARIOS_ACESSO_GERENCIAR) &&
    ["SUPER_ADMIN", "ADMIN_EMPRESA"].includes(usuario?.tipo ?? "");
  const [modo, setModo] = useState<"criar" | "vincular" | "desvincular" | null>(
    null,
  );
  const restrito = ["INATIVO", "DESLIGADO"].includes(funcionario.status);
  return (
    <CrudCard>
      <div className="min-w-0 space-y-4 [overflow-wrap:anywhere]">
        <h2 className="text-lg font-semibold">Acesso ao sistema</h2>
        <RhBadge ativo={funcionario.estadoAcesso === "USUARIO_ATIVO"}>
          {acessoRotulos[funcionario.estadoAcesso]}
        </RhBadge>
        <p className="text-sm text-slate-600">
          O cadastro do colaborador e sua conta de acesso são independentes. A
          associação sempre deve ser solicitada explicitamente.
        </p>
        {restrito && (
          <p className="text-sm text-amber-800">
            Esta situação permite somente vínculo com uma conta inativa.
          </p>
        )}
        {gerenciar && (
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap [&>button]:w-full sm:[&>button]:w-auto">
            {funcionario.estadoAcesso === "SEM_USUARIO" ? (
              <>
                {!restrito && (
                  <Button
                    disabled={!temPermissao("perfis.visualizar")}
                    onClick={() => setModo("criar")}
                  >
                    Criar acesso
                  </Button>
                )}
                <Button
                  variant="outline"
                  disabled={!temPermissao("usuarios.visualizar")}
                  onClick={() => setModo("vincular")}
                >
                  Vincular usuário existente
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setModo("desvincular")}>
                Desvincular acesso
              </Button>
            )}
          </div>
        )}
        {gerenciar && funcionario.estadoAcesso === "SEM_USUARIO" && (
          <div className="space-y-1 text-sm text-slate-600">
            {!restrito && !temPermissao("perfis.visualizar") && (
              <p>
                A criação exige permissão de consulta de perfis para selecionar
                um perfil.
              </p>
            )}
            {!temPermissao("usuarios.visualizar") && (
              <p>
                O vínculo exige permissão de consulta de usuários para
                selecionar a conta.
              </p>
            )}
          </div>
        )}
        <FormDialog
          contentClassName={rhDialogClass}
          open={modo !== null}
          onOpenChange={(open) => {
            if (!open) setModo(null);
          }}
          title={
            modo === "criar"
              ? "Criar acesso"
              : modo === "vincular"
                ? "Vincular usuário existente"
                : "Desvincular acesso"
          }
          trigger={<span hidden />}
        >
          {modo && gerenciar && (
            <AcessoForm
              empresa={empresa}
              funcionario={funcionario}
              modo={modo}
              fechar={() => setModo(null)}
            />
          )}
        </FormDialog>
      </div>
    </CrudCard>
  );
}
function AcessoForm({
  empresa,
  funcionario,
  modo,
  fechar,
}: {
  empresa: string;
  funcionario: Funcionario;
  modo: "criar" | "vincular" | "desvincular";
  fechar: () => void;
}) {
  const [original] = useState(funcionario);
  const [selecionado, setSelecionado] = useState("");
  const { pending, executar } = useRhOperation(empresa);
  const inativos = ["INATIVO", "DESLIGADO"].includes(original.status);
  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (modo !== "desvincular" && !selecionado) return;
    const form = e.currentTarget;
    const campos = new FormData(form);
    try {
      await executar(
        () =>
          modo === "criar"
            ? criarAcesso(original.id, {
                versaoRegistro: original.versaoRegistro,
                email: String(campos.get("email") ?? "")
                  .trim()
                  .toLowerCase(),
                senhaInicial: String(campos.get("senhaInicial") ?? ""),
                perfilId: selecionado,
              })
            : modo === "desvincular"
              ? desvincularAcesso(original.id, original.versaoRegistro)
              : vincularAcesso(original.id, {
                  versaoRegistro: original.versaoRegistro,
                  usuarioId: selecionado,
                }),
        fechar,
        fechar,
      );
    } finally {
      form.reset();
    }
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
        {modo === "criar" ? (
          <>
            <p className="text-sm text-slate-600">
              O acesso será criado para {original.nome}, com troca obrigatória
              de senha no primeiro login.
            </p>
            <label className="block min-w-0 space-y-1">
              E-mail de acesso
              <Input type="email" name="email" required autoComplete="off" />
            </label>
            <label className="block min-w-0 space-y-1">
              Senha inicial
              <Input
                type="password"
                name="senhaInicial"
                minLength={6}
                required
                autoComplete="new-password"
              />
            </label>
            <RhSeletor
              empresa={empresa}
              tipo="perfis"
              label="Perfil de acesso"
              value={selecionado}
              onChange={setSelecionado}
              required
            />
            <p className="text-xs text-slate-500">
              O servidor valida se você pode delegar as permissões do perfil
              escolhido.
            </p>
          </>
        ) : modo === "desvincular" ? (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            A conta será inativada antes da desvinculação. O usuário e seus
            perfis serão preservados. O funcionário ficará sem acesso associado.
          </p>
        ) : (
          <>
            <RhSeletor
              empresa={empresa}
              tipo="usuarios"
              label="Usuário da empresa"
              value={selecionado}
              onChange={setSelecionado}
              somenteInativos={inativos}
              required
            />
            <p className="text-sm text-slate-600">
              A conta manterá seu nome, e-mail, senha, perfis e situação. Contas
              inativas não serão reativadas. A disponibilidade do vínculo é
              validada ao confirmar.
            </p>
          </>
        )}
        <label className="flex items-start gap-2">
          <input type="checkbox" required className="mt-1 shrink-0" />
          {modo === "desvincular"
            ? "Confirmo a desvinculação e a inativação do acesso."
            : "Confirmo a associação deste acesso ao funcionário."}
        </label>
      </fieldset>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={fechar}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={pending || (modo !== "desvincular" && !selecionado)}
        >
          {pending ? "Salvando..." : "Confirmar"}
        </Button>
      </div>
    </form>
  );
}
