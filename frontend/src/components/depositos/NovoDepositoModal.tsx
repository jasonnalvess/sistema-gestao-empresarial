"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/forms/FormDialog";

import { criarDeposito } from "@/services/depositos.service";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_DEPOSITOS_CRIAR } from "@/lib/auth";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import { obterMensagemErro } from "@/lib/api-error";

export function NovoDepositoModal() {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeCriar = temPermissao(PERMISSAO_DEPOSITOS_CRIAR);

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [endereco, setEndereco] = useState("");

  function limparCampos() {
    setNome("");
    setCodigo("");
    setDescricao("");
    setEndereco("");
  }

  async function salvar() {
    if (!podeCriar || !empresaEfetivaId || carregando) return;
    if (!nome.trim()) {
      toast.error("Informe o nome do depósito.");
      return;
    }

    if (!codigo.trim()) {
      toast.error("Informe o código do depósito.");
      return;
    }

    try {
      setSalvando(true);

      await criarDeposito({
        nome: nome.trim(),
        codigo: codigo.trim().toUpperCase(),
        descricao: descricao.trim() || undefined,
        endereco: endereco.trim() || undefined,
      });

      toast.success("Depósito cadastrado com sucesso!");

      limparCampos();
      setAberto(false);

      queryClient.invalidateQueries({
        queryKey: estoqueQueryKeys.depositos(empresaEfetivaId),
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao cadastrar depósito"));
    } finally {
      setSalvando(false);
    }
  }

  if (!podeCriar || !empresaEfetivaId || carregando) return null;

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title="Novo depósito"
      trigger={
        <Button className="w-full md:w-auto">
          <Plus aria-hidden="true" />
          Novo depósito
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
            placeholder="Ex: Almoxarifado Central"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Código *
          </label>

          <Input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="Ex: ALMOX-01"
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
            placeholder="Ex: Galpão 2, setor administrativo"
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
            {salvando ? "Salvando..." : "Salvar depósito"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
