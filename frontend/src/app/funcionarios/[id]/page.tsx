"use client";
import {
  PERMISSAO_FUNCIONARIOS_DADOS_PESSOAIS_VISUALIZAR,
  PERMISSAO_FUNCIONARIOS_DADOS_PESSOAIS_EDITAR,
} from "@/lib/auth";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/common/PageHeader";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RhScope, RhBadge, RhErro } from "@/components/funcionarios/RhShared";
import { FuncionarioForm } from "@/components/funcionarios/FuncionarioForm";
import { DadosPessoaisCard } from "@/components/funcionarios/DadosPessoaisCard";
import { AcessoFuncionarioCard } from "@/components/funcionarios/AcessoFuncionarioCard";
import { SituacaoFuncionarioModal } from "@/components/funcionarios/SituacaoFuncionarioModal";
import { HistoricoFuncionario } from "@/components/funcionarios/HistoricoFuncionario";
import {
  statusRotulos,
  vinculoRotulos,
  acessoRotulos,
  dataCivil,
} from "@/components/funcionarios/rh-rotulos";
import { buscarFuncionario } from "@/services/funcionarios.service";
import { funcionariosQueryKeys as keys } from "@/lib/funcionarios-query-keys";
export default function FuncionarioPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <RhScope>
      {(empresa) => <Ficha key={id} empresa={empresa} id={id} />}
    </RhScope>
  );
}
function Ficha({ empresa, id }: { empresa: string; id: string }) {
  const { temPermissao } = useAuth();
  const query = useQuery({
    queryKey: keys.detalhe(empresa, id),
    queryFn: ({ signal }) => buscarFuncionario(id, signal),
  });
  if (query.isLoading) return <CrudLoading />;
  if (query.error)
    return <RhErro error={query.error} tentar={() => void query.refetch()} />;
  const f = query.data;
  if (!f) return null;
  const pessoais =
    temPermissao(PERMISSAO_FUNCIONARIOS_DADOS_PESSOAIS_VISUALIZAR) ||
    temPermissao(PERMISSAO_FUNCIONARIOS_DADOS_PESSOAIS_EDITAR);
  const profissionais = [
    ["Nome", f.nome],
    ["Nome preferido", f.nomePreferido],
    ["Matrícula", f.matricula],
    ["Admissão", dataCivil(f.dataAdmissao)],
    ["Vínculo", vinculoRotulos[f.tipoVinculo]],
    [
      "Cargo",
      f.cargo ? `${f.cargo.nome}${f.cargo.ativo ? "" : " (inativo)"}` : null,
    ],
    [
      "Departamento",
      f.departamento
        ? `${f.departamento.nome}${f.departamento.ativo ? "" : " (inativo)"}`
        : null,
    ],
    [
      "Gestor",
      f.gestor
        ? `${f.gestor.nomePreferido || f.gestor.nome} — ${f.gestor.matricula}`
        : null,
    ],
    ["E-mail corporativo", f.emailCorporativo],
    ["Telefone corporativo", f.telefoneCorporativo],
  ];
  return (
    <div className="min-w-0 max-w-full space-y-6 [overflow-wrap:anywhere]">
      <Link href="/funcionarios" className="text-sm text-blue-700 underline">
        Voltar para funcionários
      </Link>
      <PageHeader
        title={f.nomePreferido || f.nome}
        description={`Matrícula ${f.matricula}`}
        actions={
          <>
            <FuncionarioForm empresa={empresa} funcionario={f} />
            <SituacaoFuncionarioModal empresa={empresa} funcionario={f} />
          </>
        }
      />
      <CrudCard>
        <div className="flex flex-wrap gap-2">
          <RhBadge ativo={f.status === "ATIVO"}>
            {statusRotulos[f.status]}
          </RhBadge>
          <RhBadge>{vinculoRotulos[f.tipoVinculo]}</RhBadge>
          <RhBadge ativo={f.estadoAcesso === "USUARIO_ATIVO"}>
            {acessoRotulos[f.estadoAcesso]}
          </RhBadge>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Admissão em {dataCivil(f.dataAdmissao)} · Atualizado em{" "}
          {new Date(f.updatedAt).toLocaleString("pt-BR")}
        </p>
        {f.status === "DESLIGADO" && (
          <p className="mt-3 text-sm text-amber-800">
            Funcionário desligado. Recontratação não está disponível nesta
            versão.
          </p>
        )}
      </CrudCard>
      <Tabs defaultValue="profissionais">
        <TabsList
          className="min-w-0 max-w-full shrink-0 overflow-x-auto overscroll-x-contain [&>button]:flex-none"
          aria-label="Áreas da ficha"
        >
          <TabsTrigger value="profissionais">Dados profissionais</TabsTrigger>
          {pessoais && (
            <TabsTrigger value="pessoais">Dados pessoais</TabsTrigger>
          )}
          <TabsTrigger value="acesso">Acesso</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>
        <TabsContent value="profissionais">
          <CrudCard>
            <h2 className="mb-4 text-lg font-semibold">Dados profissionais</h2>
            <dl className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3 [&>div]:min-w-0">
              {profissionais.map(([label, valor]) => (
                <div key={label}>
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="min-w-0 [overflow-wrap:anywhere]">
                    {valor || "Não informado"}
                  </dd>
                </div>
              ))}
            </dl>
          </CrudCard>
        </TabsContent>
        {pessoais && (
          <TabsContent value="pessoais">
            <DadosPessoaisCard empresa={empresa} funcionario={f} />
          </TabsContent>
        )}
        <TabsContent value="acesso">
          <AcessoFuncionarioCard empresa={empresa} funcionario={f} />
        </TabsContent>
        <TabsContent value="historico">
          <HistoricoFuncionario empresa={empresa} id={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
