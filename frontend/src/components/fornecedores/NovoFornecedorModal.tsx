"use client";

import { obterMensagemErro } from "@/lib/api-error";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/forms/FormDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import { PERMISSAO_FORNECEDORES_CRIAR } from "@/lib/auth";

import { criarFornecedor } from "@/services/fornecedores.service";

export function NovoFornecedorModal() {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId } = useEmpresaSelecionada();
  const podeCriarFornecedor = temPermissao(PERMISSAO_FORNECEDORES_CRIAR);

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [documento, setDocumento] = useState("");
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");
  const [inscricaoMunicipal, setInscricaoMunicipal] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [celular, setCelular] = useState("");
  const [contato, setContato] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [observacao, setObservacao] = useState("");

  function limparCampos() {
    setRazaoSocial("");
    setNomeFantasia("");
    setDocumento("");
    setInscricaoEstadual("");
    setInscricaoMunicipal("");
    setEmail("");
    setTelefone("");
    setCelular("");
    setContato("");
    setCep("");
    setEndereco("");
    setNumero("");
    setComplemento("");
    setBairro("");
    setCidade("");
    setEstado("");
    setObservacao("");
  }

  async function salvar() {
    if (!podeCriarFornecedor) {
      toast.error("Você não possui permissão para esta ação.");
      return;
    }
    if (!empresaEfetivaId) {
      toast.error("Selecione uma empresa para realizar esta ação.");
      return;
    }
    if (!razaoSocial.trim()) {
      toast.error("Informe a razão social.");
      return;
    }

    if (documento.replace(/\D/g, "").length < 11) {
      toast.error("Informe um CPF ou CNPJ válido.");
      return;
    }

    if (estado && estado.length !== 2) {
      toast.error("A UF deve possuir dois caracteres.");
      return;
    }

    try {
      setSalvando(true);

      await criarFornecedor({
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

      toast.success("Fornecedor cadastrado com sucesso!");

      limparCampos();
      setAberto(false);

      queryClient.invalidateQueries({
        queryKey: ["fornecedores", empresaEfetivaId],
      });
    } catch (error: unknown) {
      toast.error(obterMensagemErro(error, "Erro ao cadastrar fornecedor"));
    } finally {
      setSalvando(false);
    }
  }

  if (!podeCriarFornecedor || !empresaEfetivaId) return null;

  return (
    <FormDialog
      open={aberto}
      onOpenChange={setAberto}
      title="Novo fornecedor"
      trigger={
        <Button>
          <Plus size={16} className="mr-2" />
          Novo fornecedor
        </Button>
      }
    >
      <div className="max-h-[75vh] space-y-5 overflow-y-auto pr-2">
        <div className="grid gap-4 md:grid-cols-2">
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

        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => setAberto(false)}
            disabled={salvando}
          >
            Cancelar
          </Button>

          <Button
            onClick={salvar}
            disabled={
              salvando ||
              !razaoSocial.trim() ||
              !documento.trim()
            }
          >
            {salvando ? "Salvando..." : "Salvar fornecedor"}
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
    <div>
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
