import { isIP } from "node:net";

export const VALIDATED_IP_HEADER = "x-sge-validated-ip";
export const EDGE_IP_HEADER = "cf-connecting-ip";

/**
 * Normaliza um IP recebido do ingresso confiável.
 * Aceita somente string única, sem listas, com IPv4 ou IPv6 válidos.
 *
 * @param {unknown} valor
 * @returns {string | null}
 */
export function normalizarIpValidado(valor) {
  if (typeof valor !== "string") {
    return null;
  }

  const candidato = valor.trim();

  if (!candidato || candidato.includes(",")) {
    return null;
  }

  return isIP(candidato) !== 0 ? candidato : null;
}

/**
 * Remove qualquer IP validado enviado pelo cliente e o redefine somente a
 * partir do cabeçalho entregue pelo Cloudflare.
 *
 * O Cloudflare sobrescreve o CF-Connecting-IP no edge. O acesso direto ao
 * Next.js (LAN/Tailscale) contorna essa garantia e depende de restrição
 * operacional para ser plenamente bloqueado.
 *
 * @param {Headers} headers
 * @returns {Headers}
 */
export function prepararHeadersIngresso(headers) {
  const resultado = new Headers(headers);
  resultado.delete(VALIDATED_IP_HEADER);

  const ipValidado = normalizarIpValidado(headers.get(EDGE_IP_HEADER));

  if (ipValidado) {
    resultado.set(VALIDATED_IP_HEADER, ipValidado);
  }

  return resultado;
}
