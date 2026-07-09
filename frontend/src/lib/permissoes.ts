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
    "/marcas-produtos",
    "/estoque",
    "/movimentacoes",
    "/agenda",
    "/ordens-servico",
    "/usuarios",
    "/unidades-medida",
  ],

  USUARIO_EMPRESA: [
    "/dashboard",
    "/clientes",
    "/produtos",
    "/estoque",
    "/agenda",
    "/ordens-servico",
    "/marcas-produtos",
    "/unidades-medida",
  ],
};
