"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/forms/FormDialog";

import {
  atualizarMarcaProduto,
  MarcaProduto,
} from "@/services/marcas-produtos.service";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_MARCAS_EDITAR } from "@/lib/auth";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import { obterMensagemErro } from "@/lib/api-error";

type Props = {
  marca: MarcaProduto;
};

export function EditarMarcaProdutoModal({ marca }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeEditar = temPermissao(PERMISSAO_MARCAS_EDITAR);

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState(marca.nome);
  const [descricao, setDescricao] = useState(marca.descricao ?? "");

  async function salvar() {
    if (!podeEditar || !empresaEfetivaId || carregando) return;
    try {
      setSalvando(true);

      await atualizarMarcaProduto(marca.id, {
        nome,
        descricao: descricao || undefined,
      });

      toast.success("Marca atualizada com sucesso!");
      setAberto(false);

      queryClient.invalidateQueries({
        queryKey: estoqueQueryKeys.marcas(empresaEfetivaId),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao atualizar marca"));
    } finally {
      setSalvando(false);
    }
  }

  if (!podeEditar || !empresaEfetivaId || carregando) return null;

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title="Editar marca"
      trigger={
        <Button className="shrink-0" variant="outline" size="sm">
          <Pencil aria-hidden="true" />
          Editar
        </Button>
      }
    >
      <div className="min-w-0 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">Nome</label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Descrição
          </label>
          <Textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>

        <div className="sticky -bottom-4 -mx-4 flex flex-col-reverse gap-2 border-t bg-white p-4 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => setAberto(false)}
            disabled={salvando}
          >
            Cancelar
          </Button>

          <Button onClick={salvar} disabled={salvando || !nome}>
            {salvando ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
