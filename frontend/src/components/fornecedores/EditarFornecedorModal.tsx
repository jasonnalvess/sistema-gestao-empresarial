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
import { PERMISSAO_FORNECEDORES_EDITAR } from "@/lib/auth";

import {
  atualizarFornecedor,
  Fornecedor,
} from "@/services/fornecedores.service";

type Props = {
  fornecedor: Fornecedor;
};

export function EditarFornecedorModal({
  fornecedor,
}: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId } = useEmpresaSelecionada();
  const podeEditarFornecedor = temPermissao(PERMISSAO_FORNECEDORES_EDITAR);

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [razaoSocial, setRazaoSocial] = useState(
    fornecedor.razaoSocial
  );
  const [nomeFantasia, setNomeFantasia] = useState(
    fornecedor.nomeFantasia ?? ""
  );
  const [documento, setDocumento] = useState(
    fornecedor.documento
  );
  const [inscricaoEstadual, setInscricaoEstadual] =
    useState(fornecedor.inscricaoEstadual ?? "");
  const [inscricaoMunicipal, setInscricaoMunicipal] =
    useState(fornecedor.inscricaoMunicipal ?? "");
  const [email, setEmail] = useState(fornecedor.email ?? "");
  const [telefone, setTelefone] = useState(
    fornecedor.telefone ?? ""
  );
  const [celular, setCelular] = useState(
    fornecedor.celular ?? ""
  );
  const [contato, setContato] = useState(
    fornecedor.contato ?? ""
  );
  const [cep, setCep] = useState(fornecedor.cep ?? "");
  const [endereco, setEndereco] = useState(
    fornecedor.endereco ?? ""
  );
  const [numero, setNumero] = useState(
    fornecedor.numero ?? ""
  );
  const [complemento, setComplemento] = useState(
    fornecedor.complemento ?? ""
  );
  const [bairro, setBairro] = useState(
    fornecedor.bairro ?? ""
  );
  const [cidade, setCidade] = useState(
    fornecedor.cidade ?? ""
  );
  const [estado, setEstado] = useState(
    fornecedor.estado ?? ""
  );
  const [observacao, setObservacao] = useState(
    fornecedor.observacao ?? ""
  );

  async function salvar() {
    if (!podeEditarFornecedor) {
      toast.error("Você não possui permissão para esta ação.");
      return;
    }
    if (!empresaEfetivaId) {
      toast.error("Selecione uma empresa para realizar esta ação.");
      return;
    }
    if (!razaoSocial.trim() || !documento.trim()) {
      toast.error("Razão social e documento são obrigatórios.");
      return;
    }

    try {
      setSalvando(true);

      await atualizarFornecedor(fornecedor.id, {
        razaoSocial: razaoSocial.trim(),
        nomeFantasia: nomeFantasia.trim() || undefined,
        documento,
        inscricaoEstadual:
          inscricaoEstadual.trim() || undefined,
        inscricaoMunicipal:
          inscricaoMunicipal.trim() || undefined,
        email: email.trim() || undefined,
        telefone: telefone.trim() || undefined,
        celular: celular.trim() || undefined,
        contato: contato.trim() || undefined,
        cep: cep.trim() || undefined,
        endereco: endereco.trim() || undefined,
        numero: numero.trim() || undefined,
        complemento: complemento.trim() || undefined,
        bairro: bairro.trim() || undefined,
        cidade: cidade.trim() || undefined,
        estado: estado.trim().toUpperCase() || undefined,
        observacao: observacao.trim() || undefined,
      });

      toast.success("Fornecedor atualizado com sucesso!");
      setAberto(false);

      queryClient.invalidateQueries({
        queryKey: ["fornecedores", empresaEfetivaId],
      });
      queryClient.invalidateQueries({
        queryKey: ["fornecedor", empresaEfetivaId, fornecedor.id],
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao atualizar fornecedor"));
    } finally {
      setSalvando(false);
    }
  }

  if (!podeEditarFornecedor || !empresaEfetivaId) return null;

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title="Editar fornecedor"
      trigger={
        <Button className="w-full md:w-auto" variant="outline" size="sm">
          <Pencil aria-hidden="true" />
          Editar
        </Button>
      }
    >
      <div className="min-w-0 space-y-5">
        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
          <Campo
            label="Razão social *"
            value={razaoSocial}
            onChange={setRazaoSocial}
          />
          <Campo
            label="Nome fantasia"
            value={nomeFantasia}
            onChange={setNomeFantasia}
          />
          <Campo
            label="CPF/CNPJ *"
            value={documento}
            onChange={setDocumento}
          />
          <Campo
            label="Inscrição estadual"
            value={inscricaoEstadual}
            onChange={setInscricaoEstadual}
          />
          <Campo
            label="Inscrição municipal"
            value={inscricaoMunicipal}
            onChange={setInscricaoMunicipal}
          />
          <Campo
            label="Contato"
            value={contato}
            onChange={setContato}
          />
          <Campo
            label="E-mail"
            type="email"
            value={email}
            onChange={setEmail}
          />
          <Campo
            label="Telefone"
            value={telefone}
            onChange={setTelefone}
          />
          <Campo
            label="Celular"
            value={celular}
            onChange={setCelular}
          />
          <Campo
            label="CEP"
            value={cep}
            onChange={setCep}
          />
          <Campo
            label="Endereço"
            value={endereco}
            onChange={setEndereco}
          />
          <Campo
            label="Número"
            value={numero}
            onChange={setNumero}
          />
          <Campo
            label="Complemento"
            value={complemento}
            onChange={setComplemento}
          />
          <Campo
            label="Bairro"
            value={bairro}
            onChange={setBairro}
          />
          <Campo
            label="Cidade"
            value={cidade}
            onChange={setCidade}
          />
          <Campo
            label="UF"
            value={estado}
            onChange={(valor) =>
              setEstado(valor.toUpperCase().slice(0, 2))
            }
          />
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

function Campo({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  type?: string;
}) {
  return (
    <div className="min-w-0">
      <label className="text-sm font-medium text-slate-700">
        {label}
      </label>

      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
