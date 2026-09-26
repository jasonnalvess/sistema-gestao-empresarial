/** Formata uma data civil sem convertê-la para UTC ou para o fuso local. */
export function formatarDataCivil(valor: string | null): string {
  if (!valor) return "-";

  const [ano, mes, dia] = valor.slice(0, 10).split("-");
  if (!ano || !mes || !dia) return valor;

  return `${dia}/${mes}/${ano}`;
}
