import { permissoes } from "./permissoes";

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
    Array.isArray(valor) &&
    valor.every((item) => typeof item === "string")
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
  permissao: string
): boolean {
  return (
    Array.isArray(usuario?.permissoes) &&
    usuario.permissoes.includes(permissao)
  );
}

// Helper legado de visibilidade de rotas por tipo de usuário.
export function possuiPermissao(
  tipo: string,
  rota: string
) {
  const lista =
    permissoes[tipo as keyof typeof permissoes] ?? [];

  return lista.includes(rota);
}
