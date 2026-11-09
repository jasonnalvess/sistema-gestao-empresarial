"use client";

import { obterMensagemErro } from "@/lib/api-error";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { USUARIOS_PERFIS_GERENCIAR } from "@/lib/auth";
import { SeletorPerfisUsuario } from "./SeletorPerfisUsuario";
import { mensagemErroPerfis } from "./perfis-erro";
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

import {
  atualizarPerfisUsuario,
  criarUsuario,
  type CriarUsuarioInput,
} from "@/services/usuarios.service";

export function NovoUsuarioModal() {
  const { empresaEfetivaId } = useEmpresaSelecionada();
  return <FormularioNovoUsuario key={empresaEfetivaId ?? "global"} />;
}

function FormularioNovoUsuario() {
  const queryClient = useQueryClient();
  const { usuario: ator, temPermissao } = useAuth();
  const { empresaEfetivaId } = useEmpresaSelecionada();
  const podeGerenciarPerfis = temPermissao(USUARIOS_PERFIS_GERENCIAR);
  const [perfisIds, setPerfisIds] = useState<string[]>([]);
  const montado = useRef(true);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);
  const superAdmin = ator?.tipo === "SUPER_ADMIN";

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [tipo, setTipo] =
    useState<CriarUsuarioInput["tipo"]>("USUARIO_EMPRESA");

  const empresarial = tipo !== "SUPER_ADMIN";
  const criacaoIndisponivel = superAdmin && empresarial && !empresaEfetivaId;

  async function salvar() {
    if (criacaoIndisponivel || salvando || (!superAdmin && !empresarial))
      return;
    try {
      setSalvando(true);

      const resposta = await criarUsuario({
        nome,
        email,
        senha,
        tipo,
        ...(superAdmin && empresarial && empresaEfetivaId
          ? { empresaId: empresaEfetivaId }
          : {}),
      });

      const selecionados = empresarial && podeGerenciarPerfis ? perfisIds : [];
      if (selecionados.length > 0) {
        try {
          if (!montado.current || resposta.data.empresaId !== empresaEfetivaId)
            throw new Error("Contexto empresarial alterado.");
          await atualizarPerfisUsuario(resposta.data.id, selecionados);
          toast.success("Usuário cadastrado e perfis atribuídos com sucesso!");
        } catch (error) {
          toast.warning(
            "Conta criada, mas os perfis não puderam ser atribuídos. Corrija pela edição do usuário.",
            {
              description: mensagemErroPerfis(error),
            },
          );
        }
      } else {
        toast.success("Usuário cadastrado com sucesso!");
      }
      setPerfisIds([]);

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
    <Dialog
      open={aberto}
      onOpenChange={(open) => {
        if (!salvando) {
          setAberto(open);
          if (!open) {
            setSenha("");
            setPerfisIds([]);
          }
        }
      }}
    >
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

        <div className="min-w-0 space-y-4">
          <p className="text-sm text-slate-600">
            Tipo de usuário define o nível estrutural da conta. Perfis definem
            os módulos e ações permitidos.
          </p>
          {criacaoIndisponivel && (
            <p role="status" className="text-sm text-amber-800">
              Selecione uma empresa antes de criar um usuário empresarial.
            </p>
          )}
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
            <label className="text-sm font-medium text-slate-700">
              Tipo de usuário
            </label>

            <select
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value as CriarUsuarioInput["tipo"]);
                setPerfisIds([]);
              }}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="USUARIO_EMPRESA">Usuário Empresa</option>
              <option value="ADMIN_EMPRESA">Admin Empresa</option>
              {superAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
            </select>
          </div>

          {aberto && empresarial && podeGerenciarPerfis && empresaEfetivaId && (
            <SeletorPerfisUsuario
              empresaId={empresaEfetivaId}
              value={perfisIds}
              onChange={setPerfisIds}
              disabled={salvando}
            />
          )}
          <div className="sticky bottom-0 flex flex-col-reverse gap-3 bg-white pt-4 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setAberto(false);
                setSenha("");
                setPerfisIds([]);
              }}
              disabled={salvando}
            >
              Cancelar
            </Button>

            <Button onClick={salvar} disabled={salvando || criacaoIndisponivel}>
              {salvando ? "Salvando..." : "Salvar usuário"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
