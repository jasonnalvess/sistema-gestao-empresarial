"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Calculator } from "lucide-react";
import { toast } from "sonner";
import { FormDialog } from "@/components/forms/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_INVENTARIOS_EDITAR } from "@/lib/auth";
import { obterMensagemErro } from "@/lib/api-error";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import {
  contarItemInventario,
  InventarioEstoque,
  InventarioItem,
} from "@/services/inventarios.service";

export function ContarItemInventarioModal({
  inventario,
  item,
}: {
  inventario: InventarioEstoque;
  item: InventarioItem;
}) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeEditar = temPermissao(PERMISSAO_INVENTARIOS_EDITAR);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [quantidade, setQuantidade] = useState(item.quantidadeContada ?? "");
  const [observacao, setObservacao] = useState(item.observacao ?? "");
  async function salvar() {
    if (!podeEditar || !empresaEfetivaId || carregando) {
      toast.error("Você não possui permissão para esta ação.");
      return;
    }
    const valor = Number(quantidade);
    if (quantidade === "" || !Number.isFinite(valor) || valor < 0) {
      toast.error("Informe uma quantidade válida.");
      return;
    }
    try {
      setSalvando(true);
      await contarItemInventario(inventario.id, item.id, {
        quantidadeContada: valor,
        observacao: observacao.trim() || undefined,
      });
      toast.success("Contagem registrada com sucesso!");
      setAberto(false);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: estoqueQueryKeys.inventario(
            empresaEfetivaId,
            inventario.id,
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: estoqueQueryKeys.inventarios(empresaEfetivaId),
        }),
      ]);
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao registrar contagem"));
    } finally {
      setSalvando(false);
    }
  }
  if (
    !podeEditar ||
    !empresaEfetivaId ||
    carregando ||
    ["FINALIZADO", "CANCELADO"].includes(inventario.status)
  )
    return null;
  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title={`Contar ${item.produto.nome}`}
      trigger={
        <Button className="shrink-0" size="sm" variant="outline">
          <Calculator aria-hidden="true" />
          Contar
        </Button>
      }
    >
      <div className="min-w-0 space-y-4">
        <div>
          <label className="text-sm font-medium">Quantidade contada *</label>
          <Input
            type="number"
            min="0"
            step="any"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Observação</label>
          <Textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
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
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Registrar contagem"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
