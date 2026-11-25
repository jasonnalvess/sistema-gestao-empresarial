"use client";

import { obterMensagemErro } from "@/lib/api-error";
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
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao atualizar cliente"));
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
        <Button className="shrink-0" variant="outline" size="sm">
          <Pencil aria-hidden="true" />
          Editar
        </Button>
      }
    >
      <div className="min-w-0 space-y-4">
        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">Nome</label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as "PF" | "PJ")}
              className="mt-1 h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base md:text-sm"
            >
              <option value="PF">Pessoa Física</option>
              <option value="PJ">Pessoa Jurídica</option>
            </select>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
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

        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
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

        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
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

        <div className="sticky -bottom-4 -mx-4 flex flex-col-reverse gap-2 border-t bg-white p-4 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            className="w-full sm:w-auto"
            variant="outline"
            onClick={() => setAberto(false)}
            disabled={salvando}
          >
            Cancelar
          </Button>

          <Button
            className="w-full sm:w-auto"
            onClick={salvar}
            disabled={salvando}
          >
            {salvando ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
