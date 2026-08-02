"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { FormDialog } from "@/components/forms/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_DEPOSITOS_VISUALIZAR, PERMISSAO_INVENTARIOS_CRIAR } from "@/lib/auth";
import { obterMensagemErro } from "@/lib/api-error";
import { estoqueQueryKeys } from "@/lib/estoque-query-keys";
import { listarDepositos } from "@/services/depositos.service";
import { criarInventario } from "@/services/inventarios.service";

export function NovoInventarioModal() {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();
  const podeCriar = temPermissao(PERMISSAO_INVENTARIOS_CRIAR);
  const podeVerDepositos = temPermissao(PERMISSAO_DEPOSITOS_VISUALIZAR);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [depositoId, setDepositoId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [observacao, setObservacao] = useState("");
  const { data: depositos } = useQuery({
    queryKey: estoqueQueryKeys.depositosSelect(empresaEfetivaId ?? "", "novo-inventario"),
    queryFn: () => listarDepositos({ page: 1, limit: 100, ativo: true, sortBy: "nome", order: "asc" }),
    enabled: aberto && podeCriar && podeVerDepositos && Boolean(empresaEfetivaId) && !carregando,
  });
  async function salvar() {
    if (!podeCriar || !empresaEfetivaId || carregando) {
      toast.error("Você não possui permissão para esta ação."); return;
    }
    if (!depositoId) { toast.error("Selecione o depósito."); return; }
    try {
      setSalvando(true);
      await criarInventario({ depositoId, descricao: descricao.trim() || undefined, observacao: observacao.trim() || undefined });
      toast.success("Inventário criado com sucesso!");
      setDepositoId(""); setDescricao(""); setObservacao(""); setAberto(false);
      await queryClient.invalidateQueries({ queryKey: estoqueQueryKeys.inventarios(empresaEfetivaId) });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao criar inventário"));
    } finally { setSalvando(false); }
  }
  if (!podeCriar || !podeVerDepositos || !empresaEfetivaId || carregando) return null;
  return <FormDialog open={aberto} onOpenChange={setAberto} title="Novo inventário" trigger={<Button><Plus />Novo inventário</Button>}>
    <div className="space-y-4">
      <div><label className="text-sm font-medium">Depósito *</label><select value={depositoId} onChange={(e) => setDepositoId(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm"><option value="">Selecione</option>{depositos?.data.map((d) => <option key={d.id} value={d.id}>{d.codigo} - {d.nome}</option>)}</select></div>
      <div><label className="text-sm font-medium">Descrição</label><Input value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
      <div><label className="text-sm font-medium">Observação</label><Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} /></div>
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setAberto(false)} disabled={salvando}>Cancelar</Button><Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : "Criar inventário"}</Button></div>
    </div>
  </FormDialog>;
}
