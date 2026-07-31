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
import { PERMISSAO_CLIENTES_EDITAR } from "@/lib/auth";
import { Cliente, atualizarCliente } from "@/services/clientes.service";

type Props = {
  cliente: Cliente;
};

export function EditarClienteModal({ cliente }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId } = useEmpresaSelecionada();
  const podeEditarCliente = temPermissao(PERMISSAO_CLIENTES_EDITAR);

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState(cliente.nome);
  const [tipo, setTipo] = useState<"PF" | "PJ">(cliente.tipo);
  const [documento, setDocumento] = useState(cliente.documento ?? "");
  const [email, setEmail] = useState(cliente.email ?? "");
  const [telefone, setTelefone] = useState(cliente.telefone ?? "");
  const [celular, setCelular] = useState(cliente.celular ?? "");
  const [endereco, setEndereco] = useState(cliente.endereco ?? "");
  const [cidade, setCidade] = useState(cliente.cidade ?? "");
  const [estado, setEstado] = useState(cliente.estado ?? "");
  const [cep, setCep] = useState(cliente.cep ?? "");
  const [observacao, setObservacao] = useState(cliente.observacao ?? "");

  async function salvar() {
    if (!podeEditarCliente) {
      toast.error("Você não possui permissão para esta ação.");
      return;
    }

    try {
      setSalvando(true);

      await atualizarCliente(cliente.id, {
        nome,
        tipo,
        documento: documento || undefined,
        email: email || undefined,
        telefone: telefone || undefined,
        celular: celular || undefined,
        endereco: endereco || undefined,
        cidade: cidade || undefined,
        estado: estado || undefined,
        cep: cep || undefined,
        observacao: observacao || undefined,
      });

      toast.success("Cliente atualizado com sucesso!");
      setAberto(false);

      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      queryClient.invalidateQueries({
        queryKey: ["cliente", empresaEfetivaId, cliente.id],
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao atualizar cliente");
    } finally {
      setSalvando(false);
    }
  }

  if (!podeEditarCliente) {
    return null;
  }

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title="Editar cliente"
      trigger={
        <Button variant="outline" size="sm">
          <Pencil size={14} className="mr-2" />
          Editar
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">Nome</label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as "PF" | "PJ")}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="PF">Pessoa Física</option>
              <option value="PJ">Pessoa Jurídica</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Documento
            </label>
            <Input
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              placeholder="CPF ou CNPJ"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">E-mail</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Telefone
            </label>
            <Input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Celular
            </label>
            <Input
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Endereço</label>
          <Input
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-slate-700">Cidade</label>
            <Input value={cidade} onChange={(e) => setCidade(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Estado</label>
            <Input
              value={estado}
              onChange={(e) => setEstado(e.target.value.toUpperCase())}
              maxLength={2}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">CEP</label>
            <Input value={cep} onChange={(e) => setCep(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Observação
          </label>
          <Textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
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
