import axios, { CanceledError } from "axios";
import { normalizarUsuario } from "@/lib/auth";
import { EMPRESA_ID_HEADER } from "@/lib/empresa-contexto";

const EVENTO_SESSAO_EXPIRADA = "auth:sessao-expirada";

let geracaoSessao = 0;
const sessoesDasRequisicoes = new WeakMap<
  object,
  { geracao: number; token: string | null }
>();

// Apenas isolamento de respostas no navegador; a revogação é validada no backend.
export function invalidarRequisicoesDaSessao() {
  geracaoSessao += 1;
}

function respostaDeSessaoAnterior(config: object | undefined): boolean {
  if (!config || typeof window === "undefined") return false;
  const sessao = sessoesDasRequisicoes.get(config);
  return Boolean(
    sessao &&
    (sessao.geracao !== geracaoSessao ||
      sessao.token !== localStorage.getItem("token")),
  );
}
let empresaOperacional: { usuarioId: string; empresaId: string } | null = null;

export function definirEmpresaOperacional(
  usuarioId: string,
  empresaId: string,
) {
  empresaOperacional = { usuarioId, empresaId };
}

export function limparEmpresaOperacional() {
  empresaOperacional = null;
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      sessoesDasRequisicoes.set(config, { geracao: geracaoSessao, token });

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      delete config.headers[EMPRESA_ID_HEADER];

      const usuarioSalvo = localStorage.getItem("usuario");
      if (usuarioSalvo) {
        try {
          const usuario = normalizarUsuario(JSON.parse(usuarioSalvo));
          if (
            usuario.tipo === "SUPER_ADMIN" &&
            empresaOperacional?.usuarioId === usuario.id
          ) {
            config.headers[EMPRESA_ID_HEADER] = empresaOperacional.empresaId;
          }
        } catch {
          limparEmpresaOperacional();
        }
      }
    }

    return config;
  },
  undefined,
  { synchronous: true },
);

api.interceptors.response.use(
  (response) => {
    if (respostaDeSessaoAnterior(response.config)) {
      throw new CanceledError("Resposta de sessão anterior descartada.");
    }
    return response;
  },
  (error) => {
    if (typeof window === "undefined") {
      return Promise.reject(error);
    }

    if (respostaDeSessaoAnterior(error.config)) {
      return Promise.reject(
        new CanceledError("Resposta de sessão anterior descartada."),
      );
    }

    const status = error.response?.status;
    const urlRequisicao = String(error.config?.url ?? "");
    const possuiToken = Boolean(localStorage.getItem("token"));

    const requisicaoDeLogin =
      urlRequisicao.includes("/auth/login") ||
      window.location.pathname === "/login";

    if (status === 401 && possuiToken && !requisicaoDeLogin) {
      invalidarRequisicoesDaSessao();

      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      limparEmpresaOperacional();

      window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
    }

    return Promise.reject(error);
  },
);

export { EVENTO_SESSAO_EXPIRADA };
