"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, LockKeyhole, Save } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/actions/ConfirmDialog";
import { SeletorPermissoes } from "@/components/perfis/SeletorPermissoes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaSelecionada } from "@/contexts/EmpresaSelecionadaContext";
import {
  PERMISSAO_PERFIS_PERMISSOES_GERENCIAR,
  PERMISSAO_PERFIS_VISUALIZAR,
} from "@/lib/auth";
import { obterMensagemErro } from "@/lib/api-error";
import { perfisQueryKeys } from "@/lib/perfis-query-keys";
import {
  buscarPerfil,
  configurarPermissoesPerfil,
  listarPermissoesDelegaveis,
  type Perfil,
} from "@/services/perfis.service";

type Props = {
  perfil: Perfil;
};

export function PermissoesPerfilModal({ perfil }: Props) {
  const queryClient = useQueryClient();
  const { temPermissao } = useAuth();
  const { empresaEfetivaId, carregando } = useEmpresaSelecionada();

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [selecionadasEditadas, setSelecionadasEditadas] =
    useState<Set<string> | null>(null);

  const podeVisualizar = temPermissao(PERMISSAO_PERFIS_VISUALIZAR);

  const podeGerenciar =
    temPermissao(PERMISSAO_PERFIS_PERMISSOES_GERENCIAR) && !perfil.sistema;

  const detalheQuery = useQuery({
    queryKey: perfisQueryKeys.detalhe(empresaEfetivaId ?? "", perfil.id),
    queryFn: () => buscarPerfil(perfil.id),
    enabled:
      aberto && podeVisualizar && Boolean(empresaEfetivaId) && !carregando,
  });

  const delegaveisQuery = useQuery({
    queryKey: perfisQueryKeys.permissoesDelegaveis(empresaEfetivaId ?? ""),
    queryFn: listarPermissoesDelegaveis,
    enabled:
      aberto && podeGerenciar && Boolean(empresaEfetivaId) && !carregando,
  });

  const detalhe = detalheQuery.data;

  const idsDelegaveis = useMemo(
    () =>
      new Set(
        (delegaveisQuery.data?.data ?? []).map((permissao) => permissao.id),
      ),
    [delegaveisQuery.data],
  );

  const associacoesForaDoLimite = useMemo(() => {
    if (!detalhe || !podeGerenciar) {
      return [];
    }

    return detalhe.permissoes.filter(
      (permissao) => !idsDelegaveis.has(permissao.id),
    );
  }, [detalhe, idsDelegaveis, podeGerenciar]);

  const possuiAssociacoesForaDoLimite = associacoesForaDoLimite.length > 0;

  const selecionadasOriginais = useMemo(() => {
    if (!detalhe) {
      return new Set<string>();
    }

    return new Set(
      detalhe.permissoes
        .filter(
          (permissao) =>
            permissao.permitido &&
            (!podeGerenciar || idsDelegaveis.has(permissao.id)),
        )
        .map((permissao) => permissao.id),
    );
  }, [detalhe, idsDelegaveis, podeGerenciar]);

  const selecionadas = selecionadasEditadas ?? selecionadasOriginais;

  const houveAlteracao = useMemo(() => {
    if (selecionadasEditadas === null) {
      return false;
    }

    if (selecionadasEditadas.size !== selecionadasOriginais.size) {
      return true;
    }

    return [...selecionadasEditadas].some(
      (id) => !selecionadasOriginais.has(id),
    );
  }, [selecionadasEditadas, selecionadasOriginais]);

  async function salvarPermissoes() {
    if (
      !podeGerenciar ||
      !empresaEfetivaId ||
      carregando ||
      salvando ||
      possuiAssociacoesForaDoLimite ||
      !houveAlteracao
    ) {
      return;
    }

    try {
      setSalvando(true);

      await configurarPermissoesPerfil(perfil.id, {
        permissoes: [...selecionadas].sort().map((permissaoId) => ({
          permissaoId,
          permitido: true,
        })),
      });

      toast.success("Permissões do perfil atualizadas com sucesso!");

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: perfisQueryKeys.listas(empresaEfetivaId),
        }),
        queryClient.invalidateQueries({
          queryKey: perfisQueryKeys.detalhe(empresaEfetivaId, perfil.id),
        }),
        queryClient.invalidateQueries({
          queryKey: perfisQueryKeys.permissoesDelegaveis(empresaEfetivaId),
        }),
      ]);

      setSelecionadasEditadas(null);
      setAberto(false);
    } catch (error: unknown) {
      toast.error(
        obterMensagemErro(error, "Erro ao atualizar as permissões do perfil."),
      );
    } finally {
      setSalvando(false);
    }
  }

  const permissoesVisualizacao = useMemo(() => {
    if (!detalhe) {
      return [];
    }

    return detalhe.permissoes.map((permissao) => ({
      id: permissao.id,
      nome: permissao.nome,
      chave: permissao.chave,
      descricao: permissao.descricao,
      modulo: permissao.modulo,
      ativo: permissao.ativo,
    }));
  }, [detalhe]);

  const permissoesExibidas = podeGerenciar
    ? (delegaveisQuery.data?.data ?? [])
    : permissoesVisualizacao;

  const carregandoDados =
    detalheQuery.isLoading || (podeGerenciar && delegaveisQuery.isLoading);

  const erroDados =
    detalheQuery.error || (podeGerenciar ? delegaveisQuery.error : null);

  if (!podeVisualizar || !empresaEfetivaId || carregando) {
    return null;
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(novoEstado) => {
        if (salvando) {
          return;
        }

        setAberto(novoEstado);

        if (!novoEstado) {
          setSelecionadasEditadas(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <KeyRound size={14} aria-hidden="true" />
          Permissões
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Permissões — {perfil.nome}
            {perfil.sistema && (
              <LockKeyhole
                className="size-4 text-slate-500"
                aria-label="Perfil padrão protegido"
              />
            )}
          </DialogTitle>

          <DialogDescription>
            {perfil.sistema
              ? "Perfil padrão protegido. As permissões podem ser consultadas, mas não alteradas."
              : podeGerenciar
                ? "Consulte as permissões atuais e selecione apenas as permissões que você está autorizado a delegar."
                : "Você possui acesso somente para consulta das permissões deste perfil."}
          </DialogDescription>
        </DialogHeader>

        {carregandoDados && (
          <div
            className="py-12 text-center text-sm text-slate-500"
            aria-live="polite"
          >
            Carregando permissões...
          </div>
        )}

        {erroDados && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 p-4 text-sm text-red-700"
          >
            Não foi possível carregar as permissões do perfil.
          </div>
        )}

        {!carregandoDados && !erroDados && detalhe && (
          <div className="space-y-5">
            <div className="grid gap-3 rounded-lg border bg-slate-50 p-4 text-sm sm:grid-cols-3">
              <div>
                <span className="block text-xs text-slate-500">Perfil</span>
                <span className="font-medium text-slate-900">
                  {detalhe.nome}
                </span>
              </div>

              <div>
                <span className="block text-xs text-slate-500">Tipo</span>
                <span className="font-medium text-slate-900">
                  {detalhe.sistema ? "Padrão" : "Personalizado"}
                </span>
              </div>

              <div>
                <span className="block text-xs text-slate-500">
                  Permissões concedidas
                </span>
                <span className="font-medium text-slate-900">
                  {
                    detalhe.permissoes.filter(
                      (permissao) => permissao.permitido,
                    ).length
                  }
                </span>
              </div>
            </div>

            {podeGerenciar && possuiAssociacoesForaDoLimite && (
              <div
                role="alert"
                className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              >
                <p className="font-medium">
                  Este perfil possui permissões fora do seu limite de delegação.
                </p>

                <p>
                  Por segurança, as permissões deste perfil não podem ser
                  alteradas por este usuário. Nenhuma associação será removida
                  automaticamente.
                </p>

                <ul className="list-disc space-y-1 pl-5">
                  {associacoesForaDoLimite.map((permissao) => (
                    <li key={permissao.id}>
                      <span className="font-medium">{permissao.nome}</span>{" "}
                      <code className="text-xs">{permissao.chave}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {podeGerenciar && !possuiAssociacoesForaDoLimite && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                As permissões exibidas abaixo correspondem ao seu limite atual
                de delegação. Alterações podem revogar as sessões dos usuários
                vinculados a este perfil.
              </div>
            )}

            <SeletorPermissoes
              permissoes={permissoesExibidas}
              selecionadas={selecionadas}
              onChange={setSelecionadasEditadas}
              disabled={!podeGerenciar || possuiAssociacoesForaDoLimite}
            />

            <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setAberto(false)}
                disabled={salvando}
              >
                Fechar
              </Button>

              {podeGerenciar && !possuiAssociacoesForaDoLimite && (
                <ConfirmDialog
                  title="Salvar permissões do perfil?"
                  description={`As permissões do perfil "${perfil.nome}" serão substituídas pela seleção atual. Usuários vinculados poderão ter suas sessões revogadas e precisar entrar novamente no sistema.`}
                  confirmText="Salvar permissões"
                  onConfirm={salvarPermissoes}
                  trigger={
                    <Button disabled={!houveAlteracao || salvando}>
                      <Save size={14} aria-hidden="true" />
                      {salvando ? "Salvando..." : "Salvar permissões"}
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
