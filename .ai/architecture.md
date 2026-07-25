# Arquitetura

## Visao geral

O repositorio contem um sistema de gestao empresarial SaaS multiempresa dividido em duas aplicacoes:

- `backend/`: API NestJS com TypeScript, Prisma e PostgreSQL;
- `frontend/`: aplicacao Next.js com React, TypeScript e Tailwind CSS.

O fluxo principal e:

```text
Frontend Next.js
  -> service do modulo / Axios
  -> API HTTP NestJS
  -> controller + guards + DTO
  -> service com regra de negocio e tenant
  -> Prisma Client
  -> PostgreSQL
```

React Query gerencia dados remotos no frontend. Formularios devem usar React Hook Form e Zod. Graficos usam Recharts.

## Backend

Estrutura principal observada:

- `backend/src/app.module.ts`: composicao dos modulos ativos;
- `backend/src/main.ts`: inicializacao da API;
- `backend/src/<modulo>/`: module, controller, service, DTOs e testes;
- `backend/src/auth/`: JWT, guards, roles e estrategia de autenticacao;
- `backend/src/common/`: interceptors, filtros, decorators, DTOs e utilitarios compartilhados;
- `backend/src/prisma/`: modulo e service do Prisma;
- `backend/prisma/schema.prisma`: schema ativo;
- `backend/prisma/migrations/`: historico de migrations;
- `backend/test/`: configuracao e testes E2E.

Modulos registrados no `AppModule` no momento desta documentacao:

- Prisma;
- empresas;
- usuarios;
- autenticacao;
- modulos do sistema;
- modulos por empresa;
- categorias de produtos;
- produtos;
- estoque;
- movimentacoes de estoque;
- auditoria;
- dashboard;
- agenda;
- clientes;
- ordens de servico.

Existem diretorios de `inventarios-estoque`, `pedidos-compra` e `contas-receber` no worktree, mas eles nao estao registrados no `AppModule` atual. Sua integracao e seu estado devem ser confirmados antes de uso.

Padroes observados:

- controllers protegidos por guards e decorators de roles;
- DTOs com validacao na borda HTTP;
- regras e consultas Prisma nos services;
- interceptors globais de auditoria e resposta;
- filtro global de excecoes HTTP;
- testes `.spec.ts` junto aos modulos.

## Frontend

Estrutura principal observada:

- `frontend/src/app/`: App Router, layouts e paginas;
- `frontend/src/components/`: componentes compartilhados e por dominio;
- `frontend/src/services/`: chamadas HTTP centralizadas por modulo;
- `frontend/src/contexts/`: autenticacao e React Query;
- `frontend/src/lib/`: menu, permissoes, autenticacao e utilitarios;
- `frontend/public/`: ativos publicos.

Paginas observadas incluem login, dashboard, produtos, categorias, estoque, movimentacoes, agenda, auditoria, clientes, ordens de servico e usuarios.

Padroes observados:

- componentes cliente onde ha estado, efeitos ou React Query;
- services de frontend para acesso a API;
- componentes de CRUD e UI compartilhados;
- estados de carregamento, erro e vazio nas telas de dados;
- dashboard composto por componentes reutilizaveis.

Componentes informados como reutilizaveis para dashboards:

- `DashboardCard`;
- `DashboardGrid`;
- `DashboardStatusCard`;
- `ChartContainer`;
- `BarChartCard`;
- `PieChartCard`.

Esses seis componentes nao aparecem na arvore atual examinada; existem outros componentes `Dashboard*`. Confirmar a branch ou a implementacao antes de importar os nomes acima.

## Limites arquitetonicos

- O frontend nao define o tenant de forma confiavel.
- O controller nao implementa workflow complexo.
- O service valida tenant, relacionamentos e regras de negocio.
- O Prisma e a camada padrao de persistencia; SQL direto exige justificativa expressa.
- Alteracoes de schema e migrations nao devem ser inferidas de uma tarefa de interface ou documentacao.
