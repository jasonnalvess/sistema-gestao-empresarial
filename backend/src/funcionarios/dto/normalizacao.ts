export function texto({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
export function textoOpcional({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() || null : value;
}
export function email({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() || null : value;
}
export function digitos({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.replace(/\D/g, '') || null : value;
}
export function uf({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() || null : value;
}
