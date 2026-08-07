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
  atualizarDeposito,
  Deposito,
} from "@/services/depositos.service";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_DEPOSITOS_EDITAR } from "@/lib/auth";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import { obterMensagemErro } from "@/lib/api-error";

type Props = {
  deposito: Deposito;
};

export function EditarDepositoModal({ deposito }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeEditar = temPermissao(PERMISSAO_DEPOSITOS_EDITAR);

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState(deposito.nome);
  const [codigo, setCodigo] = useState(deposito.codigo);
  const [descricao, setDescricao] = useState(deposito.descricao ?? "");
  const [endereco, setEndereco] = useState(deposito.endereco ?? "");

  async function salvar() {
    if (!podeEditar || !empresaEfetivaId || carregando) return;
    if (!nome.trim() || !codigo.trim()) {
      toast.error("Nome e código são obrigatórios.");
      return;
    }

    try {
      setSalvando(true);

      await atualizarDeposito(deposito.id, {
        nome: nome.trim(),
        codigo: codigo.trim().toUpperCase(),
        descricao: descricao.trim() || undefined,
        endereco: endereco.trim() || undefined,
      });

      toast.success("Depósito atualizado com sucesso!");
      setAberto(false);

      queryClient.invalidateQueries({
        queryKey: estoqueQueryKeys.depositos(empresaEfetivaId),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao atualizar depósito"));
    } finally {
      setSalvando(false);
    }
  }

  if (!podeEditar || !empresaEfetivaId || carregando) return null;

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title="Editar depósito"
      trigger={
        <Button className="w-full md:w-auto" variant="outline" size="sm">
          <Pencil aria-hidden="true" />
          Editar
        </Button>
      }
    >
      <div className="min-w-0 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">
            Nome *
          </label>

          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Código *
          </label>

          <Input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          />
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

        <div>
          <label className="text-sm font-medium text-slate-700">
            Endereço ou localização
          </label>

          <Input
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
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

          <Button
            onClick={salvar}
            disabled={salvando || !nome.trim() || !codigo.trim()}
          >
            {salvando ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
