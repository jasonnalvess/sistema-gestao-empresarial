"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { FormDialog } from "@/components/forms/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { obterMensagemErro } from "@/lib/api-error";
import { PERMISSAO_PERFIS_CRIAR } from "@/lib/auth";
import { perfisQueryKeys } from "@/lib/perfis-query-keys";
import { criarPerfil } from "@/services/perfis.service";

const CHAVE_PERFIL_REGEX = /^[a-z][a-z0-9_]*$/;

export function NovoPerfilModal() {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();

  const podeCriar = temPermissao(PERMISSAO_PERFIS_CRIAR);

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState("");
  const [chave, setChave] = useState("");
  const [descricao, setDescricao] = useState("");

  function limparCampos() {
    setNome("");
    setChave("");
    setDescricao("");
  }

  function normalizarChave(valor: string) {
    return valor.toLowerCase().replace(/\s+/g, "_");
  }

  async function salvar() {
    if (!podeCriar || !empresaEfetivaId || carregando) {
      toast.error("Você não possui permissão para esta ação.");
      return;
    }

    const nomeNormalizado = nome.trim();
    const chaveNormalizada = chave.trim().toLowerCase();

    if (!nomeNormalizado) {
      toast.error("Informe o nome do perfil.");
      return;
    }

    if (!CHAVE_PERFIL_REGEX.test(chaveNormalizada)) {
      toast.error(
        "A chave deve começar com uma letra minúscula e conter apenas letras minúsculas, números e sublinhado.",
      );
      return;
    }

    try {
      setSalvando(true);

      await criarPerfil({
        nome: nomeNormalizado,
        chave: chaveNormalizada,
        descricao: descricao.trim() || undefined,
      });

      toast.success("Perfil criado com sucesso!");

      await queryClient.invalidateQueries({
        queryKey: perfisQueryKeys.listas(empresaEfetivaId),
      });

      limparCampos();
      setAberto(false);
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao criar perfil."));
    } finally {
      setSalvando(false);
    }
  }

  if (!podeCriar || !empresaEfetivaId || carregando) return null;

  return (
    <FormDialog
      open={aberto}
      onOpenChange={(novoEstado) => {
        if (salvando) return;

        setAberto(novoEstado);

        if (!novoEstado) {
          limparCampos();
        }
      }}
      title="Novo perfil"
      trigger={
        <Button>
          <Plus size={16} className="mr-2" />
          Novo perfil
        </Button>
      }
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="novo-perfil-nome" className="text-sm font-medium text-slate-700">Nome *</label>
          <Input
            id="novo-perfil-nome"
            value={nome}
            maxLength={120}
            onChange={(event) => setNome(event.target.value)}
            placeholder="Ex.: Gerente comercial"
          />
        </div>

        <div>
          <label htmlFor="novo-perfil-chave" className="text-sm font-medium text-slate-700">Chave *</label>
          <Input
            id="novo-perfil-chave"
            value={chave}
            onChange={(event) =>
              setChave(normalizarChave(event.target.value))
            }
            placeholder="Ex.: gerente_comercial"
            autoCapitalize="none"
            autoCorrect="off"
          />
          <p className="mt-1 text-xs text-slate-500">
            Use letras minúsculas, números e sublinhado. A chave não poderá
            ser alterada depois da criação.
          </p>
        </div>

        <div>
          <label htmlFor="novo-perfil-descricao" className="text-sm font-medium text-slate-700">
            Descrição
          </label>
          <Textarea
            id="novo-perfil-descricao"
            value={descricao}
            maxLength={1000}
            onChange={(event) => setDescricao(event.target.value)}
            placeholder="Descrição opcional do perfil"
          />
        </div>

        <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t bg-white pt-5 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => setAberto(false)}
            disabled={salvando}
          >
            Cancelar
          </Button>

          <Button onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Criar perfil"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
