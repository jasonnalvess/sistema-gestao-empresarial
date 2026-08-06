"use client";

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
      onOpenChange={setAberto}
      title="Editar usuário"
      trigger={
        <Button variant="outline" size="sm">
          <Pencil size={14} className="mr-2" />
          Editar
        </Button>
      }
    >
      <div className="space-y-4">
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
          <label className="text-sm font-medium text-slate-700">Perfil</label>

          <select
            value={tipo}
            onChange={(e) =>
              setTipo(
                e.target.value as
                  | "SUPER_ADMIN"
                  | "ADMIN_EMPRESA"
                  | "USUARIO_EMPRESA"
              )
            }
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="USUARIO_EMPRESA">Usuário Empresa</option>
            <option value="ADMIN_EMPRESA">Admin Empresa</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
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
            {salvando ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
