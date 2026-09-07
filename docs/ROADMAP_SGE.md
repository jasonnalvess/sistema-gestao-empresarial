# Roadmap oficial — Sistema de Gestão Empresarial Multiempresa (SGE)

## Contexto rápido para novo chat

- **Projeto:** Sistema de Gestão Empresarial Multiempresa (SGE), ERP SaaS multi-tenant.
- **Arquitetura:** Next.js, React, TypeScript, TanStack Query, Axios e Tailwind no frontend; NestJS, TypeScript e Prisma no backend; PostgreSQL.
- **Ambiente de trabalho:** teste, `/opt/sistema-gestao/teste`.
- **Branch atual e de integração:** `develop`.
- **Último commit de referência:** `f7dc834` — integração da V3.3.6.
- **Última sprint:** V3.3.6 — Gestão de Perfis e Permissões no Frontend — CONCLUÍDA E HOMOLOGADA.
- **Marco concluído:** V3.3 — Administração de Perfis.
- **Próxima sprint:** V3.4 — Gestão de Funcionários (RH).
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

| Campo | Estado na auditoria inicial |
|---|---|
| Data da atualização | 2026-09-06 |
| Ambiente auditado | Teste: `/opt/sistema-gestao/teste` |
| Branch atual | `develop` |
| HEAD | `f7dc834f61915147e19f76ba38c7039b36ca6f04` |
| Assunto do último commit | `feat(rbac): integra V3.3.6 gestão de perfis e permissões` |
| Working tree antes deste documento | Limpa; nenhum arquivo staged |
| Referências de integração | `develop` e `origin/develop` apontam para `f7dc834` |
| Referências da feature | Feature local e `origin/feat/v3-3-6-frontend-perfis-permissoes` apontam para `29fe179` |
| Versão/marco atual | V3.3 — Administração de Perfis — CONCLUÍDA |
| Última sprint concluída | V3.3.6 — CONCLUÍDA E HOMOLOGADA |
| Próxima sprint | V3.4 — Gestão de Funcionários (RH) — PENDENTE / PRÓXIMA |
| Implementação em andamento | Nenhuma nova sprint funcional iniciada nesta tarefa; consolidação documental |
| Estimativa geral | Aproximadamente 70% |

A sincronização acima foi verificada pelas referências remotas disponíveis localmente, sem fetch ou consulta de rede. O estado atual do servidor remoto não foi reconsultado. Após a criação deste documento, a única mudança esperada é `docs/ROADMAP_SGE.md`, ainda sem staging/commit nesta tarefa.

O progresso de 70% não significa que todo módulo está 70% pronto. V1, V2, V3.1, V3.2 e V3.3 estão concluídas; as próximas sprints e consolidações finais continuam pendentes.

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

A sequência abaixo é fechada para este planejamento. Não adicionar módulos ou versões automaticamente.

| Status | Versão | Objetivo |
|---|---|---|
| [ ] PENDENTE / PRÓXIMA | V3.4 | Gestão de Funcionários (RH) |
| [ ] PENDENTE | V3.5 | CRM |
| [ ] PENDENTE | V3.6 | Financeiro Avançado |
| [ ] PENDENTE | V3.7 | Notificações e Automações |
| [ ] PENDENTE | V3.8 | Configurações da Empresa |
| [ ] PENDENTE | V3.9 | Base Fiscal |
| [ ] PENDENTE | V3.10 | Integrações e Gestão de Arquivos |
| [ ] PENDENTE | V3.11 | Homologação Final |

Para **cada sprint futura** desta tabela: **Escopo detalhado será definido na abertura da sprint, preservando o objetivo já estabelecido no roadmap.**

A existência de Financeiro e de APIs de empresas não encerra Financeiro Avançado nem Configurações da Empresa. Catálogos ou nomes reservados também não significam implementação funcional de RH, CRM ou Fiscal.

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

Para iniciar a V3.4: reler estas fontes, confirmar o estado Git atualizado, definir o escopo detalhado de RH e seus critérios de aceite, pesquisar estruturas equivalentes e abrir a branch apropriada. Não implementar itens das sprints posteriores por inferência.

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
