# Roadmap oficial — Sistema de Gestão Empresarial Multiempresa (SGE)

## Contexto rápido para novo chat

- **Projeto:** Sistema de Gestão Empresarial Multiempresa (SGE), ERP SaaS multi-tenant.
- **Arquitetura:** Next.js, React, TypeScript, TanStack Query, Axios e Tailwind no frontend; NestJS, TypeScript e Prisma no backend; PostgreSQL.
- **Ambiente de trabalho:** teste, `/opt/sistema-gestao/teste`.
- **Branch atual e de integração:** `develop`.
- **Último commit de referência:** `dcac4ea` — consolidação documental do roadmap; a V3.4.1 ainda aguarda versionamento.
- **Última sprint funcional homologada:** V3.3.6 — Gestão de Perfis e Permissões no Frontend — CONCLUÍDA E HOMOLOGADA.
- **Marcos concluídos:** V1, V2, V3.1, V3.2 e V3.3.
- **Sprint atual:** V3.4 — Gestão de Funcionários (RH) — EM ANDAMENTO.
- **V3.4.1 — Contrato e Arquitetura:** contrato aprovado/documentado; CONCLUÍDA DOCUMENTALMENTE, aguardando versionamento.
- **Próxima etapa:** V3.4.2 — Persistência e Integridade.
- **V4.0:** apenas backlog futuro, para novo planejamento após conclusão integral da V3.x.
- **Progresso geral estimado:** aproximadamente 70%, estimativa de planejamento, não métrica calculada do código.
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

| Campo | Estado no fechamento documental da V3.4.1 |
|---|---|
| Data da atualização | 2026-09-07 |
| Ambiente auditado | Teste: `/opt/sistema-gestao/teste` |
| Branch atual | `develop` |
| HEAD | `dcac4ea8d82fef415fb39f527cbc917468e2e556` |
| Assunto do último commit | `docs(roadmap): consolida histórico e planejamento do SGE` |
| Working tree antes desta atualização | Limpa; nenhum arquivo staged |
| Referências de integração | `develop` e `origin/develop` apontam para `dcac4ea` |
| Referências da feature | Feature local e `origin/feat/v3-3-6-frontend-perfis-permissoes` apontam para `29fe179` |
| Versão/marco atual | V3.4 — Gestão de Funcionários (RH) — EM ANDAMENTO |
| Contrato V3.4.1 | CONCLUÍDA DOCUMENTALMENTE, aguardando versionamento |
| Última sprint concluída | V3.3.6 — CONCLUÍDA E HOMOLOGADA |
| Próxima etapa | V3.4.2 — Persistência e Integridade |
| Implementação em andamento | Nenhuma implementação funcional realizada nesta etapa; contrato V3.4.1 documentado |
| Estimativa geral | Aproximadamente 70% |

A sincronização acima foi verificada pelas referências remotas disponíveis localmente, sem fetch ou consulta de rede. O estado atual do servidor remoto não foi reconsultado. Nesta atualização documental, a única mudança é `docs/ROADMAP_SGE.md`, ainda sem staging/commit nesta tarefa.

O progresso de 70% não significa que todo módulo está 70% pronto. V1, V2, V3.1, V3.2 e V3.3 estão concluídas; V3.4 está em andamento. As etapas posteriores e consolidações finais continuam pendentes. O fechamento documental da V3.4.1 não aumenta o percentual.

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
| [ ] EM ANDAMENTO | V3.4 | Gestão de Funcionários (RH) |
| [ ] PENDENTE | V3.5 | CRM |
| [ ] PENDENTE | V3.6 | Financeiro Avançado |
| [ ] PENDENTE | V3.7 | Notificações e Automações |
| [ ] PENDENTE | V3.8 | Configurações da Empresa |
| [ ] PENDENTE | V3.9 | Base Fiscal |
| [ ] PENDENTE | V3.10 | Integrações e Gestão de Arquivos |
| [ ] PENDENTE | V3.11 | Homologação Final |

Para **V3.5 e demais sprints futuras** desta tabela: **Escopo detalhado será definido na abertura da sprint, preservando o objetivo já estabelecido no roadmap.**

A existência de Financeiro e de APIs de empresas não encerra Financeiro Avançado nem Configurações da Empresa. Catálogos ou nomes reservados também não significam implementação funcional de RH, CRM ou Fiscal.

## V3.4 — Gestão de Funcionários (RH) — EM ANDAMENTO

### V3.4.1 — Contrato e Arquitetura

**STATUS: CONCLUÍDA DOCUMENTALMENTE, aguardando versionamento.** Contrato aprovado pelo responsável em 2026-09-07. Próxima etapa: **V3.4.2 — Persistência e Integridade**.

Esta seção registra planejamento aprovado. Modelos, campos, endpoints e fluxos descritos como planejados ainda não constituem implementação funcional. Nenhum código, Prisma, migration, banco, backend, frontend, seed ou dependência foi alterado nesta etapa. Não houve staging, commit ou push da V3.4.1. A V3.4 permanece em andamento e o progresso geral permanece em aproximadamente 70%.

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

| Etapa | Status | Escopo aprovado |
|---|---|---|
| V3.4.1 — Contrato e Arquitetura | CONCLUÍDA DOCUMENTALMENTE, aguardando versionamento | Contrato aprovado e registrado nesta seção; nenhuma implementação funcional. |
| V3.4.2 — Persistência e Integridade | PENDENTE / PRÓXIMA | Funcionario; Cargo; Departamento; FuncionarioHistorico; Usuario.trocaSenhaObrigatoria; enums; relações; constraints; índices; migration; testes de integridade. |
| V3.4.3 — Cadastros e Consultas | PENDENTE | cadastro de funcionário; edição; listagem; detalhe; dados profissionais; dados pessoais restritos; cargos; departamentos; filtros; paginação; frontend inicial. |
| V3.4.4 — Ciclo de Vida | PENDENTE | férias; afastamento; licença; inativação; retorno; desligamento; reclassificações aprovadas; efeitos sobre acesso; histórico; auditoria. |
| V3.4.5 — Acesso Associado e Primeiro Login | PENDENTE | criar Usuario pelo RH; vincular existente; desvincular; ativar/inativar acesso; integração com Perfis; troca obrigatória de senha; proteções em UsuariosService; proteção do seed; concorrência real. |
| V3.4.6 — Homologação Integrada | PENDENTE | revisão adversarial; tenant; RBAC; privacidade; atomicidade; concorrência; UX; responsividade; acessibilidade; testes; lint; typecheck; build; diff check; homologação funcional. |

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

Próxima etapa: V3.4.2 — Persistência e Integridade. Antes de iniciá-la, aguardar revisão e autorização do responsável, reler o contrato V3.4.1 e estas fontes, confirmar o estado Git, pesquisar estruturas equivalentes e abrir a branch apropriada. Esta atualização documental não autoriza git add, commit, push nem implementação da V3.4.2. Não implementar itens posteriores ou do backlog V4.0 por inferência.

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
| 2026-09-07 | V3.4.1 — Contrato e Arquitetura | Conclusão do planejamento arquitetural: separação Funcionario x Usuario, associação opcional 1:1, integração com Perfis/Permissões existentes, seis estados funcionais, status funcional separado do acesso, opção C para desativação de Usuario, primeiro login com troca obrigatória, histórico funcional, protocolo de integridade/concorrência e backlog futuro V4.0. Nenhuma implementação funcional realizada nesta etapa. | Aguardando versionamento; sem commit desta etapa | CONCLUÍDA DOCUMENTALMENTE, aguardando versionamento; V3.4 EM ANDAMENTO; próxima V3.4.2; ~70% |
