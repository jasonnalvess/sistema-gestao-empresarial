"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/forms/FormDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { obterMensagemErro } from "@/lib/api-error";
import { PERMISSAO_CAIXA_EDITAR } from "@/lib/auth";
import { caixasQueryKeys } from "@/lib/caixas-query-keys";
import { atualizarCaixa, type Caixa } from "@/services/caixas.service";

type Props = {
  caixa: Caixa;
};

export function EditarCaixaModal({ caixa }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeEditar = temPermissao(PERMISSAO_CAIXA_EDITAR);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState(caixa.nome);
  const [codigo, setCodigo] = useState(caixa.codigo);
  const [descricao, setDescricao] = useState(caixa.descricao ?? "");

  async function salvar() {
    if (!podeEditar || !empresaEfetivaId || carregando) {
      toast.error("Você não possui permissão para esta ação.");
      return;
    }
    if (nome.trim().length < 2 || codigo.trim().length === 0) {
      toast.error("Informe nome e código válidos para o caixa.");
      return;
    }

    try {
      setSalvando(true);
      await atualizarCaixa(caixa.id, {
        nome: nome.trim(),
        codigo: codigo.trim().toUpperCase(),
        descricao: descricao.trim() || undefined,
      });
      toast.success("Caixa atualizado com sucesso!");
      setAberto(false);
      await queryClient.invalidateQueries({
        queryKey: caixasQueryKeys.detalhe(empresaEfetivaId, caixa.id),
      });
      await queryClient.invalidateQueries({
        queryKey: caixasQueryKeys.listas(empresaEfetivaId),
      });
      await queryClient.invalidateQueries({
        queryKey: caixasQueryKeys.resumo(empresaEfetivaId),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao atualizar caixa"));
    } finally {
      setSalvando(false);
    }
  }

  if (!podeEditar || !empresaEfetivaId || carregando) return null;

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title={`Editar ${caixa.nome}`}
      trigger={
        <Button variant="outline">
          <Pencil size={16} className="mr-2" />
          Editar
        </Button>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="text-sm font-medium text-slate-700">Nome *</label>
          <Input
            value={nome}
            onChange={(event) => setNome(event.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Código *</label>
          <Input
            value={codigo}
            onChange={(event) => setCodigo(event.target.value.toUpperCase())}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">
            Descrição
          </label>
          <Textarea
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
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
            {salvando ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
