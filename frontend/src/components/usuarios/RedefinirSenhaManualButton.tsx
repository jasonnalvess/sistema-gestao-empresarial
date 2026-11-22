"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { obterMensagemErro } from "@/lib/api-error";
import {
  buscarUsuarioPorId,
  redefinirSenhaManual,
  type Usuario,
} from "@/services/usuarios.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/actions/ConfirmDialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  usuario: Usuario;
};

export function RedefinirSenhaManualButton({ usuario }: Props) {
  const { usuario: usuarioLogado } = useAuth();
  const queryClient = useQueryClient();
  const bloqueadoRef = useRef(false);

  const superAdmin = usuarioLogado?.tipo === "SUPER_ADMIN";
  const autoReset = usuarioLogado?.id === usuario.id;
  const inelegivel = !usuario.ativo;

  const [abreExibicaoSenha, setAbreExibicaoSenha] = useState(false);
  const [senhaTemporaria, setSenhaTemporaria] = useState<string | null>(null);
  const [emailAlvo, setEmailAlvo] = useState<string>(usuario.email);
  const [salvando, setSalvando] = useState(false);
  const [copiando, setCopiando] = useState(false);
  const [revelarSenha, setRevelarSenha] = useState(false);

  useEffect(() => {
    return () => {
      setSenhaTemporaria(null);
    };
  }, []);

  if (!superAdmin || autoReset || inelegivel) {
    return null;
  }

  async function executarReset(): Promise<void> {
    if (bloqueadoRef.current) {
      return;
    }

    bloqueadoRef.current = true;
    setSalvando(true);

    try {
      const resposta = await buscarUsuarioPorId(usuario.id);
      const versaoAutorizacao = resposta.data.versaoAutorizacao;

      if (typeof versaoAutorizacao !== "number") {
        throw new Error("Versão atual do usuário não pôde ser confirmada.");
      }

      const resultado = await redefinirSenhaManual(
        usuario.id,
        versaoAutorizacao,
      );

      setEmailAlvo(resultado.data.email ?? usuario.email);
      setSenhaTemporaria(resultado.data.senhaTemporaria);
      setAbreExibicaoSenha(true);

      queryClient.invalidateQueries({
        queryKey: ["usuarios"],
      });
    } catch (erro) {
      toast.error(
        obterMensagemErro(erro, "Não foi possível redefinir a senha."),
      );
    } finally {
      bloqueadoRef.current = false;
      setSalvando(false);
    }
  }

  async function copiarSenha(): Promise<void> {
    if (!senhaTemporaria) {
      return;
    }

    try {
      setCopiando(true);
      await navigator.clipboard.writeText(senhaTemporaria);
      toast.success("Senha copiada.");
    } catch {
      toast.error("Não foi possível copiar a senha.");
    } finally {
      setCopiando(false);
    }
  }

  return (
    <>
      <ConfirmDialog
        title="Redefinir senha manualmente?"
        description={`O e-mail "${usuario.email}" receberá uma nova senha temporária. A senha atual deixa de ser válida e o usuário deverá alterar a senha no próximo acesso. A senha temporária deve ser entregue por canal seguro.`}
        confirmText={salvando ? "Redefinindo..." : "Redefinir senha"}
        cancelText="Cancelar"
        onConfirm={() => {
          void executarReset();
        }}
        trigger={
          <Button variant="outline" size="sm" disabled={salvando}>
            <KeyRound size={14} className="mr-2" />
            Resetar senha
          </Button>
        }
      />

      <AlertDialog
        open={abreExibicaoSenha}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setSenhaTemporaria(null);
            setAbreExibicaoSenha(false);
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Senha temporária gerada</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário {emailAlvo} deverá alterar a senha no próximo acesso. A
              senha abaixo deve ser entregue por canal seguro.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex items-center gap-2">
            <Input
              id="redefinir-senha-manual-senha"
              type={revelarSenha ? "text" : "password"}
              readOnly
              autoComplete="off"
              value={senhaTemporaria ?? ""}
              className="font-mono"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRevelarSenha((revela) => !revela)}
              disabled={!senhaTemporaria}
            >
              {revelarSenha ? "Ocultar" : "Mostrar"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void copiarSenha();
              }}
              disabled={copiando || !senhaTemporaria}
            >
              Copiar
            </Button>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Concluir</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
