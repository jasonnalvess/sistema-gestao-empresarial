import axios from "axios";

const EVENTO_SESSAO_EXPIRADA = "auth:sessao-expirada";

let tratandoSessaoExpirada = false;

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window === "undefined") {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const urlRequisicao = String(error.config?.url ?? "");
    const possuiToken = Boolean(localStorage.getItem("token"));

    const requisicaoDeLogin =
      urlRequisicao.includes("/auth/login") ||
      window.location.pathname === "/login";

    if (
      status === 401 &&
      possuiToken &&
      !requisicaoDeLogin &&
      !tratandoSessaoExpirada
    ) {
      tratandoSessaoExpirada = true;

      localStorage.removeItem("token");
      localStorage.removeItem("usuario");

      window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));

      window.setTimeout(() => {
        tratandoSessaoExpirada = false;
      }, 1000);
    }

    return Promise.reject(error);
  }
);

export { EVENTO_SESSAO_EXPIRADA };
