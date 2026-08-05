"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/forms/FormDialog";

import { criarCaixa } from "@/services/caixas.service";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_CAIXA_CRIAR } from "@/lib/auth";
import { caixasQueryKeys } from "@/lib/caixas-query-keys";
import { obterMensagemErro } from "@/lib/api-error";

export function NovoCaixaModal() {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeCriar = temPermissao(PERMISSAO_CAIXA_CRIAR);

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");

  function limparCampos() {
    setNome("");
    setCodigo("");
    setDescricao("");
  }

  async function salvar() {
    if (!podeCriar || !empresaEfetivaId || carregando) {
      toast.error("Você não possui permissão para esta ação.");
      return;
    }
    if (nome.trim().length < 2) {
      toast.error("Informe um nome válido para o caixa.");
      return;
    }

    if (codigo.trim().length < 1) {
      toast.error("Informe o código do caixa.");
      return;
    }

    try {
      setSalvando(true);

      await criarCaixa({
        nome: nome.trim(),
        codigo: codigo.trim().toUpperCase(),

        descricao: descricao.trim() || undefined,
      });

      toast.success("Caixa criado com sucesso!");

      limparCampos();
      setAberto(false);

      await queryClient.invalidateQueries({
        queryKey: caixasQueryKeys.listas(empresaEfetivaId),
      });

      await queryClient.invalidateQueries({
        queryKey: caixasQueryKeys.resumo(empresaEfetivaId),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao criar caixa"));
    } finally {
      setSalvando(false);
    }
  }

  if (!podeCriar || !empresaEfetivaId || carregando) return null;

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title="Novo caixa"
      trigger={
        <Button>
          <Plus size={16} className="mr-2" />
          Novo caixa
        </Button>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="text-sm font-medium text-slate-700">Nome *</label>

          <Input
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            placeholder="Ex.: Caixa principal"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Código *</label>

          <Input
            value={codigo}
            onChange={(event) => setCodigo(event.target.value.toUpperCase())}
            placeholder="Ex.: CX-PRINCIPAL"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Descrição
          </label>

          <Textarea
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
            placeholder="Descrição opcional do caixa"
          />
        </div>

        <div className="flex justify-end gap-3 border-t pt-5">
          <Button
            variant="outline"
            onClick={() => setAberto(false)}
            disabled={salvando}
          >
            Cancelar
          </Button>

          <Button onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Criar caixa"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
