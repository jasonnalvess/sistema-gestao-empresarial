"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { FormDialog } from "@/components/forms/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { obterMensagemErro } from "@/lib/api-error";
import { PERMISSAO_PERFIS_EDITAR } from "@/lib/auth";
import { perfisQueryKeys } from "@/lib/perfis-query-keys";
import {
  editarPerfil,
  type Perfil,
} from "@/services/perfis.service";

type Props = {
  perfil: Perfil;
};

export function EditarPerfilModal({ perfil }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();

  const podeEditar =
    temPermissao(PERMISSAO_PERFIS_EDITAR) && !perfil.sistema;

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState(perfil.nome);
  const [descricao, setDescricao] = useState(perfil.descricao ?? "");

  function restaurarCampos() {
    setNome(perfil.nome);
    setDescricao(perfil.descricao ?? "");
  }

  async function salvar() {
    if (!podeEditar || !empresaEfetivaId || carregando) {
      toast.error("Você não possui permissão para esta ação.");
      return;
    }

    const nomeNormalizado = nome.trim();
    const descricaoNormalizada = descricao.trim();

    if (!nomeNormalizado) {
      toast.error("Informe o nome do perfil.");
      return;
    }

    try {
      setSalvando(true);

      await editarPerfil(perfil.id, {
        nome: nomeNormalizado,
        descricao: descricaoNormalizada || null,
      });

      toast.success("Perfil atualizado com sucesso!");

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: perfisQueryKeys.listas(empresaEfetivaId),
        }),
        queryClient.invalidateQueries({
          queryKey: perfisQueryKeys.detalhe(
            empresaEfetivaId,
            perfil.id,
          ),
        }),
      ]);

      setAberto(false);
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao atualizar perfil."));
    } finally {
      setSalvando(false);
    }
  }

  if (!podeEditar || !empresaEfetivaId || carregando) return null;

  return (
    <FormDialog
      open={aberto}
      onOpenChange={(novoEstado) => {
        if (salvando) return;

        setAberto(novoEstado);

        if (novoEstado) {
          restaurarCampos();
        }
      }}
      title={`Editar ${perfil.nome}`}
      trigger={
        <Button variant="outline" size="sm">
          <Pencil size={14} className="mr-2" />
          Editar
        </Button>
      }
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="editar-perfil-nome" className="text-sm font-medium text-slate-700">Nome *</label>
          <Input
            id="editar-perfil-nome"
            value={nome}
            maxLength={120}
            onChange={(event) => setNome(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="editar-perfil-chave" className="text-sm font-medium text-slate-700">Chave</label>
          <Input id="editar-perfil-chave" value={perfil.chave} disabled />
          <p className="mt-1 text-xs text-slate-500">
            A chave é imutável após a criação do perfil.
          </p>
        </div>

        <div>
          <label htmlFor="editar-perfil-descricao" className="text-sm font-medium text-slate-700">
            Descrição
          </label>
          <Textarea
            id="editar-perfil-descricao"
            value={descricao}
            maxLength={1000}
            onChange={(event) => setDescricao(event.target.value)}
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
            {salvando ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
