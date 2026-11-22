import assert from "node:assert/strict";
import test from "node:test";
import {
  EDGE_IP_HEADER,
  VALIDATED_IP_HEADER,
  normalizarIpValidado,
  prepararHeadersIngresso,
} from "../src/lib/ip-ingresso.mjs";

function headersCom(entradas) {
  return new Headers(entradas);
}

test("remove o cabeçalho falsificado quando não há origem confiável", () => {
  const headers = headersCom([
    [VALIDATED_IP_HEADER, "198.51.100.99"],
    ["authorization", "Bearer token-real"],
  ]);

  const resultado = prepararHeadersIngresso(headers);

  assert.equal(resultado.has(VALIDATED_IP_HEADER), false);
  assert.equal(resultado.get("authorization"), "Bearer token-real");
});

test("define o IP validado a partir do CF-Connecting-IP", () => {
  const headers = headersCom([[EDGE_IP_HEADER, "203.0.113.10"]]);

  const resultado = prepararHeadersIngresso(headers);

  assert.equal(resultado.get(VALIDATED_IP_HEADER), "203.0.113.10");
});

test("sobrescreve valor falsificado com o valor confiável", () => {
  const headers = headersCom([
    [VALIDATED_IP_HEADER, "198.51.100.99"],
    [EDGE_IP_HEADER, "203.0.113.10"],
  ]);

  const resultado = prepararHeadersIngresso(headers);

  assert.equal(resultado.get(VALIDATED_IP_HEADER), "203.0.113.10");
});

test("aceita IPv6 comprimido no ingresso confiável", () => {
  const headers = headersCom([[EDGE_IP_HEADER, "2001:db8::10"]]);

  const resultado = prepararHeadersIngresso(headers);

  assert.equal(resultado.get(VALIDATED_IP_HEADER), "2001:db8::10");
});

test("não usa x-forwarded-for nem x-real-ip como fonte confiável", () => {
  const headers = headersCom([
    ["x-forwarded-for", "203.0.113.10, 198.51.100.20"],
    ["x-real-ip", "198.51.100.30"],
    [VALIDATED_IP_HEADER, "198.51.100.99"],
  ]);

  const resultado = prepararHeadersIngresso(headers);

  assert.equal(resultado.has(VALIDATED_IP_HEADER), false);
});

test("remove o cabeçalho quando o CF-Connecting-IP é inválido", () => {
  const headers = headersCom([
    [VALIDATED_IP_HEADER, "198.51.100.99"],
    [EDGE_IP_HEADER, "nao-e-um-ip"],
  ]);

  const resultado = prepararHeadersIngresso(headers);

  assert.equal(resultado.has(VALIDATED_IP_HEADER), false);
});

test("remove o cabeçalho quando o CF-Connecting-IP é uma lista", () => {
  const headers = headersCom([
    [EDGE_IP_HEADER, "203.0.113.10, 198.51.100.20"],
  ]);

  const resultado = prepararHeadersIngresso(headers);

  assert.equal(resultado.has(VALIDATED_IP_HEADER), false);
});

test("remove o cabeçalho quando o CF-Connecting-IP está vazio", () => {
  const headers = headersCom([[EDGE_IP_HEADER, "   "]]);

  const resultado = prepararHeadersIngresso(headers);

  assert.equal(resultado.has(VALIDATED_IP_HEADER), false);
});

test("normaliza IPv4, IPv6 completo, IPv6 comprimido e mapeado", () => {
  assert.equal(normalizarIpValidado(" 203.0.113.10 "), "203.0.113.10");
  assert.equal(
    normalizarIpValidado("2001:0db8:85a3:0000:0000:8a2e:0370:7334"),
    "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
  );
  assert.equal(normalizarIpValidado("2001:db8::1"), "2001:db8::1");
  assert.equal(normalizarIpValidado("::ffff:203.0.113.10"), "::ffff:203.0.113.10");
});

test("rejeita valores inválidos, arrays e listas", () => {
  assert.equal(normalizarIpValidado("256.0.0.1"), null);
  assert.equal(normalizarIpValidado("2001:db8:::1"), null);
  assert.equal(normalizarIpValidado(""), null);
  assert.equal(normalizarIpValidado(["203.0.113.10"]), null);
  assert.equal(normalizarIpValidado("203.0.113.10, 198.51.100.20"), null);
  assert.equal(normalizarIpValidado(null), null);
});
