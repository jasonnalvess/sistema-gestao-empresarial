"use client";

import { obterMensagemErro } from "@/lib/api-error";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { criarUsuario } from "@/services/usuarios.service";

export function NovoUsuarioModal() {
  const queryClient = useQueryClient();

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [tipo, setTipo] = useState<"ADMIN_EMPRESA" | "USUARIO_EMPRESA">(
    "USUARIO_EMPRESA"
  );

  async function salvar() {
    try {
      setSalvando(true);

      await criarUsuario({
        nome,
        email,
        senha,
        tipo,
      });

      toast.success("Usuário cadastrado com sucesso!");

      setNome("");
      setEmail("");
      setSenha("");
      setTipo("USUARIO_EMPRESA");
      setAberto(false);

      queryClient.invalidateQueries({
        queryKey: ["usuarios"],
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao cadastrar usuário"));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button>
          <Plus size={16} className="mr-2" />
          Novo usuário
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
        </DialogHeader>

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
            <label className="text-sm font-medium text-slate-700">Senha</label>
            <Input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Perfil</label>

            <select
              value={tipo}
              onChange={(e) =>
                setTipo(e.target.value as "ADMIN_EMPRESA" | "USUARIO_EMPRESA")
              }
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="USUARIO_EMPRESA">Usuário Empresa</option>
              <option value="ADMIN_EMPRESA">Admin Empresa</option>
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
              {salvando ? "Salvando..." : "Salvar usuário"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
