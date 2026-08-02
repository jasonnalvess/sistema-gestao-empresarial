"use client";
import { useQueryClient } from "@tanstack/react-query";
import { XCircle } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/actions/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_INVENTARIOS_CANCELAR } from "@/lib/auth";
import { obterMensagemErro } from "@/lib/api-error";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import { cancelarInventario, InventarioEstoque } from "@/services/inventarios.service";

export function CancelarInventarioButton({ inventario }: { inventario: InventarioEstoque }) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId } = useEmpresaSelecionada();
  const podeCancelar = temPermissao(PERMISSAO_INVENTARIOS_CANCELAR);
  async function cancelar() {
    if (!podeCancelar || !empresaEfetivaId) { toast.error("Você não possui permissão para esta ação."); return; }
    try {
      await cancelarInventario(inventario.id);
      toast.success("Inventário cancelado com sucesso!");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: estoqueQueryKeys.inventario(empresaEfetivaId, inventario.id) }),
        queryClient.invalidateQueries({ queryKey: estoqueQueryKeys.inventarios(empresaEfetivaId) }),
      ]);
    } catch (error: unknown) { toast.error(obterMensagemErro(error, "Erro ao cancelar inventário")); }
  }
  if (!podeCancelar || !empresaEfetivaId || inventario.status === "FINALIZADO" || inventario.status === "CANCELADO") return null;
  return <ConfirmDialog title="Cancelar inventário?" description="O inventário ficará somente para consulta e não alterará o estoque." confirmText="Cancelar inventário" onConfirm={cancelar} trigger={<Button variant="destructive"><XCircle />Cancelar</Button>} />;
}
