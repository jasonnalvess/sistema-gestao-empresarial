"use client";

import { useAuth } from "@/contexts/AuthContext";
import { PerfisUsuarioEditor } from "./PerfisUsuarioEditor";
import { obterMensagemErro } from "@/lib/api-error";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormDialog } from "@/components/forms/FormDialog";

import { atualizarUsuario, Usuario } from "@/services/usuarios.service";

type Props = {
  usuario: Usuario;
};

export function EditarUsuarioModal({ usuario }: Props) {
  const queryClient = useQueryClient();
  const { usuario: usuarioLogado } = useAuth();

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState(usuario.nome);
  const [email, setEmail] = useState(usuario.email);
  const [tipo, setTipo] = useState<
    "SUPER_ADMIN" | "ADMIN_EMPRESA" | "USUARIO_EMPRESA"
  >(usuario.tipo as "SUPER_ADMIN" | "ADMIN_EMPRESA" | "USUARIO_EMPRESA");

  async function salvar() {
    try {
      setSalvando(true);

      await atualizarUsuario(usuario.id, {
        nome,
        email,
        tipo,
      });

      toast.success("Usuário atualizado com sucesso!");
      setAberto(false);

      queryClient.invalidateQueries({
        queryKey: ["usuarios"],
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao atualizar usuário"));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <FormDialog
      open={aberto}
      onOpenChange={(open) => {
        if (!salvando) setAberto(open);
      }}
      title="Editar usuário"
      contentClassName="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-xl overflow-y-auto"
      trigger={
        <Button variant="outline" size="sm">
          <Pencil size={14} className="mr-2" />
          Editar
        </Button>
      }
    >
      <div className="min-w-0 space-y-4">
        <p className="text-sm text-slate-600">
          Tipo de usuário define o nível estrutural da conta. Perfis definem os
          módulos e ações permitidos.
        </p>
        <div>
          <label className="text-sm font-medium text-slate-700">Nome</label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">E-mail</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Tipo de usuário
          </label>

          <select
            value={tipo}
            onChange={(e) =>
              setTipo(
                e.target.value as
                  | "SUPER_ADMIN"
                  | "ADMIN_EMPRESA"
                  | "USUARIO_EMPRESA",
              )
            }
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="USUARIO_EMPRESA">Usuário Empresa</option>
            <option value="ADMIN_EMPRESA">Admin Empresa</option>
            {usuarioLogado?.tipo === "SUPER_ADMIN" && (
              <option value="SUPER_ADMIN">Super Admin</option>
            )}
          </select>
        </div>

        <div className="sticky bottom-0 flex flex-col-reverse gap-3 bg-white pt-4 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => setAberto(false)}
            disabled={salvando}
          >
            Cancelar
          </Button>

          <Button onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar dados da conta"}
          </Button>
        </div>
        {aberto && tipo !== "SUPER_ADMIN" && (
          <PerfisUsuarioEditor usuario={usuario} disabled={salvando} />
        )}
      </div>
    </FormDialog>
  );
}
