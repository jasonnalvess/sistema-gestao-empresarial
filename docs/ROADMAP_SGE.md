# Roadmap oficial — Sistema de Gestão Empresarial Multiempresa (SGE)

## Contexto rápido para novo chat

- **Projeto:** Sistema de Gestão Empresarial Multiempresa (SGE), ERP SaaS multi-tenant.
- **Arquitetura:** Next.js, React, TypeScript, TanStack Query, Axios e Tailwind no frontend; NestJS, TypeScript e Prisma no backend; PostgreSQL.
- **Ambiente de trabalho:** teste, `/opt/sistema-gestao/teste`.
- **Branch atual e de integração:** `develop`.
- **Último commit versionado:** `3b9a5b87979ce552e64e2f83fde0afefd1635f70` — V3.5.3, Interações e Integração com Agenda, publicado em `origin/develop`.
- **Marcos concluídos:** V1, V2, V3.1, V3.2, V3.3 e V3.4.
- **Sprint atual:** V3.5 — CRM — EM ANDAMENTO.
- **V3.4.1:** CONCLUÍDA E VERSIONADA — contrato e arquitetura.
- **V3.4.2:** CONCLUÍDA, HOMOLOGADA E VERSIONADA — persistência e integridade.
- **V3.4.3:** CONCLUÍDA, HOMOLOGADA E VERSIONADA — cadastros e consultas.
- **V3.4.4:** CONCLUÍDA, HOMOLOGADA E VERSIONADA — ciclo de vida.
- **V3.4.5:** CONCLUÍDA, HOMOLOGADA E VERSIONADA — acesso associado e primeiro login.
- **V3.4.6:** CONCLUÍDA, HOMOLOGADA E VERSIONADA — integração final, frontend RH, CE-2 e CE-3; commit `ce0ccdd`.
- **Versão atual:** V3.5 — CRM; V3.5.1 concluída e versionada; V3.5.2 concluída, homologada, versionada e publicada; V3.5.3 concluída, homologada, versionada e publicada em `origin/develop` no commit `3b9a5b87979ce552e64e2f83fde0afefd1635f70`; V3.5.4 concluída e homologada, aguardando versionamento/publicação.
- **Etapa atual:** V3.5.5 — Frontend e Integração — EM ANDAMENTO.
- **V4.0:** apenas backlog futuro, para novo planejamento após conclusão integral da V3.x.
- **Progresso geral estimado de planejamento:** aproximadamente 93%; a V3.5 permanece EM ANDAMENTO.
- **Regras críticas:** backend decide autorização; preservar tenant, RBAC, sessões e cache por empresa; verificar Git antes de trabalhar; mudanças incrementais; nenhuma ação automática em produção; nunca registrar credenciais.
- **Documento oficial:** `docs/ROADMAP_SGE.md`. Ler também `AGENTS.md` e `DECISIONS.md` antes de implementar.

## Finalidade e critérios de evidência

Este documento consolida roadmap, histórico, estado técnico, pendências e handoff. É a referência permanente de continuidade do projeto e deve acompanhar seu versionamento no Git.

A consolidação inicial combina inspeção somente de leitura do repositório com o contexto oficial fornecido pelo responsável pelo projeto. Funcionalidades descritas abaixo têm suporte em código, histórico Git ou documentação existente. Resultados de homologação e números de testes da V3.3.6 são registros de encerramento fornecidos pelo responsável; não foram reexecutados nesta tarefa documental.

A existência de código ou de um teste não comprova, isoladamente, comportamento em produção, integração real com banco ou homologação visual. Quando não houver evidência independente, isso é indicado.

**Legenda de status:**

- [x] **CONCLUÍDO:** etapa entregue segundo o histórico oficial, com implementação identificada quando aplicável.
- [x] **HOMOLOGADO:** validação funcional de encerramento registrada; não significa deploy em produção.
- [ ] **EM ANDAMENTO:** trabalho iniciado e ainda não encerrado.
- [ ] **PENDENTE:** etapa não iniciada ou consolidação ainda necessária.

## Estado Atual

| Campo | Estado atual e referências históricas |
|---|---|
| Data da atualização | 2026-09-20 |
| Data do fechamento técnico da V3.4.6 (histórico) | 2026-09-09 |
| Ambiente auditado | Teste: `/opt/sistema-gestao/teste` |
| Branch atual | `develop` |
| HEAD antes do fechamento V3.4.6 | `db706e24ecd8cd64a7d2ac1a8c16e48b6946e20c` |
| Assunto do último commit antes do fechamento V3.4.6 (histórico) | `feat(rh): adiciona acesso associado e primeiro login da V3.4.5` |
| Referências de integração antes do fechamento V3.4.6 (histórico) | `develop` e `origin/develop` em `db706e2` |
| Versão/marco atual | V3.5 — CRM — EM ANDAMENTO; V3.5.1 concluída e versionada; V3.5.2 concluída, homologada, versionada e publicada no commit `4d32bcb6f91c6a350917089a4fe4690d40428c43`; V3.5.3 concluída, homologada, versionada e publicada em `origin/develop` no commit `3b9a5b87979ce552e64e2f83fde0afefd1635f70`; V3.5.4 concluída e homologada, aguardando versionamento/publicação |
| V3.4.1 | CONCLUÍDA E VERSIONADA |
| V3.4.2 | CONCLUÍDA, HOMOLOGADA E VERSIONADA |
| V3.4.3 | CONCLUÍDA, HOMOLOGADA E VERSIONADA |
| V3.4.4 | CONCLUÍDA, HOMOLOGADA E VERSIONADA |
| V3.4.5 | CONCLUÍDA, HOMOLOGADA E VERSIONADA |
| V3.4.6 | CONCLUÍDA, HOMOLOGADA E VERSIONADA; commit `ce0ccdd` publicado em `origin/develop` |
| Versão atual | V3.5 — CRM — EM ANDAMENTO |
| Etapa atual | V3.5.5 — Frontend e Integração — EM ANDAMENTO |
| Estimativa geral | Aproximadamente 93% (estimativa de planejamento); V3.5 permanece EM ANDAMENTO |

Os relatos abaixo preservam o fechamento técnico de 2026-09-09, anterior à publicação de `ce0ccdd`; não representam pendência atual de versionamento da V3.4.

A V3.4.6 foi validada no ambiente de teste por testes automatizados, build, lint, typecheck, `git diff --check`, homologação funcional no navegador e cenários de integração com PostgreSQL real.

A regressão automatizada final registrou 69 suítes aprovadas e 1.283 testes aprovados no backend, além de lint e build aprovados no frontend. Três suítes e 164 testes permaneceram marcados como skipped pela própria suíte de testes.

O fechamento integrado também validou o frontend de RH, responsividade, ciclo de vida do funcionário, associação opcional Funcionario x Usuario, criação/vinculação/desvinculação de acesso, primeiro login com troca obrigatória de senha, isolamento multiempresa e revogação de autorização.

Durante a homologação foram incorporadas duas correções de coerência necessárias ao fechamento:

- **CE-2 — Usuários no contexto multiempresa:** SUPER_ADMIN passa a listar usuários conforme a empresa selecionada sem perder a visão global quando não há empresa selecionada; ADMIN_EMPRESA permanece limitado à própria empresa; a interface não oferece promoção indevida para SUPER_ADMIN.
- **CE-3 — Usuario x Perfil x Funcionario:** Tipo permanece categoria estrutural da conta e Perfil permanece autorização funcional. Usuários empresariais podem possuir zero, um ou múltiplos perfis. Alterações efetivas de perfis revogam a autorização anterior por `versaoAutorizacao`; operações idempotentes não geram nova revogação nem nova auditoria.

Nenhuma alteração de produção foi realizada neste fechamento. O commit e o push da V3.4.6 ainda não haviam sido executados no momento desta atualização documental.

## Arquitetura e mapa técnico

### Stack e ambientes

| Camada | Tecnologia / localização |
|---|---|
| Frontend | Next.js App Router, React, TypeScript, TanStack Query, Axios e Tailwind |
| Interface reutilizável | Componentes common, CRUD e UI; Radix UI, formulários e feedback visual presentes nas dependências |
| Backend | NestJS modular, TypeScript, controllers, services e DTOs |
| Persistência | Prisma ORM e PostgreSQL; schema e migrations em `backend/prisma` |
| Teste | `/opt/sistema-gestao/teste`; implementar e homologar primeiro aqui |
| Produção | `/opt/sistema-gestao/producao`; caminho informado pelo projeto, não auditado nesta tarefa |

### Estrutura principal confirmada

- `backend/src/app.module.ts`: composição dos módulos e providers globais.
- `backend/src/<modulo>/`: controllers HTTP, services de negócio, DTOs e testes conforme o módulo.
- `backend/src/auth/`: autenticação, estratégia JWT, decorators e guards de roles/permissões.
- `backend/src/common/`: contexto empresarial, guards, respostas, paginação, interceptors e filtros.
- `backend/src/prisma/`: integração da aplicação com Prisma.
- `backend/src/perfis/` e `backend/src/permissoes/`: administração e catálogo de autorização.
- `frontend/src/app/`: páginas e layouts do App Router; login, dashboard e módulos operacionais.
- `frontend/src/components/common/`: `PageHeader`, `Pagination`, `EmptyState`, `ErrorMessage`, `SearchBar`, `StatsCard`, `StatusBadge`, `AcessoNegado` e `EmpresaNaoSelecionada`.
- `frontend/src/components/crud/`: `CrudToolbar`, `CrudSearch`, `CrudPagination`, `CrudEmpty`, `CrudLoading`, `CrudCard` e `CrudStatusBadge`.
- `frontend/src/components/ui/`: botões, inputs, tabelas, dialogs, alert-dialog, tabs, sheet, tooltip e outros elementos reutilizáveis.
- `frontend/src/components/layout/`: `AppLayout`, `Header` e `Sidebar`.
- `frontend/src/components/<modulo>/`: modais, formulários e ações específicas.
- `frontend/src/contexts/`: `AuthContext`, `EmpresaSelecionadaContext` e `QueryProvider`.
- `frontend/src/services/`: cliente HTTP e integração dos módulos com APIs.
- `frontend/src/lib/`: regras auxiliares de autorização/contexto e query keys por módulo.

Não foi identificada implementação de Storybook na inspeção de arquivos e dependências. Não registrar Storybook como entrega concluída.

### Autenticação, RBAC e multiempresa

- Papéis atuais principais: `SUPER_ADMIN`, `ADMIN_EMPRESA` e `USUARIO_EMPRESA`.
- JWT autentica a sessão; `JwtStrategy` verifica usuário persistido, atividade, tipo, empresa e `versaoAutorizacao`.
- `RolesGuard` e `PermissionsGuard` validam os requisitos das rotas. Menus ocultos e controles do frontend não substituem essa verificação.
- `EmpresaContextoGuard` resolve o contexto das operações empresariais. SUPER_ADMIN precisa selecionar empresa explicitamente nesses fluxos; usuário empresarial não pode substituir sua empresa por outra.
- Consultas e escritas empresariais devem respeitar a empresa autorizada. Catálogos e perfis globais possuem regras próprias e não autorizam acesso cruzado a dados empresariais.
- Perfis/permissões complementam os papéis. Perfis de sistema são protegidos contra as escritas empresariais administrativas.
- Alterações relevantes de autorização incrementam a versão dos usuários afetados e podem invalidar sessões.
- `AuthContext` limpa cache e invalida requisições da sessão; query keys empresariais incluem o tenant. `perfis-query-keys.ts` separa listas, detalhes, permissões e catálogo delegável por empresa.

## Roadmap histórico concluído

### V1 — Fundação — CONCLUÍDA

- [x] Estruturas frontend e backend, PostgreSQL, Prisma e autenticação.
- [x] Base SaaS multiempresa, usuários, contexto empresarial e RBAC inicial.
- [x] Separação de ambientes de teste e produção no processo oficial.
- [x] Arquitetura modular preparada para expansão.

A stack e a organização são confirmadas pelo código e por `DECISIONS.md`. O encerramento da V1 é parte do histórico oficial fornecido; não foi identificado nesta auditoria um commit único que delimite toda a etapa. A configuração operacional de produção não foi inspecionada.

### V2 — ERP Operacional — CONCLUÍDA

Referências: `CHANGELOG.md`, `docs/releases/V2.0.0.md` e módulos registrados em `backend/src/app.module.ts`. A documentação da release registra 2026-08-05, tag `v2.0.0` e commit `3c1873d`.

A tabela apresenta funcionalidades visíveis em controllers, services e páginas atuais. Não implica que cada módulo tenha CRUD completo ou interface administrativa dedicada para toda API.

| Módulo | Funcionalidade confirmada / ponto de entrada |
|---|---|
| Autenticação | Login e consulta do usuário autenticado; `auth`, página `/login` |
| Empresas / Multiempresa | APIs de cadastro, consulta, edição e situação; `empresas`; contexto e serviço frontend de empresas |
| Usuários | Cadastro, consulta, edição, ativação/inativação; `usuarios`, página `/usuarios` |
| Empresa-Módulos | Vínculo e situação de módulos da empresa; `empresa-modulos`; catálogo backend em `modulos` |
| Dashboard | Resumo empresarial; `dashboard`, página `/dashboard` |
| Clientes | Cadastro, consulta, edição, situação e histórico; `clientes`, `/clientes` e detalhe |
| Produtos | Cadastro, consulta, edição, situação e histórico; `produtos`, `/produtos` e detalhe |
| Categorias | Cadastro, consulta, edição e situação; `categorias-produtos`, `/categorias` |
| Marcas de Produtos | Cadastro, consulta, edição e situação; `marcas-produtos`, `/marcas-produtos` |
| Unidades de Medida | Cadastro, consulta, edição e situação; `unidades-medida`, `/unidades-medida` |
| Depósitos | Cadastro, consulta, edição e situação; `depositos`, `/depositos` |
| Movimentações de Estoque | Registro, consulta e transferências; `movimentacoes-estoque`, `/movimentacoes` |
| Estoque | Consulta e operações de estoque; `estoque`, `/estoque` |
| Inventários | Criação, consulta, edição, contagem, cancelamento e finalização; `inventarios-estoque`, `/inventarios` e detalhe |
| Agenda | Criação, edição, consulta, cancelamento e histórico; `agenda`, `/agenda` |
| Ordens de Serviço | Criação, consulta, alteração de status e histórico; `ordens-servico`, `/ordens-servico` e detalhe |
| Fornecedores | Cadastro, consulta, edição, situação e histórico; `fornecedores`, `/fornecedores` e detalhe |
| Contas a Pagar | Cadastro, consulta/resumo, edição, pagamentos, cancelamento, histórico e geração a partir de pedido; `contas-pagar`, `/contas-pagar` e detalhe |
| Contas a Receber | Cadastro, consulta/resumo, edição, recebimentos, cancelamento, histórico e geração a partir de OS; `contas-receber`, `/contas-receber` e detalhe |
| Pedidos de Compra | Criação, consulta, edição, aprovação, cancelamento, recebimento e histórico; `pedidos-compra`, `/pedidos-compra` e detalhe |
| Caixas | Cadastro, consulta, edição, abertura, fechamento, histórico de aberturas e movimentações; `caixas`, `/caixas`, detalhe e `/caixas/movimentacoes` |
| Vendas | Criação, consulta, edição, aprovação, faturamento, cancelamento, histórico e dashboard; `vendas`, `/vendas` e detalhe |
| Financeiro | Resumo financeiro; `financeiro`, `/financeiro`; não equivale à futura V3.6 |
| Auditoria | Consulta empresarial/global e sanitização; `auditoria`, `/auditoria` |

A V2 registra 59 suítes/945 testes, TypeScript, builds e ESLint aprovados. São dados históricos da release, não os totais atuais. Suas limitações sobre ausência de interface de perfis foram superadas pela V3.3.6; Fiscal e Funcionários permanecem no roadmap futuro.

### V3.1 — Responsividade — CONCLUÍDA

Objetivo entregue: adaptação para desktop, tablet e mobile, padronização dos módulos existentes e correções de UX, layout e ações responsivas.

| Marco confirmado no Git | Entrega |
|---|---|
| `30c75a4` / `5f0736b` | Layout global responsivo |
| `2fa5038` / `f104235` | Componentes base responsivos |
| `a730dfd`, `4ddd8d4`, `ef8a61f`, `febe235` | Dashboard/clientes/fornecedores, estoque, financeiro e módulos administrativos |
| `5c43eac` / `87494d1` | Padronização de ações em telas menores |
| `153f6b8` | Correção técnica de Prisma/advisory locks registrada no histórico |
| `77cf496` | Integração da V3.1.6, fechamento do redesign responsivo da Agenda |

A Agenda possui componentes de semana, mês, dia e lista, além de cards de eventos, resumo e ações rápidas. O histórico inclui ajustes do card compacto semanal. A homologação da interface e o encerramento da responsividade constam do contexto oficial; não houve nova inspeção visual com navegador nesta consolidação.

### V3.2 — Padronização da Plataforma / UX/UI — CONCLUÍDA

A etapa consolidou a arquitetura visual existente, sem reconstrução integral do frontend.

- [x] Reutilização de componentes common, CRUD e UI; PageHeader, tabelas, toolbars, filtros e paginação.
- [x] Padronização de estados vazios, loading, erro e feedback visual.
- [x] Formulários, dialogs, acessibilidade e responsividade.
- [x] Redução de inconsistências entre módulos e correções de regressão visual.

| Referência de integração | Etapa confirmada |
|---|---|
| `960568c` | Componentes da plataforma |
| `c02b548` | Estados e feedback |
| `88e32b9` | Estrutura visual das páginas |
| `44a4cc1` | Formulários, modais e acessibilidade |
| `f61a9fe` | Padronização de módulos |
| `8e44df1` | Homologação visual/regressão, com correções de erro e vazio em módulos existentes |

### V3.3 — Administração de Perfis — CONCLUÍDA

| Subfase | Status | Entrega / evidência |
|---|---|---|
| V3.3.1 | CONCLUÍDA | Auditoria da arquitetura de perfis/permissões, conforme histórico oficial; commit exclusivo não identificado nesta inspeção |
| V3.3.2 | CONCLUÍDA | Contrato e invariantes de autorização; `b7b479e`, integrado por `0b3cf97`, valida empresa na criação e protege usuários SUPER_ADMIN |
| V3.3.3 | CONCLUÍDA | Sessões, revogação e isolamento de cache; `a5faf8b`, `a2a0219`, integração `d51fa81` |
| V3.3.4 | CONCLUÍDA | API de consulta administrativa de perfis/permissões; `9f0798e`, integração `f7fa938` |
| V3.3.5 | CONCLUÍDA | CRUD de perfis empresariais no backend; `638dbb7`, integração `e4a9531` |
| V3.3.6 | CONCLUÍDA E HOMOLOGADA | Gestão de perfis/permissões no frontend; `29fe179`, integração `f7dc834` |

#### Consultas e escrita administrativa

A V3.3.4 disponibiliza `GET /perfis`, `GET /perfis/:id`, `GET /perfis/globais`, `GET /perfis/globais/:id` e `GET /permissoes`. Perfis empresariais respeitam tenant; consultas globais de perfis são exclusivas de SUPER_ADMIN.

A V3.3.5 acrescenta criação, edição de nome/descrição, ativação, inativação e substituição integral das permissões. Não disponibiliza exclusão de perfil nem atribuição de UsuarioPerfil nesses endpoints.

| Endpoint | Permissão administrativa |
|---|---|
| `POST /perfis` | `perfis.criar` |
| `PATCH /perfis/:id` | `perfis.editar` |
| `PATCH /perfis/:id/ativar` | `perfis.ativar` |
| `PATCH /perfis/:id/inativar` | `perfis.inativar` |
| `PUT /perfis/:id/permissoes` | `perfis.permissoes.gerenciar` |

As escritas exigem role administrativo, permissão e contexto empresarial. O predicado de perfil existente contém ID, empresa e escopo EMPRESA. `sistema=true` é protegido independentemente da chave.

O catálogo delegável é uma allowlist literal de 69 chaves. ADMIN_EMPRESA precisa possuir cada chave; SUPER_ADMIN dispensa posse operacional, mas continua sujeito à allowlist no conjunto solicitado e à permissão administrativa da rota. Todas as associações preexistentes, inclusive `permitido=false`, são verificadas no limite de administração antes do PUT de ADMIN_EMPRESA.

Descrição recebe trim; string vazia vira null. POST aceita ausência e rejeita null explícito. PATCH preserva ausência e aceita null para limpar. Estado equivalente é no-op. Alteração cadastral não revoga; mudanças reais de autorização revogam por incremento único por usuário vinculado. Auditoria de escrita de perfis participa da mesma transação.

#### V3.3.6 — Gestão de Perfis e Permissões no Frontend

- [x] Listagem em `/perfis`, filtros e paginação.
- [x] Criação de perfis personalizados e edição de nome/descrição.
- [x] Ativação/inativação e proteção visual dos perfis padrão/sistema.
- [x] Visualização e gerenciamento de permissões, catálogo delegável e limite de delegação.
- [x] RBAC das ações e isolamento por empresa.
- [x] Cache por tenant e invalidação de consultas após alterações.
- [x] Estados de loading, erro e vazio; feedback, acessibilidade e responsividade.
- [x] Testes e homologação registrados no encerramento oficial.

Pontos de continuidade: `frontend/src/app/perfis/page.tsx`, `frontend/src/components/perfis/`, `frontend/src/services/perfis.service.ts` e `frontend/src/lib/perfis-query-keys.ts`.

**Catálogo backend:** `GET /permissoes/delegaveis`, protegido por autenticação, roles SUPER_ADMIN/ADMIN_EMPRESA e `perfis.visualizar`.

- SUPER_ADMIN recebe permissões ativas existentes do catálogo empresarial delegável.
- ADMIN_EMPRESA recebe a interseção desse catálogo com suas próprias permissões.
- Esse catálogo auxilia a interface; o backend continua autoridade final no PUT.

**Commits de encerramento:**

- Feature: `29fe179` — `feat(rbac): adiciona gestão de perfis e permissões no frontend`.
- Integração: `f7dc834` — `feat(rbac): integra V3.3.6 gestão de perfis e permissões`.

**Validações históricas do encerramento**, informadas pelo responsável:

| Validação | Resultado registrado |
|---|---|
| Suíte completa imediatamente antes do fechamento | 65 suítes / 1158 testes aprovados |
| Validação específica pós-merge | 5 suítes / 153 testes aprovados |
| TypeScript backend | Aprovado |
| TypeScript frontend | Aprovado |
| Build frontend | Aprovado |
| `git diff --check` | Aprovado |
| Homologação funcional | Aprovada |
| Git no encerramento | Working tree limpa; develop e feature sincronizadas com suas referências remotas |

Há testes backend específicos para consulta, escrita, allowlist e catálogo delegável. Não foram localizados testes automatizados próprios do frontend na inspeção de arquivos; os totais acima não devem ser apresentados como suítes de navegador ou prova automatizada de acessibilidade. Nesta tarefa, não foram reexecutados testes, lint, TypeScript ou builds.

## Roadmap futuro oficial

A sequência V3.x abaixo permanece fechada. A exceção controlada aprovada exclusivamente para V3.4 permite o contrato detalhado de RH registrado adiante; não autoriza expansão da V3.5 ou versões posteriores. V4.0 é apenas backlog para novo planejamento após a conclusão integral da V3.x.

| Status | Versão | Objetivo |
|---|---|---|
| [x] CONCLUÍDO / HOMOLOGADO | V3.4 | Gestão de Funcionários (RH) |
| [ ] EM ANDAMENTO | V3.5 | CRM |
| [ ] PENDENTE | V3.6 | Financeiro Avançado |
| [ ] PENDENTE | V3.7 | Notificações e Automações |
| [ ] PENDENTE | V3.8 | Configurações da Empresa |
| [ ] PENDENTE | V3.9 | Base Fiscal |
| [ ] PENDENTE | V3.10 | Integrações e Gestão de Arquivos |
| [ ] PENDENTE | V3.11 | Homologação Final |

O escopo detalhado da **V3.5** foi consolidado na V3.5.1, preservando o objetivo já estabelecido no roadmap. Para as **demais sprints futuras** desta tabela: **Escopo detalhado será definido na abertura da sprint, preservando o objetivo já estabelecido no roadmap.**

A existência de Financeiro e de APIs de empresas não encerra Financeiro Avançado nem Configurações da Empresa. Catálogos ou nomes reservados também não significam implementação funcional de RH, CRM ou Fiscal.

## V3.4 — Gestão de Funcionários (RH) — CONCLUÍDA / HOMOLOGADA / VERSIONADA

### V3.4.1 — Contrato e Arquitetura

**STATUS: CONCLUÍDA E VERSIONADA.** Contrato aprovado pelo responsável em 2026-09-07 e posteriormente versionado no commit `b3b4104`. As etapas V3.4.2 a V3.4.6 foram executadas na sequência e a V3.4 foi concluída, homologada e versionada no commit `ce0ccdd`.

Esta seção preserva o contrato arquitetural aprovado na V3.4.1. Naquele momento ainda não havia implementação funcional; posteriormente o contrato foi versionado e executado pelas etapas V3.4.2 a V3.4.6. O texto de planejamento abaixo permanece como registro das decisões que orientaram a implementação.

#### Exceção controlada de escopo

A V3.4 recebeu uma exceção controlada ao congelamento de escopo do roadmap atual para permitir um planejamento de RH mais completo.

Essa exceção vale SOMENTE para V3.4.

Não autoriza expansão de V3.5 ou versões posteriores do roadmap atual.

Tudo que deliberadamente ficar fora da V3.4 deve ser registrado como backlog futuro da:

V4.0 — Evolução Avançada de RH e Automações

A V4.0 só será planejada/iniciada após a conclusão integral do roadmap V3.x atual.

Não criar subdivisões da V4.0 neste planejamento.

#### Funcionario e Usuario: entidades distintas

Funcionario e Usuario são entidades diferentes.

Funcionario:

- representa o colaborador dentro do RH;
- pode existir sem acesso ao sistema;
- pertence obrigatoriamente a uma Empresa;
- possui dados funcionais e pessoais;
- possui ciclo de vida próprio.

Usuario:

- representa a identidade de autenticação no SGE;
- possui email de login;
- senha;
- tipo;
- ativo;
- perfis;
- permissões;
- versaoAutorizacao;
- futuramente trocaSenhaObrigatoria.

O módulo RH NÃO terá um segundo sistema de usuários/login.

O RH terá Funcionarios.

Quando um Funcionario precisar acessar o SGE:

- poderá ser criado um Usuario; ou
- poderá ser vinculado um Usuario existente elegível.

A associação planejada será:

Funcionario.usuarioId opcional e único

Relação:

`Funcionario 0..1 ↔ 0..1 Usuario`

Regras:

- funcionário pode existir sem usuário;
- usuário pode existir sem funcionário;
- associação nunca ocorre automaticamente por nome, email ou CPF;
- usuário vinculado deve pertencer à mesma empresa;
- somente USUARIO_EMPRESA pode ser vinculado;
- ADMIN_EMPRESA não pode ser vinculado;
- SUPER_ADMIN não pode ser vinculado;
- um usuário não pode estar vinculado a dois funcionários;
- um funcionário não pode possuir dois usuários;
- vínculo deve ser explícito;
- email do funcionário não é identidade de login;
- alteração de nome/email no funcionário não altera silenciosamente os dados do Usuario;
- alteração de dados do Usuario não deve sobrescrever silenciosamente dados do Funcionario.

#### Perfis, permissões e módulos

Funcionario NÃO recebe módulos diretamente.

O mecanismo de autorização continua sendo:

`Usuario → UsuarioPerfil → Perfil → Permissões → módulos/ações permitidos`

Funcionario.usuarioId funciona apenas como ponte entre:

- cadastro funcional do RH;
- identidade de acesso do SGE.

Não criar mecanismo paralelo de autorização no RH.

#### Status funcionais e glossário aprovado

Enum planejado:

`ATIVO`, `FERIAS`, `AFASTADO`, `LICENCA`, `INATIVO`, `DESLIGADO`.

Glossário aprovado:

ATIVO: colaborador em exercício normal.

FERIAS: ausência identificada especificamente como férias, com vínculo preservado.

AFASTADO: ausência temporária classificada pelo RH como afastamento, sem tentar reproduzir classificação previdenciária detalhada.

LICENCA: ausência temporária formalmente classificada pela empresa como licença.

INATIVO: suspensão administrativa do exercício, sem encerramento do vínculo e sem enquadramento em férias, afastamento ou licença.

DESLIGADO: vínculo encerrado.

Não adicionar outro status nesta versão sem nova aprovação.

#### Status funcional e estado de acesso

Existem duas dimensões independentes:

1. Funcionario.status
2. estado do acesso derivado de Funcionario.usuarioId + Usuario.ativo

Estado visual do acesso:

`SEM_USUARIO`, `USUARIO_ATIVO`, `USUARIO_INATIVO`.

Não persistir uma cópia redundante do estado do acesso em Funcionario.

O RH deverá exibir claramente ambas as informações.

Exemplos:

Situação RH: `ATIVO`; acesso ao sistema: `INATIVO`.

Situação RH: `FERIAS`; acesso ao sistema: `INATIVO`.

Situação RH: `AFASTADO`; acesso ao sistema: `ATIVO`.

#### Matriz de combinações

| Situação RH | SEM_USUARIO | USUARIO_ATIVO | USUARIO_INATIVO |
|---|---|---|---|
| ATIVO | Válido | Válido | Válido com alerta |
| FERIAS | Válido | Válido com alerta | Válido |
| AFASTADO | Válido | Válido com alerta | Válido |
| LICENCA | Válido | Válido com alerta | Válido |
| INATIVO | Válido | Inválido | Válido |
| DESLIGADO | Válido | Inválido | Válido |

“Válido com alerta” significa permitido, mas destacado na interface.

#### Usuario → RH: opção C aprovada

Decisão aprovada: adotar a opção C.

Quando Usuario vinculado for desativado:

Usuario.ativo = false

Funcionario.status NÃO muda automaticamente.

O RH deve:

- refletir imediatamente "Acesso inativo";
- preservar o status funcional atual;
- registrar evento no FuncionarioHistorico;
- permitir consulta/filtro por situação de acesso.

Exemplos:

Funcionario ATIVO + Usuario desativado
→ continua ATIVO
→ acesso passa a INATIVO

Funcionario FERIAS + Usuario desativado
→ continua FERIAS
→ acesso passa a INATIVO

Não transformar automaticamente esses casos em Funcionario.INATIVO.

#### RH → Usuario

ATIVO → FERIAS

- operador escolhe se deseja suspender acesso;
- se escolher preservar, Usuario.ativo não muda;
- se já estiver inativo, preservar não o reativa.

ATIVO → AFASTADO

- mesma regra.

ATIVO → LICENCA

- mesma regra.

ATIVO → INATIVO

- acesso do Usuario vinculado deve ser obrigatoriamente desativado.

Qualquer estado permitido → DESLIGADO

- acesso do Usuario vinculado deve ser obrigatoriamente desativado;
- versaoAutorizacao deve ser incrementada;
- sessões anteriores devem deixar de funcionar.

Retorno:

`FERIAS → ATIVO`, `AFASTADO → ATIVO`, `LICENCA → ATIVO` e `INATIVO → ATIVO`.

Nunca reativar Usuario automaticamente.

A reativação do acesso deve ser ação administrativa explícita.

#### Reativação de usuário

Funcionario ATIVO: Usuario pode ser reativado mediante autorização.

Funcionario FERIAS: reativação explícita permitida, com alerta.

Funcionario AFASTADO: reativação explícita permitida, com alerta.

Funcionario LICENCA: reativação explícita permitida, com alerta.

Funcionario INATIVO: reativação bloqueada. Primeiro o Funcionario deve retornar para ATIVO.

Funcionario DESLIGADO: reativação sempre bloqueada.

Reativar Usuario nunca altera automaticamente Funcionario.status.

Essas invariantes devem valer para:

- endpoints normais;
- services internos;
- seed;
- futuras integrações.

#### Transições funcionais

| Estado atual | Destinos normais permitidos |
|---|---|
| ATIVO | FERIAS, AFASTADO, LICENCA, INATIVO, DESLIGADO |
| FERIAS | ATIVO, DESLIGADO |
| AFASTADO | ATIVO, DESLIGADO |
| LICENCA | ATIVO, DESLIGADO |
| INATIVO | ATIVO, DESLIGADO |
| DESLIGADO | Nenhum: terminal na V3.4 |

Reclassificação direta entre FERIAS, AFASTADO e LICENCA poderá existir como operação administrativa explícita e auditada, sem exigir retorno fictício a ATIVO.

Não permitir mudança arbitrária de status via PATCH cadastral genérico. Recontratação fica fora da V3.4.

#### Datas funcionais

dataAdmissao:

- obrigatória;
- preservada durante mudanças de status.

dataDesligamento:

- nula quando status != DESLIGADO;
- obrigatória quando status = DESLIGADO;
- deve ser >= dataAdmissao;
- não usar data futura para representar desligamento já efetivado.

FERIAS, AFASTADO, LICENCA e INATIVO:

- não alteram dataAdmissao;
- não preenchem dataDesligamento.

Períodos estruturados e agendamentos ficam para V4.0.

#### Cadastro de funcionário

Campos planejados:

Identificação:

- id UUID
- empresaId
- nome obrigatório
- nomePreferido opcional
- cpf opcional

Contato corporativo:

- emailCorporativo opcional
- telefoneCorporativo opcional

Contato pessoal restrito:

- emailPessoal opcional
- telefonePessoal opcional

Endereço residencial restrito:

- cep
- logradouro
- numero
- complemento
- bairro
- cidade
- uf

Dados profissionais:

- matricula obrigatória
- dataAdmissao obrigatória
- dataDesligamento condicional
- tipoVinculo obrigatório
- cargoId opcional
- departamentoId opcional
- gestorId opcional

Controle:

- status obrigatório
- statusDesde obrigatório
- usuarioId opcional e único
- versaoRegistro
- createdAt
- updatedAt

Regras:

- matrícula única por empresa;
- CPF, quando informado, único por empresa;
- email do Funcionario não será chave global de login;
- email não será único como regra de Funcionario;
- gestor deve pertencer à mesma empresa;
- funcionário não pode ser seu próprio gestor.

#### Tipos de vínculo

Enum planejado:

`CLT`, `ESTAGIARIO`, `APRENDIZ`, `TEMPORARIO`, `TERCEIRIZADO`, `PRESTADOR_SERVICO`, `SOCIO`, `OUTRO`.

É classificação administrativa. Não implica folha de pagamento.

#### Estrutura organizacional

V3.4 incluirá:

`Cargo` e `Departamento`.

Ambos:

- pertencem à empresa;
- isolamento por tenant;
- cadastro próprio;
- ativo/inativo;
- sem exclusão destrutiva quando referenciados;
- associação opcional ao Funcionario.

gestorId:

- relação opcional Funcionario → Funcionario;
- mesmo tenant;
- não pode apontar para o próprio Funcionario.

Não incluir:

- filial completa;
- unidade organizacional;
- hierarquia complexa;
- tabela salarial.

#### Privacidade

Dados operacionais:

- nome
- nomePreferido
- matricula
- cargo
- departamento
- status
- emailCorporativo
- telefoneCorporativo
- indicador de acesso ao sistema

Dados restritos:

- CPF
- emailPessoal
- telefonePessoal
- endereço residencial
- informações funcionais restritas quando aplicável

funcionarios.visualizar NÃO autoriza automaticamente a leitura dos dados restritos.

A restrição deve ser aplicada pelo backend:

- select;
- DTO;
- endpoint;
- autorização.

Não apenas ocultação CSS/frontend.

Não armazenar nesta versão:

- diagnóstico médico;
- laudo médico;
- biometria;
- dados bancários;
- dependentes;
- salário/remuneração;
- documentos digitalizados.

#### Histórico funcional

Entidade conceitual planejada:

FuncionarioHistorico

Responsabilidade: linha do tempo funcional e de integração do colaborador.

Registrar quando aplicável:

- empresaId
- funcionarioId
- tipoEvento
- statusAnterior
- statusNovo
- acessoAnterior
- acessoNovo
- origem
- atorUsuarioId
- usuarioAfetadoId quando aplicável
- data/hora
- identificador/correlação da operação
- intenção de preservar/suspender acesso quando aplicável

Origens planejadas:

`RH`, `USUARIO`, `SISTEMA`.

Significado:

RH: operação iniciada pelo módulo de funcionários.

USUARIO: operação iniciada pela gestão administrativa de usuários.

SISTEMA: automação/tarefa técnica identificada.

Não interpretar origem USUARIO como sendo necessariamente ação do próprio colaborador.

Exemplos:

ATIVO → FERIAS + acesso mantido origem RH

ATIVO → FERIAS + acesso ativo→inativo origem RH

FERIAS → FERIAS + acesso ativo→inativo origem USUARIO

ATIVO → DESLIGADO + acesso ativo→inativo origem RH

Mudança funcional e histórico devem confirmar/reverter juntos quando fizerem parte da mesma operação.

Não registrar:

- senha;
- hash;
- JWT;
- tokens;
- dados médicos;
- documentos pessoais desnecessários.

#### Auditoria técnica

Manter AuditoriaLog separada de FuncionarioHistorico.

FuncionarioHistorico: linha do tempo funcional.

AuditoriaLog: rastreabilidade técnica.

Evitar duplicação inútil.

Nunca registrar credenciais.

#### Permissões e delegação

Permissões existentes:

- `funcionarios.visualizar`
- `funcionarios.criar`
- `funcionarios.editar`
- `funcionarios.inativar`

Novas permissões planejadas:

- `funcionarios.situacao.gerenciar`
- `funcionarios.dados_pessoais.visualizar`
- `funcionarios.dados_pessoais.editar`
- `funcionarios.estrutura.gerenciar`
- `funcionarios.acesso.gerenciar`

Não criar permissão específica de histórico nesta versão.

Operações RH que alterarem Usuario precisam também respeitar as permissões administrativas correspondentes.

Exemplo: desligamento que obrigatoriamente desativa acesso não deve confirmar parcialmente se o ator não possuir autorização suficiente para a operação composta.

Perfil "rh":

- continua Perfil;
- não é UserType;
- novas permissões não serão concedidas silenciosamente a usuários existentes.

Allowlist:

- permissões operacionais de RH serão avaliadas explicitamente;
- funcionarios.acesso.gerenciar não deve entrar automaticamente na allowlist operacional.

#### Criar acesso pelo RH

Fluxo conceitual:

Funcionario ATIVO sem Usuario
→ Criar acesso ao sistema
→ informar email de login
→ informar senha inicial
→ selecionar Perfil elegível
→ criar Usuario tipo USUARIO_EMPRESA
→ atribuir UsuarioPerfil
→ vincular Funcionario.usuarioId
→ criar histórico
→ criar auditoria

Tudo atomicamente.

Funcionario não recebe módulos diretamente.

Os módulos/permissões continuam sendo definidos por: Usuario → Perfis → Permissões.

#### Vincular usuário existente

Permitir fluxo explícito para vincular Usuario existente.

Condições:

- mesma empresa;
- tipo USUARIO_EMPRESA;
- ainda não vinculado a outro Funcionario;
- Funcionario elegível;
- associação explícita;
- nunca inferida por email, nome ou CPF.

Conta existente inativa pode ser vinculada, mas permanece inativa até ação administrativa explícita.

#### Desvincular usuário

Fluxo aprovado:

- desativar Usuario;
- incrementar versaoAutorizacao quando aplicável;
- revogar sessões;
- somente depois remover Funcionario.usuarioId;
- tudo na mesma transação.

Não:

- excluir Usuario;
- excluir perfis;
- deixar Usuario ativo após desvinculação por padrão.

#### Primeiro login e troca obrigatória de senha

Campo conceitual planejado em Usuario:

`trocaSenhaObrigatoria Boolean @default(false)`

Compatibilidade:

- usuários existentes ficam false;
- não alterar hashes existentes;
- não incrementar versões em massa;
- não alterar ativo;
- não alterar tipos;
- não alterar empresas;
- não alterar perfis.

Novos acessos criados pelo fluxo RH:

trocaSenhaObrigatoria = true

Fluxo:

1. administrador define senha inicial;
2. colaborador faz login;
3. identidade é autenticada;
4. backend verifica trocaSenhaObrigatoria;
5. enquanto true, somente sessão mínima e troca da própria senha;
6. demais áreas bloqueadas no mecanismo JWT compartilhado;
7. usuário informa senha atual + nova senha;
8. backend troca hash;
9. trocaSenhaObrigatoria=false;
10. versaoAutorizacao++;
11. auditoria sem credenciais;
12. logout;
13. novo login obrigatório.

Endpoint conceitual:

`POST /auth/trocar-senha`

Body não recebe:

- usuarioId
- empresaId
- tipo
- perfil

Erro conceitual:

HTTP `403`, `error = TROCA_SENHA_OBRIGATORIA`.

Exceções ao bloqueio devem ser explícitas por metadata.

Não confiar apenas no frontend.

#### Proteções sobre Usuario

Invariantes futuras:

- Usuario vinculado deve ser da mesma Empresa.
- Somente USUARIO_EMPRESA pode estar vinculado.
- Usuario vinculado não pode ser promovido para ADMIN_EMPRESA.
- Usuario vinculado não pode ser promovido para SUPER_ADMIN.
- Usuario vinculado a Funcionario INATIVO não pode ser ativado.
- Usuario vinculado a Funcionario DESLIGADO não pode ser ativado.
- Uma conta não pode atender dois Funcionarios.
- Um Funcionario não pode possuir duas contas.
- endpoints existentes também devem respeitar essas regras.
- seed também deve respeitar essas regras.

#### Pontos existentes a integrar nas próximas etapas

Achados da auditoria; integração prevista, sem alteração de código nesta etapa:

| Camada | Arquivo | Integração futura |
|---|---|---|
| Backend | `backend/src/usuarios/usuarios.service.ts` | `criar`, `atualizar`, `ativar` e `desativar`: respeitar vínculo, tipo, tenant e situação funcional. |
| Backend | `backend/src/usuarios/usuarios.controller.ts` | Integrar as proteções nos endpoints existentes de usuários. |
| Seed | `backend/prisma/seed/seed.ts` | Os `usuario.upsert` existentes podem reativar usuários por email e precisarão respeitar as invariantes do RH. |
| Backend | `backend/src/perfis/perfis.service.ts` | Considerar a revogação de `versaoAutorizacao` no protocolo transacional compartilhado. |
| Auth | `backend/src/auth/auth.service.ts` | Integrar o fluxo de primeiro login e troca obrigatória. |
| Auth | `backend/src/auth/strategies/jwt.strategy.ts` | Aplicar o bloqueio compartilhado e preservar validação de sessão. |
| Frontend | `frontend/src/services/usuarios.service.ts` | Integrar os fluxos administrativos de acesso. |
| Frontend | `frontend/src/components/usuarios/NovoUsuarioModal.tsx` | Integrar criação de acesso. |
| Frontend | `frontend/src/components/usuarios/EditarUsuarioModal.tsx` | Respeitar proteções do usuário vinculado. |
| Frontend | `frontend/src/components/usuarios/AlterarStatusUsuarioButton.tsx` | Integrar ativação/inativação e conflitos funcionais. |

Esses pontos não foram alterados nesta tarefa documental.

#### Concorrência e atomicidade

Requisito aprovado:

Operações críticas deverão usar protocolo transacional consistente, seguindo o padrão já utilizado no projeto.

Referência atual: PerfisService.escrever

Planejado:

- transação Serializable;
- locks em ordem determinística;
- revalidação do ator;
- revalidação da sessão;
- tenant;
- tipo;
- vínculo;
- status;
- revisão esperada;
- gravação de Funcionario;
- gravação de Usuario quando aplicável;
- versaoAutorizacao;
- FuncionarioHistorico;
- Auditoria;
- commit conjunto.

Retry limitado para conflitos conhecidos.

Não repetir automaticamente decisão funcional baseada em revisão já obsoleta.

Testar concorrência no PostgreSQL real de teste, não somente mocks.

Cenários mínimos futuros:

- desligamento x ativação;
- férias x desativação;
- desligamento x reativação;
- duas alterações funcionais simultâneas;
- vínculo x alteração de tipo;
- dois funcionários tentando vincular o mesmo usuário.

Nunca permitir estado confirmado:

Funcionario DESLIGADO + Usuario ATIVO

ou:

Funcionario INATIVO + Usuario ATIVO

### Subdivisão oficial da V3.4

| Etapa | Status | Entrega / evidência |
|---|---|---|
| V3.4.1 — Contrato e Arquitetura | CONCLUÍDA E VERSIONADA | Contrato arquitetural aprovado; commit `b3b4104`. |
| V3.4.2 — Persistência e Integridade | CONCLUÍDA, HOMOLOGADA E VERSIONADA | Modelos RH, enums, relações, constraints, migration e testes reais de integridade; commit `893403a`. |
| V3.4.3 — Cadastros e Consultas | CONCLUÍDA, HOMOLOGADA E VERSIONADA | CRUD/consultas de Funcionário, Cargo e Departamento; privacidade, tenant, histórico, auditoria e permissões RH; commit `7b6dbb8`. |
| V3.4.4 — Ciclo de Vida | CONCLUÍDA, HOMOLOGADA E VERSIONADA | Situações funcionais, transições, efeitos sobre acesso, histórico, auditoria e integração com UsuariosService; commit `1d7781f`. |
| V3.4.5 — Acesso Associado e Primeiro Login | CONCLUÍDA, HOMOLOGADA E VERSIONADA | Criar/vincular/desvincular Usuario, primeiro login, troca obrigatória de senha, revogação e concorrência; commit `db706e2`. |
| V3.4.6 — Homologação Integrada | CONCLUÍDA, HOMOLOGADA E VERSIONADA | Frontend RH, UX/responsividade, integração completa, CE-2, CE-3, regressão automatizada, PostgreSQL real e homologação manual no navegador; commit `ce0ccdd`. |

## V3.5 — CRM — EM ANDAMENTO

### V3.5.1 — Contrato e Arquitetura

**STATUS: CONCLUÍDA E VERSIONADA.** Contrato arquitetural revisado e aprovado, publicado em `origin/develop` no commit `7373470b5720e56ce1c938e0d3f3ba67b70f45af` (`docs(crm): define contrato arquitetural da V3.5.1`).

Esta seção preserva o contrato CRM revisado e a arquitetura aprovada na revisão independente final da FASE 3C. A V3.5.1 foi versionada; a V3.5.2 foi homologada, versionada e publicada; a V3.5.3 foi concluída e homologada, aguardando somente versionamento/publicação deste fechamento. O objetivo congelado da V3.5 permanece CRM, sem ampliar a exceção de escopo da V3.4. O progresso geral é estimado em aproximadamente 93%.

#### Cliente como cadastro mestre

Cliente continua sendo o cadastro mestre, reutilizado pelo CRM. Não criar entidade Lead paralela. ClienteHistorico permanece como anotação/histórico legado; o CRM acrescentará interações estruturadas e oportunidades.

Estrutura conceitual de Cliente:

- `agendaEventos`: existentes;
- `historicos`: existentes;
- `ordensServico`: existentes;
- `contasReceber`: existentes;
- `vendas`: existentes;
- `crmInteracoes`: novas;
- `crmOportunidades`: novas.

#### Módulo CRM e acesso operacional

ModuloSistema CRM provisionado: `nome = CRM`, `chave = crm`, `ativo = true`. O CRM permanece ativável por empresa através de EmpresaModulo; a V3.5.2 não o ativou automaticamente para empresas existentes.

O acesso operacional exige cumulativamente:

- autenticação;
- empresa operacional válida/ativa;
- ModuloSistema `crm` ativo;
- EmpresaModulo `crm` ativo para a empresa;
- permissão CRM correspondente.

O backend é a autoridade. O planejamento aprovado prevê o mecanismo reutilizável `@ModuloAtivo('crm')` e `ModuloAtivoGuard`, aplicado inicialmente ao CRM. A V3.5 não inclui refatoração de todos os módulos legados para module gating. Não criar ModuloSistema `clientes` apenas porque permissões existentes usam `modulo="clientes"`.

#### Funil configurável por empresa

O nome da etapa é configurável por empresa e não será enum. O tipo estrutural da etapa será `ABERTA`, `GANHA` ou `PERDIDA`.

Modelo conceitual CrmEtapa:

- `id`;
- `empresaId`;
- `nome`;
- `ordem`;
- `tipo`;
- `ativo`;
- `createdAt`;
- `updatedAt`.

Etapas inativas não devem receber novas movimentações; referências históricas devem ser preservadas.

#### Oportunidade e estado comercial

Modelo conceitual CrmOportunidade:

- `id`;
- `empresaId`;
- `clienteId`;
- `etapaId`;
- `responsavelId`;
- `titulo`;
- `descricao?`;
- `valorEstimado?`;
- `previsaoFechamento?`;
- `dataFechamento?`;
- `motivoPerda?`;
- `vendaId?`;
- `createdAt`;
- `updatedAt`.

A etapa é a fonte única de verdade do estado comercial. Não criar status redundante na oportunidade.

| Estado / operação | Regra |
|---|---|
| ABERTA | `dataFechamento = null` e `motivoPerda = null`. |
| ABERTA → GANHA | `dataFechamento` recebe o momento do fechamento; `motivoPerda = null`. |
| ABERTA → PERDIDA | `dataFechamento` recebe o momento do fechamento; `motivoPerda` obrigatório. |
| GANHA/PERDIDA → ABERTA | Somente operação explícita de reabertura; limpar `dataFechamento` e `motivoPerda` quando aplicável; registrar histórico e auditoria. |

Movimentação, fechamento e reabertura devem ser operações controladas pelo backend, nunca um simples PATCH irrestrito de `etapaId`.

#### Histórico comercial e auditoria técnica

Modelo conceitual CrmOportunidadeHistorico:

- `id`;
- `empresaId`;
- `oportunidadeId`;
- `etapaAnteriorId?`;
- `etapaNovaId?`;
- `descricao`;
- `usuarioId`;
- `createdAt`.

O histórico será append-only pela aplicação. Registrar alterações comerciais relevantes: criação, movimentação, ganho, perda, reabertura, responsável e valor estimado relevante.

CrmOportunidadeHistorico é o histórico comercial legível; AuditoriaLog é a auditoria técnica. Um não substitui o outro.

#### Responsável CRM e preservação da V3.4

O responsável CRM é Usuario. Deve pertencer à mesma empresa e estar ativo. São elegíveis `ADMIN_EMPRESA` e `USUARIO_EMPRESA`; `SUPER_ADMIN` não pode ser responsável. Vínculo com Funcionario não é obrigatório.

Preservar a separação da V3.4: Usuario representa identidade/autorização; Funcionario representa RH. A elegibilidade de ADMIN_EMPRESA como responsável CRM não altera as regras de vínculo Funcionario x Usuario da V3.4.

#### Interações estruturadas

TipoInteracaoCRM: `LIGACAO`, `EMAIL`, `MENSAGEM`, `REUNIAO`, `VISITA`, `NOTA`, `OUTRO`.

Modelo conceitual ClienteInteracao:

- `id`;
- `empresaId`;
- `clienteId`;
- `oportunidadeId?`;
- `agendaEventoId?`;
- `responsavelId`;
- `tipo`;
- `assunto?`;
- `descricao`;
- `dataHora`;
- `createdAt`;
- `updatedAt`.

Permitir criação e visualização; edição é permitida com auditoria, sempre respeitando as permissões correspondentes. Não permitir exclusão, cancelamento ou inativação de interação. Não criar ClienteInteracaoHistorico somente para correções: AuditoriaLog é suficiente.

#### CRM e Agenda

ClienteInteracao representa contato/fato já ocorrido; AgendaEvento representa compromisso futuro/programado. Reutilizar a Agenda existente, sem segundo calendário ou tarefas CRM e sem duplicar próxima ação/lembrete na interação.

`agendaEventoId` é opcional. Quando vinculado, o evento deve pertencer à mesma empresa; se AgendaEvento possuir Cliente, deve ser o mesmo Cliente da interação.

Registrar interação não conclui automaticamente AgendaEvento. Criar interação não cria automaticamente AgendaEvento.

O frontend futuramente poderá oferecer “Agendar próximo contato” para quem possuir `agenda.criar`, reutilizando `/agenda?clienteId=...`.

#### Oportunidade e Venda

Venda é uma transação operacional distinta da oportunidade. Oportunidade GANHA não cria Venda automaticamente. A criação de Venda é explícita e continua exigindo `vendas.criar`.

Fluxo aprovado:

1. Oportunidade GANHA.
2. Ação “Criar venda”.
3. Fluxo normal de Vendas, podendo receber o cliente pré-selecionado.
4. Usuário informa depósito, itens, pagamento e demais dados.
5. Venda nasce conforme as regras atuais do módulo, inicialmente RASCUNHO.

CrmOportunidade poderá possuir `vendaId` opcional. Nesta versão:

- no máximo uma Venda vinculada por oportunidade;
- vínculo explícito com Venda existente é permitido;
- oportunidade precisa estar GANHA;
- Venda e oportunidade devem pertencer à mesma empresa;
- ambas devem possuir o mesmo Cliente;
- Venda não pode estar vinculada a outra oportunidade.

Não copiar itens nem ciclo de vida da Venda para a oportunidade.

#### Integridade multiempresa

Usar defesa em profundidade: consultas, escritas e validações de relacionamentos no backend respeitam a empresa autenticada, complementadas por constraints quando tecnicamente aplicável.

Chaves compostas homologadas:

- Usuario: `@@unique([empresaId, id])`;
- Cliente: `@@unique([empresaId, id])`;
- CrmEtapa: `@@unique([empresaId, id])`;
- CrmOportunidade: `@@unique([empresaId, id])`;
- AgendaEvento: `@@unique([empresaId, id])` somente se necessário para FK composta da interação.

Relações críticas devem impedir cross-tenant:

- oportunidade → cliente;
- oportunidade → etapa;
- oportunidade → responsável;
- oportunidade → venda;
- interação → cliente;
- interação → oportunidade;
- interação → responsável;
- interação → agenda.

A V3.5.1 não executou alteração de schema, migration ou seed. A V3.5.2 aplicou e homologou a migration incremental no ambiente de teste.

#### Permissões CRM e provisionamento

Foram provisionadas as sete permissões:

- `crm.visualizar`;
- `crm.interacoes.criar`;
- `crm.interacoes.editar`;
- `crm.oportunidades.criar`;
- `crm.oportunidades.editar`;
- `crm.oportunidades.movimentar`;
- `crm.funil.gerenciar`.

As sete são delegáveis, com integração explícita à allowlist e ao enforcement existentes. Delegável não significa concessão automática; preservar os limites de delegação e a autoridade do backend.

| Perfil padrão | Permissões CRM padrão |
|---|---|
| Super Administrador | Todas as sete. |
| Administrador do Sistema | Todas as sete. |
| Administrador da Empresa | Todas as sete. |
| Supervisor | Todas, exceto `crm.funil.gerenciar`. |
| RH | Nenhuma por padrão. |
| Colaborador | `crm.visualizar`, `crm.interacoes.criar`, `crm.oportunidades.criar`. |

Foram respeitados os perfis reais existentes no seed, sem criar segundo sistema de papéis. O provisioning incremental não concede CRM silenciosamente a usuários fora dos perfis padrão existentes. A tabela representa provisionamento dos perfis padrão, não TipoUsuario. Esse provisionamento não altera a elegibilidade de responsável CRM: `ADMIN_EMPRESA` e `USUARIO_EMPRESA` podem ser responsáveis; `SUPER_ADMIN` não pode. Os requisitos de acesso operacional do módulo permanecem obrigatórios.

#### Timeline agregada do Cliente

Futuramente poderá haver timeline CRM agregada com fontes distintas: interação CRM, Agenda, oportunidade, Venda, Ordem de Serviço e histórico existente.

Manter a origem explícita de cada registro. A agregação de apresentação/consulta não funde entidades nem seus ciclos de vida.

#### Escopo excluído

Não incluir na V3.5:

- marketing automation;
- WhatsApp API;
- omnichannel;
- IA;
- comissões;
- automações gerais;
- Financeiro Avançado V3.6;
- Notificações/Automações V3.7;
- itens V4.0;
- refatoração global de module gating;
- novo cadastro Lead;
- novo ModuloSistema `clientes`.

### V3.5.2 — Persistência e Integridade

**STATUS: CONCLUÍDA, HOMOLOGADA E VERSIONADA.** Publicada em `origin/develop` no commit `4d32bcb6f91c6a350917089a4fe4690d40428c43` (`feat(crm): adiciona persistencia e integridade da V3.5.2`).

A V3.5.2 entregou `TipoEtapaCRM`, `TipoInteracaoCRM`, `CrmEtapa`, `CrmOportunidade`, `ClienteInteracao` e `CrmOportunidadeHistorico`, com relações, constraints, índices e `versaoRegistro` previstos no contrato.

A migration `20260919024242_v3_5_2_persistencia_integridade_crm` foi aplicada somente em `sistema_gestao_teste`, finalizada sem reversão ou logs de erro; o Prisma reconheceu 40 migrations, reportou schema atualizado e homologou o checksum `06ae33775b063252ecd2fd26d34a18709fe0b1248032585ea50da72559730bc5`.

A homologação real em PostgreSQL confirmou FKs compostas de tenant, oportunidade/cliente, interação/oportunidade com o mesmo cliente, oportunidade/venda com mesmo tenant e cliente, exclusividade de venda por oportunidade, autor global `SUPER_ADMIN` permitido no histórico, `RESTRICT` para histórico/estrutura, `SET NULL` seletivo apenas em `agendaEventoId` e ausência de `ON DELETE CASCADE` no CRM. Os testes transacionais foram revertidos, sem resíduos.

O provisioning incremental provisionou o módulo `crm` e as sete permissões delegáveis. A primeira execução real resultou em `perfisAlterados: 5` e `usuariosRevogados: 3`; a segunda em `0` e `0`, respectivamente. O banco final possui um módulo CRM, sete permissões, 30 vínculos permitidos, zero `EmpresaModulo` CRM e zero duplicidades.

A regressão final aprovou Prisma format, validate, generate e migrate status; 70 suítes backend e 1.284 testes passaram, com três suítes e 164 testes skipped (1.448 totais). Backend build e `git diff --check` também foram aprovados.

Nenhuma alteração foi realizada em produção. CRM não foi ativado automaticamente via `EmpresaModulo`.

### V3.5.3 — Interações e Integração com Agenda

**STATUS: CONCLUÍDA, HOMOLOGADA, VERSIONADA E PUBLICADA.** Publicada em `origin/develop` no commit `3b9a5b87979ce552e64e2f83fde0afefd1635f70`.

Entregues os endpoints de criação, consulta paginada, consulta por identificador e atualização de `ClienteInteracao`, sem DELETE; isolamento multiempresa, RBAC, módulo ativo CRM, responsável elegível, optimistic locking por `versaoRegistro` e auditorias transacionais.

O vínculo opcional com Agenda exige o mesmo cliente; a proteção inversa impede alterar ou remover o cliente de `AgendaEvento` quando isso tornaria uma interação vinculada inconsistente. Não há criação ou conclusão automática de AgendaEvento.

A homologação funcional no ambiente de teste confirmou contratos de tenant, permissões, módulo ativo, Agenda, UUIDs/filtros temporais e operações negativas sem efeitos colaterais. A regressão final aprovou 30 testes CRM, 49 de Agenda, 71 suítes backend/1.318 testes aprovados, build, TypeScript, Prisma validate/migrate status, ESLint do escopo e `git diff --check`. Produção permanece intocada.

### V3.5.4 — Oportunidades e Funil

**STATUS: CONCLUÍDA E HOMOLOGADA — aguardando versionamento/publicação.**

Entregues o funil configurável por empresa com `CrmEtapa`; oportunidades CRM com criação, listagem, detalhe, edição, movimentação, ganho, perda com motivo e reabertura; optimistic locking, histórico comercial e auditoria transacional. Também foram entregues vínculo e desvínculo explícitos de Venda existente, proteção contra troca de cliente de Venda vinculada, responsáveis CRM elegíveis e consulta dos módulos ativos da própria empresa para suporte ao frontend.

A entrega preserva isolamento multiempresa, permissões CRM existentes e regras de integridade com Agenda e Vendas. Não inclui frontend, Kanban visual, timeline visual, criação automática de Venda, integração fiscal ou automações futuras.

A homologação final aprovou 80 suítes backend, com 3 skipped; 1.500 testes aprovados, 164 skipped e 1.664 totais. Prisma, TypeScript, build, ESLint e `git diff --check` foram aprovados. Produção permanece intocada.

### Subdivisão oficial da V3.5

O planejamento incremental abaixo organiza a V3.5 sem ampliar seu objetivo congelado. A V3.5.4 foi concluída e homologada; a V3.5.5 é a etapa atual.

| Etapa | Status | Entrega planejada |
|---|---|---|
| V3.5.1 — Contrato e Arquitetura CRM | CONCLUÍDA E VERSIONADA | Contrato arquitetural consolidado e revisado; arquitetura aprovada na revisão independente final da FASE 3C; commit `7373470`. |
| V3.5.2 — Persistência e Integridade | CONCLUÍDA, HOMOLOGADA E VERSIONADA | Persistência dos modelos CRM, integridade multiempresa, migration, provisioning/RBAC e regressão técnica; commit `4d32bcb6f91c6a350917089a4fe4690d40428c43` publicado em `origin/develop`. |
| V3.5.3 — Interações e Integração com Agenda | CONCLUÍDA, HOMOLOGADA, VERSIONADA E PUBLICADA | Interações estruturadas, vínculo opcional com Agenda, integrações e regressão final aprovados no ambiente de teste; commit `3b9a5b87979ce552e64e2f83fde0afefd1635f70` publicado em `origin/develop`. |
| V3.5.4 — Oportunidades e Funil | CONCLUÍDA E HOMOLOGADA — aguardando versionamento/publicação | Funil configurável por empresa, oportunidades, operações comerciais, histórico, auditoria e integração explícita com Venda. |
| V3.5.5 — Frontend e Integração | EM ANDAMENTO | Interface CRM e integração aos fluxos existentes conforme o contrato. |
| V3.5.6 — Homologação Final do CRM | PENDENTE | Homologação integrada do CRM, permissões, tenant e regressão. |

## V4.0 — Evolução Avançada de RH e Automações

STATUS: BACKLOG FUTURO — NÃO INICIAR ANTES DA CONCLUSÃO INTEGRAL DA V3.x

V4.0 será objeto de novo planejamento futuro.

Backlog futuro:

- desativação de usuário com motivo;
- motivo DESLIGAMENTO;
- motivo FERIAS;
- motivo AFASTAMENTO;
- motivo LICENCA;
- motivo INATIVACAO_TEMPORARIA;
- outros motivos estruturados;
- sincronização automática motivo → status funcional;
- períodos estruturados de férias;
- início/fim de afastamentos;
- início/fim de licenças;
- retorno programado;
- agendamento de mudanças funcionais;
- reativação assistida;
- reativação automática quando futuramente aprovada;
- múltiplos vínculos;
- recontratações;
- reutilização segura de conta em recontratação;
- folha de pagamento;
- salários/remuneração;
- ponto eletrônico;
- banco de horas;
- férias avançadas;
- benefícios;
- eSocial;
- documentos trabalhistas;
- recrutamento;
- avaliação de desempenho;
- treinamentos;
- saúde ocupacional;
- gestão documental de RH;
- documentos digitalizados;
- notificações de RH;
- automações de RH;
- outras melhorias deliberadamente excluídas da V3.4 que forem identificadas durante implementação/homologação.

IMPORTANTE:

Itens V4.0 NÃO devem:

- aumentar escopo da V3.4;
- virar pendências da V3.x;
- bloquear homologação da V3.4;
- receber implementação agora.

Também ficam fora da V3.4 e compõem o backlog para avaliação futura: filial completa, unidade organizacional, hierarquia complexa, tabela salarial, diagnóstico médico, laudo médico, biometria, dados bancários e dependentes. A inclusão no backlog não autoriza sua coleta ou implementação; depende do novo planejamento da V4.0.

## Consolidações finais já previstas

Itens pendentes do planejamento oficial, separados das versões. Módulos já entregues podem demandar consolidação final sem perder seu status histórico de conclusão.

- [ ] Auditoria / consolidação técnica.
- [ ] Financeiro.
- [ ] Estoque e operações.
- [ ] Ordens de Serviço.
- [ ] Fornecedores.
- [ ] Contas a Pagar.
- [ ] Contas a Receber.
- [ ] Pedidos de Compra.
- [ ] Caixas.
- [ ] Vendas.
- [ ] Integrações finais.
- [ ] Segurança / RBAC / tenant.
- [ ] Auditoria global.
- [ ] Homologação global.
- [ ] Preparação para produção.
- [ ] Manual / Central de Ajuda — reservado para o final do projeto.

Essas consolidações foram reafirmadas pelo responsável nesta atualização. Não se convertem automaticamente em novas versões; critérios de aceite e priorização serão registrados quando forem trabalhadas.

## Fluxo oficial de desenvolvimento

1. Trabalhar no ambiente de teste.
2. Levantar o estado atual antes de alterar código: instruções, Git, arquitetura, dependências e fluxos afetados.
3. Criar a branch específica da sprint; confirmar sua finalidade.
4. Implementar incrementalmente, reutilizando estruturas existentes.
5. Validar cada fase.
6. Executar testes adequados ao escopo e gates de encerramento.
7. Executar lint.
8. Executar TypeScript/typecheck.
9. Executar build.
10. Validar `git diff --check`.
11. Homologar funcionalmente.
12. Fazer staging controlado.
13. Revisar o staged diff.
14. Fazer commit.
15. Integrar em `develop`.
16. Executar validação pós-merge.
17. Fazer push via HTTPS quando autorizado na tarefa.
18. Confirmar sincronização local/remota.

Não realizar deploy em produção automaticamente. Em tarefas exclusivamente documentais, registrar quais gates são aplicáveis; não iniciar alterações funcionais para cumprir um checklist genérico.

## Regras de Git

- `develop` é a branch de integração; verificar a branch real antes de qualquer tarefa.
- Funcionalidades são desenvolvidas em branches específicas.
- Evitar `git add .` em fechamento crítico; preferir staging explícito/controlado.
- Revisar diff e staged diff antes do commit; não incluir trabalho alheio ou artefatos inadvertidamente.
- Usar Conventional Commits e respeitar Husky/commitlint presentes no projeto.
- Push via HTTPS; credenciais não devem ser salvas no repositório.
- `main`/produção somente em etapa específica de release, com autorização e validação.
- Não executar comandos destrutivos ou reescrever histórico automaticamente.
- Este documento não autoriza staging, commit, merge, push ou deploy por si só.

## Limitações e decisões conhecidas

1. Backend permanece autoridade final de RBAC; permissões de interface são apenas controles de apresentação e interação.
2. Perfis de sistema são protegidos, e isolamento por empresa é obrigatório em consultas e escritas empresariais.
3. Query keys empresariais devem considerar tenant; mudanças de sessão devem descartar cache/respostas da sessão anterior.
4. Novas permissões empresariais não se tornam delegáveis automaticamente: exigem revisão explícita da allowlist e do enforcement.
5. Mudanças de autorização podem invalidar sessões por `versaoAutorizacao`; futuras escritas devem preservar esse protocolo.
6. Escritas de perfis mantêm isolamento Serializable, locks de ator/perfil e até três tentativas para conflitos conhecidos. O risco residual de deadlock foi aceito na revisão da V3.3.5; testes simulados não comprovam concorrência/rollback PostgreSQL real.
7. A auditoria geral via interceptor possui comportamento best-effort, conforme histórico da V2. A auditoria das escritas de perfis é transacional e falha junto com a operação. Não generalizar uma política para todos os módulos.
8. Manual/Central de Ajuda permanece reservado para o final. Teste e homologação precedem produção.
9. Nenhuma verificação operacional de produção, banco ou migrations aplicadas foi feita para este documento. Não inferir deploy a partir de merge em develop.
10. A documentação histórica registra decisões amplas e papéis previstos; o código atual distingue os três papéis principais e perfis globais/empresariais. Este roadmap não altera ADRs nem transforma exemplos de módulos em entregas.
11. Evidência visual e resultados de fechamento devem conservar sua origem. Não há nova homologação de navegador nesta consolidação.

## Fontes e handoff técnico

| Referência | Uso |
|---|---|
| [AGENTS.md](../AGENTS.md) | Regras de execução, segurança e escopo |
| [DECISIONS.md](../DECISIONS.md) | Decisões arquiteturais permanentes |
| [CHANGELOG.md](../CHANGELOG.md) | Histórico de releases; não representa sozinho o estado mais recente |
| [Release V2.0.0](releases/V2.0.0.md) | Entregas e limitações históricas da V2 |
| [Documentação de produtos](produtos/README.md) | Modelo e regras do módulo |
| [Documentação de estoque](estoque/README.md) | Modelo e referência do módulo |
| [Instruções frontend](../frontend/AGENTS.md) | Regras locais para futuras alterações frontend |
| `backend/src/app.module.ts` | Inventário dos módulos backend registrados |
| `backend/src/perfis/` e `backend/src/permissoes/` | Contratos e testes atuais de administração RBAC |
| `frontend/src/app/perfis/` e `frontend/src/components/perfis/` | Implementação da V3.3.6 |
| Histórico Git | Commits e integrações citados neste documento |

Etapa atual: V3.5 — CRM. A V3.4 foi concluída, homologada, versionada no commit `ce0ccdd` e publicada em `origin/develop`. A V3.5 permanece EM ANDAMENTO; a V3.5.1 foi concluída e versionada, a V3.5.2 foi concluída, homologada, versionada e publicada no commit `4d32bcb6f91c6a350917089a4fe4690d40428c43`, e a V3.5.3 foi concluída, homologada, versionada e publicada em `origin/develop` no commit `3b9a5b87979ce552e64e2f83fde0afefd1635f70`. A V3.5.4 — Oportunidades e Funil foi concluída e homologada, aguardando versionamento/publicação; a etapa atual é a V3.5.5 — Frontend e Integração, preservando o objetivo congelado do roadmap e sem antecipar itens da V3.6 ou do backlog V4.0. Produção permanece intocada.

## Como atualizar este documento

Ao finalizar qualquer sprint, módulo ou alteração arquitetural relevante:

1. Atualizar o status da sprint.
2. Registrar o que foi implementado, distinguindo entrega funcional de infraestrutura ou catálogo reservado.
3. Registrar decisões técnicas relevantes e limitações remanescentes.
4. Atualizar commit/branch de referência e o Estado Atual; evitar referências autorrecursivas ao commit ainda não criado.
5. Atualizar testes realizados, comandos/resultados e origem da evidência de homologação.
6. Atualizar a próxima etapa.
7. Atualizar o percentual geral estimado, explicitando que é estimativa de planejamento.
8. Adicionar entrada no histórico de atualizações.

**O documento deve ser atualizado ANTES de considerar uma sprint oficialmente encerrada.** Após integração, atualizar a referência de merge quando disponível no fluxo autorizado. Preservar entradas históricas e identificar limitações superadas, sem reescrever entregas passadas como se fossem o estado atual.

Não copiar valores de password, senha, token, secret, DATABASE_URL ou PAT. Essas palavras podem aparecer em orientações genéricas, mas nunca acompanhadas de valores secretos. Não ler arquivos de credenciais para enriquecer o roadmap.

## Histórico de atualizações

| Data | Versão/Sprint | Alteração | Commit de referência | Status |
|---|---|---|---|---|
| 2026-09-06 | V3.3.6 / consolidação do roadmap | Criação do documento oficial; consolidação de V1–V3.3, estado técnico, evidências de encerramento, V3.4–V3.11, pendências e handoff | `29fe179` (feature), `f7dc834` (integração) | V3.3.6 CONCLUÍDA E HOMOLOGADA; documento criado para revisão |
| 2026-09-07 | V3.4.1 — Contrato e Arquitetura | Conclusão do planejamento arquitetural: separação Funcionario x Usuario, associação opcional 1:1, integração com Perfis/Permissões existentes, seis estados funcionais, status funcional separado do acesso, opção C para desativação de Usuario, primeiro login com troca obrigatória, histórico funcional, protocolo de integridade/concorrência e backlog futuro V4.0. Na data do planejamento ainda não havia implementação funcional. | `b3b4104` — versionado posteriormente | CONCLUÍDA E VERSIONADA; registro histórico do planejamento de 2026-09-07 |

| 2026-09-09 | V3.4.2–V3.4.5 — Implementação RH | Persistência/integridade, cadastros/consultas, ciclo de vida e acesso associado/primeiro login concluídos e homologados em etapas incrementais. | `893403a`, `7b6dbb8`, `1d7781f`, `db706e2` | CONCLUÍDAS, HOMOLOGADAS E VERSIONADAS |
| 2026-09-09 | V3.4.6 — Homologação Integrada | Frontend RH, responsividade, integração Funcionario x Usuario, CE-2 multiempresa em Usuarios, CE-3 gestão Usuario x Perfil, regressão final com 69 suítes/1.283 testes backend, lint/build frontend, PostgreSQL real e homologação manual. | Aguardando commit do fechamento | TECNICAMENTE HOMOLOGADA; V3.4 EM FECHAMENTO; ~89% |
| 2026-09-10 | V3.4 — Fechamento / V3.5 — Abertura | V3.4 concluída após homologação integrada; commit final publicado em `origin/develop`. Abertura da V3.5 CRM pela auditoria e definição do contrato arquitetural, sem alterações em produção. | `ce0ccdd` | V3.4 CONCLUÍDA, HOMOLOGADA, VERSIONADA E PUBLICADA; V3.5 EM ANDAMENTO; ~90% |
| 2026-09-18 | V3.5.1 — Contrato e Arquitetura CRM | Contrato consolidado: Cliente como cadastro mestre, ClienteInteracao, funil configurável, oportunidades, integração conceitual com Agenda e Venda, module gating CRM, RBAC e integridade multiempresa. Revisão arquitetural final da FASE 3C aprovada. | `7373470b5720e56ce1c938e0d3f3ba67b70f45af` | V3.5.1 CONCLUÍDA E VERSIONADA; V3.5 EM ANDAMENTO; ~91% |
| 2026-09-19 | V3.5.2 — Persistência e Integridade CRM | Persistência, migration, integridade multiempresa, provisioning/RBAC e regressão técnica homologados no ambiente de teste; nenhuma alteração em produção. | `4d32bcb6f91c6a350917089a4fe4690d40428c43` — publicado em `origin/develop` | V3.5.2 CONCLUÍDA, HOMOLOGADA, VERSIONADA E PUBLICADA; V3.5 EM ANDAMENTO; ~93% |
| 2026-09-19 | V3.5.3 — Interações e Integração com Agenda | Interações CRM, integração opcional com Agenda, contratos de tenant/RBAC/módulo ativo, auditoria transacional, optimistic locking e regressão final homologados no ambiente de teste; produção intocada. | `3b9a5b87979ce552e64e2f83fde0afefd1635f70` — publicado em `origin/develop` | V3.5.3 CONCLUÍDA, HOMOLOGADA, VERSIONADA E PUBLICADA; V3.5 EM ANDAMENTO; ~93% |
| 2026-09-20 | V3.5.4 — Oportunidades e Funil | Backend concluído e homologado: funil configurável, oportunidades, máquina de estados, histórico, auditoria, integração explícita com Venda, proteção inversa, responsáveis CRM e módulos ativos por contexto; produção intocada. | Aguardando versionamento/publicação do fechamento atual | V3.5.4 CONCLUÍDA E HOMOLOGADA; V3.5.5 EM ANDAMENTO |
