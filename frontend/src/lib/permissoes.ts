export const permissoes = {
  SUPER_ADMIN: [
    "/dashboard",
    "/empresas",
    "/usuarios",
    "/modulos",
    "/auditoria",
    "/configuracoes",
  ],

  ADMIN_EMPRESA: [
    "/dashboard",
    "/clientes",
    "/produtos",
    "/categorias",
    "/estoque",
    "/movimentacoes",
    "/agenda",
    "/ordens-servico",
    "/usuarios",
  ],

  USUARIO_EMPRESA: [
    "/dashboard",
    "/clientes",
    "/produtos",
    "/estoque",
    "/agenda",
    "/ordens-servico",
  ],
};
