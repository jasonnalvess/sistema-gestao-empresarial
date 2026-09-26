"use client";
import { rhDialogClass } from "./rh-rotulos";
import {
  PERMISSAO_FUNCIONARIOS_DADOS_PESSOAIS_VISUALIZAR,
  PERMISSAO_FUNCIONARIOS_DADOS_PESSOAIS_EDITAR,
} from "@/lib/auth";
import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { FormDialog } from "@/components/forms/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buscarDadosPessoais,
  editarDadosPessoais,
  type DadosPessoais,
  type Funcionario,
} from "@/services/funcionarios.service";
import { funcionariosQueryKeys as keys } from "@/lib/funcionarios-query-keys";
import { RhErro, useRhOperation } from "./RhShared";
const campos: {
  chave: keyof DadosPessoais;
  label: string;
  tipo?: string;
  max?: number;
}[] = [
  { chave: "cpf", label: "CPF" },
  { chave: "emailPessoal", label: "E-mail pessoal", tipo: "email" },
  { chave: "telefonePessoal", label: "Telefone pessoal", tipo: "tel" },
  { chave: "cep", label: "CEP" },
  { chave: "logradouro", label: "Logradouro" },
  { chave: "numero", label: "Número" },
  { chave: "complemento", label: "Complemento" },
  { chave: "bairro", label: "Bairro" },
  { chave: "cidade", label: "Cidade" },
  { chave: "uf", label: "UF", max: 2 },
];
export function DadosPessoaisCard({
  empresa,
  funcionario,
}: {
  empresa: string;
  funcionario: Funcionario;
}) {
  const { temPermissao } = useAuth();
  const visualizar = temPermissao(
    PERMISSAO_FUNCIONARIOS_DADOS_PESSOAIS_VISUALIZAR,
  );
  const editar = temPermissao(PERMISSAO_FUNCIONARIOS_DADOS_PESSOAIS_EDITAR);
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: keys.pessoais(empresa, funcionario.id),
    queryFn: ({ signal }) => buscarDadosPessoais(funcionario.id, signal),
    enabled: visualizar,
    gcTime: 0,
  });
  if (!visualizar && !editar) return null;
  return (
    <CrudCard>
      <div className="min-w-0 space-y-4 [overflow-wrap:anywhere]">
        <h2 className="text-lg font-semibold">Dados pessoais</h2>
        {visualizar ? (
          <>
            <RhErro error={query.error} tentar={() => void query.refetch()} />
            {query.isLoading ? (
              <CrudLoading />
            ) : (
              !query.error &&
              query.data && (
                <dl className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3 [&>div]:min-w-0">
                  {campos.map((c) => (
                    <div key={c.chave}>
                      <dt className="text-xs text-slate-500">{c.label}</dt>
                      <dd className="min-w-0 [overflow-wrap:anywhere]">
                        {query.data[c.chave] || "Não informado"}
                      </dd>
                    </div>
                  ))}
                </dl>
              )
            )}
          </>
        ) : (
          <p className="text-sm text-slate-600">
            Você pode atualizar dados pessoais, mas não possui permissão para
            consultar os valores atuais.
          </p>
        )}
        {editar && (!visualizar || (query.data && !query.error)) && (
          <FormDialog
            contentClassName={rhDialogClass}
            open={open}
            onOpenChange={setOpen}
            title="Editar dados pessoais"
            trigger={<Button variant="outline">Editar dados pessoais</Button>}
          >
            {open && (
              <PessoaisForm
                empresa={empresa}
                funcionario={funcionario}
                dados={visualizar ? query.data : undefined}
                fechar={() => setOpen(false)}
              />
            )}
          </FormDialog>
        )}
      </div>
    </CrudCard>
  );
}
function PessoaisForm({
  empresa,
  funcionario,
  dados,
  fechar,
}: {
  empresa: string;
  funcionario: Funcionario;
  dados?: DadosPessoais;
  fechar: () => void;
}) {
  const [versao] = useState(funcionario.versaoRegistro);
  const [original] = useState(dados);
  const { pending, executar } = useRhOperation(empresa);
  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body: Partial<DadosPessoais> & { versaoRegistro: number } = {
      versaoRegistro: versao,
    };
    for (const c of campos) {
      const valor = String(form.get(c.chave) ?? "").trim() || null;
      if (original ? valor !== original[c.chave] : valor !== null)
        body[c.chave] = valor;
    }
    await executar(
      () => editarDadosPessoais(funcionario.id, body),
      fechar,
      fechar,
    );
  }
  return (
    <form
      onSubmit={enviar}
      className="min-w-0 space-y-4 [overflow-wrap:anywhere]"
    >
      {!original && (
        <p className="text-sm text-slate-600">
          Somente os campos preenchidos serão atualizados.
        </p>
      )}
      <fieldset
        disabled={pending}
        className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2"
      >
        {campos.map((c) => (
          <label key={c.chave} className="block min-w-0 space-y-1">
            {c.label}
            <Input
              name={c.chave}
              type={c.tipo ?? "text"}
              maxLength={c.max}
              defaultValue={original?.[c.chave] ?? ""}
              autoComplete="off"
            />
          </label>
        ))}
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
        <Button disabled={pending} type="submit">
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
