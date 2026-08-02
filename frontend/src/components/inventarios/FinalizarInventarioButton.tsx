"use client";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/actions/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_INVENTARIOS_FINALIZAR } from "@/lib/auth";
import { obterMensagemErro } from "@/lib/api-error";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import { finalizarInventario, InventarioEstoque } from "@/services/inventarios.service";

export function FinalizarInventarioButton({ inventario }: { inventario: InventarioEstoque }) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId } = useEmpresaSelecionada();
  const podeFinalizar = temPermissao(PERMISSAO_INVENTARIOS_FINALIZAR);
  const itens = inventario.itens ?? [];
  const todosContados = itens.every((item) => item.status === "CONTADO" && item.quantidadeContada !== null && item.quantidadeContada !== undefined);
  async function finalizar() {
    if (!podeFinalizar || !empresaEfetivaId) { toast.error("Você não possui permissão para esta ação."); return; }
    try {
      await finalizarInventario(inventario.id);
      toast.success("Inventário finalizado e estoque atualizado!");
      const invalidacoes = [
        queryClient.invalidateQueries({ queryKey: estoqueQueryKeys.inventario(empresaEfetivaId, inventario.id) }),
        queryClient.invalidateQueries({ queryKey: estoqueQueryKeys.inventarios(empresaEfetivaId) }),
        queryClient.invalidateQueries({ queryKey: estoqueQueryKeys.estoque(empresaEfetivaId) }),
        queryClient.invalidateQueries({ queryKey: estoqueQueryKeys.movimentacoes(empresaEfetivaId) }),
        queryClient.invalidateQueries({ queryKey: estoqueQueryKeys.dashboard(empresaEfetivaId) }),
        queryClient.invalidateQueries({ queryKey: estoqueQueryKeys.produtos(empresaEfetivaId) }),
        queryClient.invalidateQueries({ queryKey: estoqueQueryKeys.produtosDetalhes(empresaEfetivaId) }),
        ...itens.map((item) => queryClient.invalidateQueries({ queryKey: estoqueQueryKeys.produto(empresaEfetivaId, item.produtoId) })),
      ];
      await Promise.all(invalidacoes);
    } catch (error: unknown) { toast.error(obterMensagemErro(error, "Erro ao finalizar inventário")); }
  }
  if (!podeFinalizar || !empresaEfetivaId || inventario.status !== "EM_CONTAGEM" || !todosContados) return null;
  return <ConfirmDialog title="Finalizar inventário?" description="As diferenças contadas serão aplicadas ao estoque e gerarão movimentações de inventário." confirmText="Finalizar e ajustar estoque" onConfirm={finalizar} trigger={<Button><CheckCircle2 />Finalizar</Button>} />;
}
