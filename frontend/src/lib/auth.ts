import { permissoes } from "./permissoes";

export function possuiPermissao(
  tipo: string,
  rota: string
) {
  const lista =
    permissoes[tipo as keyof typeof permissoes] ?? [];

  return lista.includes(rota);
}
