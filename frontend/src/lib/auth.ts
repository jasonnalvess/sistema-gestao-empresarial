import { permissoes } from "./permissoes";

export const PERMISSAO_CLIENTES_VISUALIZAR = "clientes.visualizar";
export const PERMISSAO_CLIENTES_CRIAR = "clientes.criar";
export const PERMISSAO_CLIENTES_EDITAR = "clientes.editar";
export const PERMISSAO_FORNECEDORES_VISUALIZAR = "fornecedores.visualizar";
export const PERMISSAO_FORNECEDORES_CRIAR = "fornecedores.criar";
export const PERMISSAO_FORNECEDORES_EDITAR = "fornecedores.editar";
export const PERMISSAO_PEDIDOS_COMPRA_VISUALIZAR = "pedidos_compra.visualizar";
export const PERMISSAO_PEDIDOS_COMPRA_CRIAR = "pedidos_compra.criar";
export const PERMISSAO_PEDIDOS_COMPRA_EDITAR = "pedidos_compra.editar";
export const PERMISSAO_CONTAS_PAGAR_VISUALIZAR =
  "financeiro.contas_pagar.visualizar";
export const PERMISSAO_CONTAS_PAGAR_CRIAR = "financeiro.contas_pagar.criar";
export const PERMISSAO_CONTAS_PAGAR_EDITAR = "financeiro.contas_pagar.editar";
export const PERMISSAO_CONTAS_PAGAR_PAGAR = "financeiro.contas_pagar.pagar";
export const PERMISSAO_CONTAS_PAGAR_CANCELAR =
  "financeiro.contas_pagar.cancelar";

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  empresaId: string | null;
  perfis: string[];
  permissoes: string[];
};

export type UsuarioComPermissoesOpcionais = Omit<
  Usuario,
  "perfis" | "permissoes"
> &
  Partial<Pick<Usuario, "perfis" | "permissoes">>;

function listaDeStrings(valor: unknown): valor is string[] {
  return (
    Array.isArray(valor) && valor.every((item) => typeof item === "string")
  );
}

export function normalizarUsuario(usuario: unknown): Usuario {
  if (
    typeof usuario !== "object" ||
    usuario === null ||
    typeof (usuario as Record<string, unknown>).id !== "string" ||
    typeof (usuario as Record<string, unknown>).nome !== "string" ||
    typeof (usuario as Record<string, unknown>).email !== "string" ||
    typeof (usuario as Record<string, unknown>).tipo !== "string" ||
    (typeof (usuario as Record<string, unknown>).empresaId !== "string" &&
      (usuario as Record<string, unknown>).empresaId !== null)
  ) {
    throw new Error("Dados de usuário inválidos.");
  }

  const usuarioValidado = usuario as UsuarioComPermissoesOpcionais;

  return {
    ...usuarioValidado,
    perfis: listaDeStrings(usuarioValidado.perfis)
      ? usuarioValidado.perfis
      : [],
    permissoes: listaDeStrings(usuarioValidado.permissoes)
      ? usuarioValidado.permissoes
      : [],
  };
}

export function temPermissao(
  usuario: Usuario | null,
  permissao: string,
): boolean {
  return (
    Array.isArray(usuario?.permissoes) && usuario.permissoes.includes(permissao)
  );
}

// Helper legado de visibilidade de rotas por tipo de usuário.
export function possuiPermissao(tipo: string, rota: string) {
  const lista = permissoes[tipo as keyof typeof permissoes] ?? [];

  return lista.includes(rota);
}
