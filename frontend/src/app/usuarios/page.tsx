"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";

import { CrudCard } from "@/components/crud/CrudCard";
import { CrudToolbar } from "@/components/crud/CrudToolbar";
import { CrudSearch } from "@/components/crud/CrudSearch";
import { CrudStatusBadge } from "@/components/crud/CrudStatusBadge";
import { CrudPagination } from "@/components/crud/CrudPagination";
import { CrudEmpty } from "@/components/crud/CrudEmpty";
import { CrudLoading } from "@/components/crud/CrudLoading";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { listarUsuarios } from "@/services/usuarios.service";
import { NovoUsuarioModal } from "@/components/usuarios/NovoUsuarioModal";
import { EditarUsuarioModal } from "@/components/usuarios/EditarUsuarioModal";
import { AlterarStatusUsuarioButton } from "@/components/usuarios/AlterarStatusUsuarioButton";

function formatarTipo(tipo: string) {
  if (tipo === "SUPER_ADMIN") return "Super Admin";
  if (tipo === "ADMIN_EMPRESA") return "Admin Empresa";
  if (tipo === "USUARIO_EMPRESA") return "Usuário Empresa";

  return tipo;
}

export default function UsuariosPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["usuarios", page],
    queryFn: () =>
      listarUsuarios({
        page,
        limit: 10,
      }),
  });

  function pesquisar() {
    setPage(1);
  }

  const usuarios = Array.isArray(data?.data) ? data.data : [];
  const totalPages = data?.meta?.totalPages ?? 1;

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Usuários"
          description="Gerencie os usuários cadastrados no sistema."
          actions={<NovoUsuarioModal />}
        />

        <CrudCard>
          <CrudToolbar>
            <CrudSearch
              value={search}
              onChange={setSearch}
              onSearch={pesquisar}
              placeholder="Busca será ativada na próxima etapa..."
            />
          </CrudToolbar>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Erro ao carregar usuários.
            </div>
          )}

          {isLoading ? (
            <CrudLoading />
          ) : (
            <>
              <div className="mt-5 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {usuarios.map((usuario) => (
                      <TableRow key={usuario.id}>
                        <TableCell className="font-medium">
                          {usuario.nome}
                        </TableCell>

                        <TableCell>{usuario.email}</TableCell>

                        <TableCell>{formatarTipo(usuario.tipo)}</TableCell>

                        <TableCell>
                          <CrudStatusBadge ativo={usuario.ativo} />
                        </TableCell>

                        <TableCell>
                          {new Date(usuario.createdAt).toLocaleString("pt-BR")}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <EditarUsuarioModal usuario={usuario} />
                            <AlterarStatusUsuarioButton usuario={usuario} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {usuarios.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <CrudEmpty message="Nenhum usuário encontrado." />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <CrudPagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </>
          )}
        </CrudCard>
      </div>
    </AppLayout>
  );
}
