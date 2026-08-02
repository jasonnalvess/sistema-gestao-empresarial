import { permissoes } from "./permissoes";

export const PERMISSAO_ORDENS_SERVICO_VISUALIZAR = "ordens_servico.visualizar";
export const PERMISSAO_ORDENS_SERVICO_CRIAR = "ordens_servico.criar";
export const PERMISSAO_ORDENS_SERVICO_HISTORICO_ADICIONAR =
  "ordens_servico.historico.adicionar";
export const PERMISSAO_ORDENS_SERVICO_STATUS_ALTERAR =
  "ordens_servico.status.alterar";
export const PERMISSAO_AGENDA_VISUALIZAR = "agenda.visualizar";
export const PERMISSAO_AGENDA_CRIAR = "agenda.criar";
export const PERMISSAO_AGENDA_EDITAR = "agenda.editar";
export const PERMISSAO_AGENDA_CANCELAR = "agenda.cancelar";

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
export const PERMISSAO_CONTAS_RECEBER_VISUALIZAR =
  "financeiro.contas_receber.visualizar";
export const PERMISSAO_CONTAS_RECEBER_CRIAR = "financeiro.contas_receber.criar";
export const PERMISSAO_CONTAS_RECEBER_EDITAR =
  "financeiro.contas_receber.editar";
export const PERMISSAO_CONTAS_RECEBER_RECEBER =
  "financeiro.contas_receber.receber";
export const PERMISSAO_CONTAS_RECEBER_CANCELAR =
  "financeiro.contas_receber.cancelar";
export const PERMISSAO_PRODUTOS_VISUALIZAR = "estoque.produtos.visualizar";
export const PERMISSAO_PRODUTOS_CRIAR = "estoque.produtos.criar";
export const PERMISSAO_PRODUTOS_EDITAR = "estoque.produtos.editar";
export const PERMISSAO_CATEGORIAS_VISUALIZAR = "estoque.categorias.visualizar";
export const PERMISSAO_CATEGORIAS_CRIAR = "estoque.categorias.criar";
export const PERMISSAO_CATEGORIAS_EDITAR = "estoque.categorias.editar";
export const PERMISSAO_MARCAS_VISUALIZAR = "estoque.marcas.visualizar";
export const PERMISSAO_MARCAS_CRIAR = "estoque.marcas.criar";
export const PERMISSAO_MARCAS_EDITAR = "estoque.marcas.editar";
export const PERMISSAO_UNIDADES_VISUALIZAR = "estoque.unidades.visualizar";
export const PERMISSAO_UNIDADES_CRIAR = "estoque.unidades.criar";
export const PERMISSAO_UNIDADES_EDITAR = "estoque.unidades.editar";
export const PERMISSAO_DEPOSITOS_VISUALIZAR = "estoque.depositos.visualizar";
export const PERMISSAO_DEPOSITOS_CRIAR = "estoque.depositos.criar";
export const PERMISSAO_DEPOSITOS_EDITAR = "estoque.depositos.editar";
export const PERMISSAO_ESTOQUE_VISUALIZAR = "estoque.visualizar";
export const PERMISSAO_ESTOQUE_AJUSTAR = "estoque.ajustes.realizar";
export const PERMISSAO_MOVIMENTACOES_VISUALIZAR =
  "estoque.movimentacoes.visualizar";
export const PERMISSAO_ENTRADAS_REGISTRAR = "estoque.entradas.registrar";
export const PERMISSAO_SAIDAS_REGISTRAR = "estoque.saidas.registrar";
export const PERMISSAO_TRANSFERENCIAS_REALIZAR =
  "estoque.transferencias.realizar";
export const PERMISSAO_INVENTARIOS_VISUALIZAR =
  "estoque.inventarios.visualizar";
export const PERMISSAO_INVENTARIOS_CRIAR = "estoque.inventarios.criar";
export const PERMISSAO_INVENTARIOS_EDITAR = "estoque.inventarios.editar";
export const PERMISSAO_INVENTARIOS_FINALIZAR = "estoque.inventarios.finalizar";
export const PERMISSAO_INVENTARIOS_CANCELAR = "estoque.inventarios.cancelar";

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
