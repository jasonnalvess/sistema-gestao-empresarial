"use client";
import { rhDialogClass } from "./rh-rotulos";
import {
  PERMISSAO_FUNCIONARIOS_CRIAR,
  PERMISSAO_FUNCIONARIOS_EDITAR,
} from "@/lib/auth";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FormDialog } from "@/components/forms/FormDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  criarFuncionario,
  editarFuncionario,
  type Funcionario,
  type DadosProfissionais,
  type TipoVinculo,
} from "@/services/funcionarios.service";
import { RhSeletor } from "./RhSeletor";
import { useRhOperation } from "./RhShared";
import { selectClass, vinculoRotulos } from "./rh-rotulos";
export function FuncionarioForm({
  empresa,
  funcionario,
}: {
  empresa: string;
  funcionario?: Funcionario;
}) {
  const { temPermissao } = useAuth();
  const [open, setOpen] = useState(false);
  if (
    !temPermissao(
      funcionario
        ? PERMISSAO_FUNCIONARIOS_EDITAR
        : PERMISSAO_FUNCIONARIOS_CRIAR,
    )
  )
    return null;
  return (
    <FormDialog
      contentClassName={rhDialogClass}
      open={open}
      onOpenChange={setOpen}
      title={funcionario ? "Editar dados profissionais" : "Novo funcionário"}
      trigger={
        <Button variant={funcionario ? "outline" : "default"}>
          {funcionario ? "Editar dados profissionais" : "Novo funcionário"}
        </Button>
      }
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
  funcionario: f,
  fechar,
}: {
  empresa: string;
  funcionario?: Funcionario;
  fechar: () => void;
}) {
  const router = useRouter();
  const { pending, executar } = useRhOperation(empresa);
  const [versao] = useState(f?.versaoRegistro);
  const [original] = useState(f);
  const [cargoId, setCargo] = useState(f?.cargoId ?? "");
  const [departamentoId, setDepartamento] = useState(f?.departamentoId ?? "");
  const [gestorId, setGestor] = useState(f?.gestorId ?? "");
  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    const texto = (chave: string) => String(dados.get(chave) ?? "").trim();
    const body: DadosProfissionais = {
      nome: texto("nome"),
      nomePreferido: texto("nomePreferido") || null,
      matricula: texto("matricula"),
      dataAdmissao: texto("dataAdmissao"),
      tipoVinculo: texto("tipoVinculo") as TipoVinculo,
      emailCorporativo: texto("emailCorporativo") || null,
      telefoneCorporativo: texto("telefoneCorporativo") || null,
    };
    // Preservar referências antigas inativas sem reenviá-las como nova associação.
    if (!original || cargoId !== (original.cargoId ?? ""))
      body.cargoId = cargoId || null;
    if (!original || departamentoId !== (original.departamentoId ?? ""))
      body.departamentoId = departamentoId || null;
    if (!original || gestorId !== (original.gestorId ?? ""))
      body.gestorId = gestorId || null;
    await executar(
      () =>
        original
          ? editarFuncionario(original.id, { ...body, versaoRegistro: versao! })
          : criarFuncionario(body),
      (criado) => {
        fechar();
        if (!original) router.push(`/funcionarios/${criado.id}`);
      },
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
        className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2"
      >
        <label className="block min-w-0 space-y-1 md:col-span-2">
          Nome
          <Input
            name="nome"
            defaultValue={original?.nome}
            required
            minLength={1}
          />
        </label>
        <label className="block min-w-0 space-y-1">
          Nome preferido
          <Input
            name="nomePreferido"
            defaultValue={original?.nomePreferido ?? ""}
          />
        </label>
        <label className="block min-w-0 space-y-1">
          Matrícula
          <Input name="matricula" defaultValue={original?.matricula} required />
        </label>
        <label className="block min-w-0 space-y-1">
          Admissão
          <Input
            name="dataAdmissao"
            type="date"
            defaultValue={original?.dataAdmissao.slice(0, 10)}
            required
          />
        </label>
        <label className="block min-w-0 space-y-1">
          Vínculo
          <select
            name="tipoVinculo"
            className={selectClass}
            defaultValue={original?.tipoVinculo ?? "CLT"}
          >
            {Object.entries(vinculoRotulos).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-0 space-y-1">
          E-mail corporativo
          <Input
            name="emailCorporativo"
            type="email"
            defaultValue={original?.emailCorporativo ?? ""}
          />
        </label>
        <label className="block min-w-0 space-y-1">
          Telefone corporativo
          <Input
            name="telefoneCorporativo"
            type="tel"
            defaultValue={original?.telefoneCorporativo ?? ""}
          />
        </label>
        <div className="min-w-0 md:col-span-2">
          <RhSeletor
            empresa={empresa}
            tipo="cargos"
            label="Cargo"
            value={cargoId}
            onChange={setCargo}
            atual={original?.cargo}
          />
        </div>
        <div className="min-w-0 md:col-span-2">
          <RhSeletor
            empresa={empresa}
            tipo="departamentos"
            label="Departamento"
            value={departamentoId}
            onChange={setDepartamento}
            atual={original?.departamento}
          />
        </div>
        <div className="min-w-0 md:col-span-2">
          <RhSeletor
            empresa={empresa}
            tipo="gestores"
            label="Gestor"
            value={gestorId}
            onChange={setGestor}
            atual={original?.gestor}
            excluirId={original?.id}
          />
        </div>
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
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
