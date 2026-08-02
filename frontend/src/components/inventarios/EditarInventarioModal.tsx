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
import { PERMISSAO_INVENTARIOS_EDITAR } from "@/lib/auth";
import { obterMensagemErro } from "@/lib/api-error";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import { atualizarInventario, InventarioEstoque } from "@/services/inventarios.service";

export function EditarInventarioModal({ inventario }: { inventario: InventarioEstoque }) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeEditar = temPermissao(PERMISSAO_INVENTARIOS_EDITAR);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [descricao, setDescricao] = useState(inventario.descricao ?? "");
  const [observacao, setObservacao] = useState(inventario.observacao ?? "");
  async function salvar() {
    if (!podeEditar || !empresaEfetivaId || carregando) { toast.error("Você não possui permissão para esta ação."); return; }
    try {
      setSalvando(true);
      await atualizarInventario(inventario.id, { descricao: descricao.trim() || undefined, observacao: observacao.trim() || undefined });
      toast.success("Inventário atualizado com sucesso!");
      setAberto(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: estoqueQueryKeys.inventario(empresaEfetivaId, inventario.id) }),
        queryClient.invalidateQueries({ queryKey: estoqueQueryKeys.inventarios(empresaEfetivaId) }),
      ]);
    } catch (error: unknown) { toast.error(obterMensagemErro(error, "Erro ao atualizar inventário")); }
    finally { setSalvando(false); }
  }
  if (!podeEditar || !empresaEfetivaId || carregando || ["FINALIZADO", "CANCELADO"].includes(inventario.status)) return null;
  return <FormDialog open={aberto} onOpenChange={setAberto} title="Editar inventário" trigger={<Button variant="outline"><Pencil />Editar</Button>}>
    <div className="space-y-4">
      <div><label className="text-sm font-medium">Descrição</label><Input value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
      <div><label className="text-sm font-medium">Observação</label><Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} /></div>
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setAberto(false)} disabled={salvando}>Cancelar</Button><Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button></div>
    </div>
  </FormDialog>;
}
