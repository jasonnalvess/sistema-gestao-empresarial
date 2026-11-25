"use client";
import { rhDialogClass } from "./rh-rotulos";
import { PERMISSAO_FUNCIONARIOS_ESTRUTURA_GERENCIAR } from "@/lib/auth";
import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { CrudCard } from "@/components/crud/CrudCard";
import { CrudToolbar } from "@/components/crud/CrudToolbar";
import { CrudSearch } from "@/components/crud/CrudSearch";
import { CrudPagination } from "@/components/crud/CrudPagination";
import { CrudEmpty } from "@/components/crud/CrudEmpty";
import { CrudLoading } from "@/components/crud/CrudLoading";
import { FormDialog } from "@/components/forms/FormDialog";
import { ConfirmDialog } from "@/components/actions/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  listarEstrutura,
  buscarEstrutura,
  salvarEstrutura,
  alterarStatusEstrutura,
  type Estrutura,
  type EstruturaTipo,
} from "@/services/funcionarios.service";
import { funcionariosQueryKeys as keys } from "@/lib/funcionarios-query-keys";
import { RhBadge, RhErro, useRhOperation } from "./RhShared";
import { selectClass } from "./rh-rotulos";
export function EstruturaLista({
  empresa,
  tipo,
}: {
  empresa: string;
  tipo: EstruturaTipo;
}) {
  const { temPermissao } = useAuth();
  const gerenciar = temPermissao(PERMISSAO_FUNCIONARIOS_ESTRUTURA_GERENCIAR);
  const { pending, executar } = useRhOperation(empresa);
  const [search, setSearch] = useState("");
  const [aplicado, setAplicado] = useState("");
  const [ativo, setAtivo] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<string | null>(null);
  const filtros = {
    search: aplicado || undefined,
    ativo: ativo === "" ? undefined : ativo === "true",
    page,
    limit: 10,
  };
  const query = useQuery({
    queryKey: keys.estrutura(empresa, tipo, filtros),
    queryFn: ({ signal }) => listarEstrutura(tipo, filtros, signal),
  });
  const nome = tipo === "cargos" ? "cargo" : "departamento";
  return (
    <CrudCard>
      <div className="[&>div]:flex-wrap [&>div>form]:flex-1 [&>div>form]:basis-full lg:[&>div>form]:basis-auto [&>div>button]:w-full lg:[&>div>button]:w-auto">
        <CrudToolbar>
          <CrudSearch
            value={search}
            onChange={setSearch}
            onSearch={() => {
              setAplicado(search.trim());
              setPage(1);
            }}
            placeholder={`Pesquisar ${tipo}`}
          />
          {gerenciar && (
            <Button onClick={() => setModal("")}>Novo {nome}</Button>
          )}
        </CrudToolbar>
      </div>
      <label className="my-3 block w-full min-w-0 space-y-1 sm:max-w-xs">
        Situação
        <select
          className={selectClass}
          value={ativo}
          onChange={(e) => {
            setAtivo(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
      </label>
      <RhErro error={query.error} tentar={() => void query.refetch()} />
      {query.isLoading ? (
        <CrudLoading />
      ) : (
        !query.error && (
          <>
            <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain">
              <Table className="[&_td]:max-w-xs [&_td]:whitespace-normal [&_td]:[overflow-wrap:anywhere]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.data?.data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.nome}</TableCell>
                      <TableCell className="max-w-sm whitespace-normal">
                        {item.descricao ?? "—"}
                      </TableCell>
                      <TableCell>
                        <RhBadge ativo={item.ativo}>
                          {item.ativo ? "Ativo" : "Inativo"}
                        </RhBadge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setModal(item.id)}
                          >
                            {gerenciar ? "Ver / editar" : "Ver detalhes"}
                          </Button>
                          {gerenciar && (
                            <ConfirmDialog
                              title={`${item.ativo ? "Inativar" : "Ativar"} ${nome}?`}
                              description={
                                item.ativo
                                  ? "Os vínculos existentes serão preservados. O registro ficará indisponível para novas associações."
                                  : "O registro ficará disponível para novas associações."
                              }
                              trigger={
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={pending}
                                >
                                  {item.ativo ? "Inativar" : "Ativar"}
                                </Button>
                              }
                              onConfirm={() => {
                                if (!pending)
                                  void executar(() =>
                                    alterarStatusEstrutura(
                                      tipo,
                                      item.id,
                                      !item.ativo,
                                    ),
                                  );
                              }}
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {!query.data?.data.length && (
              <CrudEmpty message="Nenhum registro encontrado." />
            )}
            <CrudPagination
              page={page}
              totalPages={query.data?.meta.totalPages ?? 1}
              onPageChange={setPage}
            />
          </>
        )
      )}
      <FormDialog
        contentClassName={rhDialogClass}
        open={modal !== null}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
        title={modal ? `Detalhes do ${nome}` : `Novo ${nome}`}
        trigger={<span hidden />}
      >
        {modal !== null && (
          <EstruturaDetalhe
            key={modal}
            empresa={empresa}
            tipo={tipo}
            id={modal}
            editar={gerenciar}
            fechar={() => setModal(null)}
          />
        )}
      </FormDialog>
    </CrudCard>
  );
}
function EstruturaDetalhe({
  empresa,
  tipo,
  id,
  editar,
  fechar,
}: {
  empresa: string;
  tipo: EstruturaTipo;
  id: string;
  editar: boolean;
  fechar: () => void;
}) {
  const query = useQuery({
    queryKey: keys.estruturaDetalhe(empresa, tipo, id),
    queryFn: ({ signal }) => buscarEstrutura(tipo, id, signal),
    enabled: Boolean(id),
  });
  if (id && query.isLoading) return <CrudLoading />;
  if (query.error)
    return <RhErro error={query.error} tentar={() => void query.refetch()} />;
  if (id && !query.data) return null;
  return (
    <EstruturaForm
      empresa={empresa}
      tipo={tipo}
      item={query.data}
      editar={editar}
      fechar={fechar}
    />
  );
}
function EstruturaForm({
  empresa,
  tipo,
  item,
  editar,
  fechar,
}: {
  empresa: string;
  tipo: EstruturaTipo;
  item?: Estrutura;
  editar: boolean;
  fechar: () => void;
}) {
  const { pending, executar } = useRhOperation(empresa);
  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editar) return;
    const data = new FormData(e.currentTarget);
    await executar(
      () =>
        salvarEstrutura(
          tipo,
          {
            nome: String(data.get("nome")).trim(),
            descricao: String(data.get("descricao") ?? "").trim() || null,
          },
          item?.id,
        ),
      fechar,
      fechar,
    );
  }
  return (
    <form
      onSubmit={enviar}
      className="min-w-0 space-y-4 [overflow-wrap:anywhere]"
    >
      <fieldset
        disabled={pending || !editar}
        className="min-w-0 space-y-4 [overflow-wrap:anywhere]"
      >
        <label className="block min-w-0 space-y-1">
          Nome
          <Input name="nome" required defaultValue={item?.nome} />
        </label>
        <label className="block min-w-0 space-y-1">
          Descrição
          <Textarea name="descricao" defaultValue={item?.descricao ?? ""} />
        </label>
      </fieldset>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={fechar}
        >
          Fechar
        </Button>
        {editar && (
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        )}
      </div>
    </form>
  );
}
