"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { USUARIOS_PERFIS_GERENCIAR } from "@/lib/auth";
import { usuariosQueryKeys } from "@/lib/usuarios-query-keys";
import {
  atualizarPerfisUsuario,
  listarPerfisUsuario,
  type Usuario,
} from "@/services/usuarios.service";
import { Button } from "@/components/ui/button";
import { SeletorPerfisUsuario } from "./SeletorPerfisUsuario";
import { mensagemErroPerfis } from "./perfis-erro";

export function PerfisUsuarioEditor({
  usuario,
  disabled,
}: {
  usuario: Usuario;
  disabled?: boolean;
}) {
  const { temPermissao } = useAuth();
  const { empresaEfetivaId } = useEmpresaSelecionada();
  if (
    !temPermissao(USUARIOS_PERFIS_GERENCIAR) ||
    !["ADMIN_EMPRESA", "USUARIO_EMPRESA"].includes(usuario.tipo)
  )
    return null;
  if (!empresaEfetivaId || empresaEfetivaId !== usuario.empresaId)
    return (
      <p className="text-sm text-slate-600">
        Selecione a empresa deste usuário para administrar seus perfis de
        acesso.
      </p>
    );
  return (
    <Editor
      key={`${empresaEfetivaId}:${usuario.id}`}
      empresaId={empresaEfetivaId}
      usuario={usuario}
      disabled={disabled}
    />
  );
}

function Editor({
  empresaId,
  usuario,
  disabled,
}: {
  empresaId: string;
  usuario: Usuario;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const [rascunho, setRascunho] = useState<string[] | null>(null);
  const [salvando, setSalvando] = useState(false);
  const queryKey = usuariosQueryKeys.perfis(empresaId, usuario.id);
  const consulta = useQuery({
    queryKey,
    queryFn: ({ signal }) => listarPerfisUsuario(usuario.id, signal),
    retry: false,
  });
  const atuais = consulta.data?.map((p) => p.id) ?? [];
  const selecionados = rascunho ?? atuais;
  const mudou =
    selecionados.length !== atuais.length ||
    selecionados.some((id) => !atuais.includes(id));

  async function salvar() {
    setSalvando(true);
    try {
      const perfis = await atualizarPerfisUsuario(usuario.id, selecionados);
      queryClient.setQueryData(queryKey, perfis);
      setRascunho(null);
      toast.success("Perfis de acesso atualizados.");
      await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    } catch (error) {
      setRascunho(null);
      toast.error(mensagemErroPerfis(error));
      await queryClient.invalidateQueries({ queryKey });
    } finally {
      setSalvando(false);
    }
  }

  if (consulta.isPending)
    return (
      <p role="status" className="text-sm">
        Carregando perfis atribuídos...
      </p>
    );
  if (consulta.isError)
    return (
      <div role="alert" className="space-y-2 text-sm text-red-700">
        <p>{mensagemErroPerfis(consulta.error)}</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => void consulta.refetch()}
        >
          Recarregar perfis
        </Button>
      </div>
    );
  return (
    <section className="min-w-0 space-y-3 border-t pt-4">
      <SeletorPerfisUsuario
        empresaId={empresaId}
        value={selecionados}
        onChange={setRascunho}
        atribuidos={consulta.data}
        disabled={disabled || salvando || consulta.isFetching}
      />
      <p className="text-sm text-slate-600">
        Os perfis são salvos separadamente dos dados da conta. Alterar o tipo
        não adiciona nem remove perfis.
      </p>
      <Button
        type="button"
        className="w-full sm:w-auto"
        disabled={disabled || salvando || consulta.isFetching || !mudou}
        onClick={() => void salvar()}
      >
        {salvando ? "Salvando perfis..." : "Salvar perfis de acesso"}
      </Button>
    </section>
  );
}
