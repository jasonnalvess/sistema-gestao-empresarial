# DECISIONS.md

# Registro de Decisões Arquiteturais

Versão: 1.0

---

# Objetivo

Este documento registra todas as decisões arquiteturais permanentes do Sistema de Gestão Empresarial.

Essas decisões representam a base estrutural do projeto e **não devem ser alteradas automaticamente por agentes de IA**.

Sempre que uma implementação exigir alteração em qualquer decisão descrita neste documento, a implementação deve ser interrompida e uma autorização explícita deve ser solicitada.

Na ausência de autorização, estas decisões são consideradas permanentes.

---

# ADR-001 — Arquitetura do Sistema

## Decisão

O sistema será um ERP SaaS Multiempresa.

Cada empresa utilizará a mesma aplicação.

Os dados serão isolados por Tenant.

## Motivo

Permitir escalabilidade.

Reduzir custos.

Facilitar manutenção.

---

# ADR-002 — Isolamento de Dados

## Decisão

Todo registro pertence obrigatoriamente a uma empresa.

Nenhuma consulta poderá retornar registros de outra empresa.

## Regras

Toda consulta deve considerar:

- empresa autenticada
- permissões do usuário

Nunca remover filtros de Tenant.

Nunca criar consultas globais sem autorização.

---

# ADR-003 — Stack Oficial

## Backend

NestJS

Prisma

TypeScript

JWT

PostgreSQL

## Frontend

Next.js

React

TailwindCSS

TypeScript

Esta stack é oficial.

Não substituir frameworks sem autorização.

---

# ADR-004 — Arquitetura Modular

Cada módulo deve possuir responsabilidade própria.

Exemplos:

- Estoque

- Caixa

- Funcionários

- Empresas

- Agenda

- Financeiro

- Fiscal

- Relatórios

Novos módulos deverão seguir o mesmo padrão.

---

# ADR-005 — Backend

Controllers possuem apenas responsabilidade HTTP.

Toda regra de negócio permanece nos Services.

Nunca mover regra de negócio para Controllers.

---

# ADR-006 — Frontend

Frontend é responsável apenas pela interface.

Nunca mover validações críticas para o Frontend.

Toda regra crítica permanece no Backend.

---

# ADR-007 — Banco de Dados

Banco oficial:

PostgreSQL

ORM oficial:

Prisma

Toda alteração estrutural deve utilizar Migrations.

Nunca alterar estrutura manualmente em produção.

---

# ADR-008 — Autenticação

Autenticação oficial:

JWT

Toda autenticação deve ocorrer pelo Backend.

Nunca confiar em autenticação realizada apenas no Frontend.

---

# ADR-009 — Autorização

Modelo oficial:

RBAC (Role Based Access Control)

Toda autorização ocorre no Backend.

Menus ocultos não representam segurança.

---

# ADR-010 — Empresas

Toda empresa representa um Tenant.

Toda empresa possui usuários.

Usuários pertencem a apenas uma empresa.

Nunca permitir acesso cruzado entre empresas.

---

# ADR-011 — Usuários

Tipos previstos:

Super Administrador

Administrador do Sistema

Administrador da Empresa

Supervisor

Funcionário

Novos perfis poderão ser adicionados.

Os existentes não devem ser removidos sem autorização.

---

# ADR-012 — Escalabilidade

Toda implementação deve permitir crescimento do sistema.

Evitar soluções específicas que dificultem expansão.

Novos módulos devem integrar-se à arquitetura existente.

---

# ADR-013 — Reutilização

Antes de criar qualquer implementação nova, verificar se já existe solução equivalente.

Evitar duplicação.

Padronizar componentes.

---

# ADR-014 — APIs

Toda API deve seguir padrão REST.

Utilizar DTOs.

Utilizar validação.

Evitar quebra de contratos.

Mudanças incompatíveis exigem autorização.

---

# ADR-015 — Componentes Compartilhados

São considerados componentes compartilhados:

Layout

Sidebar

Header

Providers

Contexts

Hooks globais

Tabela padrão

Modal padrão

Alterações nesses componentes exigem análise de impacto.

---

# ADR-016 — Banco

Nunca remover:

- tabelas

- colunas

- índices

- relacionamentos

sem autorização.

---

# ADR-017 — Segurança

Segurança possui prioridade máxima.

Nunca remover:

Guards

Middlewares

Interceptors

Validações

Rate Limits

Autorização

Autenticação

sem autorização.

---

# ADR-018 — Branches

O projeto poderá utilizar múltiplas estratégias de branches.

Nunca assumir que develop é sempre a branch correta.

Sempre respeitar a branch utilizada para a tarefa.

---

# ADR-019 — Ambientes

Existem ambientes distintos.

Teste.

Produção.

Toda implementação inicia em Teste.

Produção somente após validação.

---

# ADR-020 — Git

Nunca executar comandos destrutivos automaticamente.

Exemplos:

git reset --hard

git push --force

git clean

checkout forçado

restore em massa

Esses comandos exigem autorização explícita.

---

# ADR-021 — Refatoração

Refatorações somente quando:

solicitadas

ou necessárias para implementação.

Nunca realizar refatorações extensas por iniciativa própria.

---

# ADR-022 — Escopo

Toda implementação deve respeitar rigorosamente o escopo solicitado.

Nunca ampliar escopo.

Nunca modificar arquivos não relacionados.

---

# ADR-023 — Preservação

Funcionalidades existentes possuem prioridade.

Nunca remover:

módulos

rotas

menus

permissões

telas

APIs

sem autorização.

---

# ADR-024 — Logs

Logs temporários devem ser removidos antes da conclusão.

Console.log apenas durante desenvolvimento.

Nunca deixar código de depuração em produção.

---

# ADR-025 — Objetivo Permanente

Este projeto possui prioridade em:

Estabilidade.

Segurança.

Escalabilidade.

Baixo acoplamento.

Alta coesão.

Reutilização.

Toda decisão arquitetural futura deverá respeitar estes princípios.

---

# ADR-026 — Identidade, Recuperação de Senha e Revogação

## Aprovação e escopo

Aprovada pelo responsável em 2026-09-26, na V3.6.1. Complementa as ADR-008, ADR-009, ADR-017 e ADR-024; não reescreve suas decisões históricas. Registro documental, sem implementação nesta etapa. Contrato detalhado e subdivisão no [roadmap oficial](docs/ROADMAP_SGE.md#v361--contrato-e-arquitetura).

## Decisão

Canonicalizar e-mail no backend com trim + lowercase, preservando unicidade global. Recuperação usa o endereço persistido e elegível, sem incorporar um sistema completo de alteração/verificação de novo e-mail.

Manter JWT, RBAC, integração Funcionario x Usuario, trocaSenhaObrigatoria e versaoAutorizacao. Na V3.6, preservar senha inicial administrativa na criação comum e no RH, sem substituí-la por convites.

Reset manual de conta existente é exclusivo de SUPER_ADMIN, em comando específico, inclusive quando o alvo é outro SUPER_ADMIN; auto-reset administrativo é proibido. Exigir validação backend, política de senha aprovada, hash seguro, trocaSenhaObrigatoria=true, incremento de versaoAutorizacao, invalidação de tokens aplicáveis e auditoria transacional sem segredos.

ADMIN_EMPRESA somente solicita recuperação por e-mail para alvo elegível da própria empresa, nunca SUPER_ADMIN ou usuário externo. O destinatário vem do backend, sem endereço arbitrário enviado pelo administrador. SUPER_ADMIN também pode solicitar recuperação por e-mail. A criação de senha inicial permanece a exceção de compatibilidade acima.

Recuperação pública usa token criptograficamente seguro, finalidade explícita, somente hash persistido, validade inicial de 30 minutos, uso único, consumo atômico, proteção contra replay, resposta genérica e rate limiting. Novo token válido invalida os anteriores não utilizados do mesmo usuário/finalidade. O token bruto é entregue somente ao titular pelo canal de recuperação. A conclusão incrementa versaoAutorizacao e invalida sessões anteriores.

Reset e recuperação não reativam Usuario/Empresa, não alteram Funcionario/situação funcional nem criam/removem vínculos RH implicitamente. Autoalteração continua pelo fluxo próprio de troca de senha.

E-mail terá módulo NestJS próprio com ConfigService, credenciais externas, templates controlados, remetente/base pública configuráveis e links sem confiar em Host arbitrário. Não manter transações críticas abertas durante SMTP. Definir retries na implementação e avaliar outbox na V3.6.2, sem obrigatoriedade antecipada.

Revisar filtro HTTP, sanitizador, DTOs e URLs para impedir senhas, hashes de senha, tokens brutos, hashes de token desnecessários ou credenciais SMTP em logs/auditoria. Evitar tokens em request.url/query logs.

## Motivo e limites

Preservar compatibilidade e isolamento, impedir tomada administrativa indevida de contas e reutilizar a revogação existente. Não criar infraestrutura paralela de sessão. Refresh tokens, tabela de sessões, sessões por dispositivo e logout remoto/por dispositivo ficam fora da V3.6.

---

# ADR-027 — Validade Comercial e Onboarding SaaS

## Aprovação e escopo

Aprovada pelo responsável em 2026-09-26, na V3.6.1. Complementa as ADR-001, ADR-002, ADR-006 e ADR-010, preservando tenant e autoridade backend. Registro documental; modelos físicos e migrations serão tratados nas etapas futuras. Contrato detalhado no [roadmap oficial](docs/ROADMAP_SGE.md#v361--contrato-e-arquitetura).

## Decisão

Separar suspensão administrativa, validade comercial/trial e módulos habilitados. Empresa.ativa mantém sua finalidade administrativa; validade comercial terá representação própria.

Novos cadastros públicos terão trial de 30 dias corridos a partir da conclusão bem-sucedida do onboarding transacional, com início/fim persistidos e comparados em UTC, timezone local somente para apresentação e intervalo [inicio, fim). Se agora >= fim, bloquear operações empresariais protegidas.

O cadastro não será considerado operacionalmente concluído/ativado antes da verificação do e-mail. A conclusão transacional deve provisionar Empresa, ADMIN_EMPRESA inicial, perfil/autorização administrativa, módulos definidos pelo produto e trial, com rollback integral das partes obrigatórias e idempotência. Valores privilegiados, empresa preexistente e duração de trial não podem ser escolhidos pelo solicitante público. Verificação usa token seguro, hash persistido, expiração, uso único e não enumeração, com detalhes refinados na implementação.

Enforcement centralizado no backend deve cobrir inclusive rotas sem EmpresaContextoGuard. Scheduler é apenas auxiliar: atraso/falha não pode liberar acesso. Expiração não apaga dados, não inativa usuários individualmente, não altera RH e não destrói perfis/permissões.

Preservar contexto mínimo de identidade para informação de expiração, recuperação e fluxos permitidos de regularização, com erros distinguíveis no frontend. SUPER_ADMIN global conserva sua capacidade administrativa. A resposta pública de solicitação de recuperação permanece genérica.

Empresas existentes não recebem trial retroativo ou expiração silenciosa; a futura migration preserva acesso e distingue legado/validade não limitada, mantendo suspensões administrativas existentes.

Somente SUPER_ADMIN regulariza/reativa comercialmente na V3.6, em operação explícita autorizada no backend, com nova condição/validade, ator, motivo e auditoria. Considerar revogação de sessões empresariais anteriores quando necessária. Empresa.ativa=true isoladamente não regulariza validade comercial; ADMIN_EMPRESA não estende o próprio trial.

## Motivo e limites

Garantir bloqueio previsível sem misturar acesso administrativo, comercial e funcional. A V3.6.4 estabelece trial/enforcement antes da ativação do onboarding público na V3.6.5. Cobrança automática, gateway e plano comercial completo além da validade inicial ficam fora da V3.6. Nenhuma alteração de código, schema, migration, banco ou produção é realizada pela V3.6.1.

---

# Processo para Alteração de uma Decisão

Caso qualquer implementação exija alterar uma decisão registrada neste documento:

1. Interromper a implementação.

2. Identificar a decisão afetada.

3. Explicar o motivo.

4. Explicar os impactos.

5. Solicitar autorização.

Sem autorização explícita a decisão permanece válida.

---

# Atualização deste Documento

Este documento deverá crescer junto com o projeto.

Novas decisões deverão ser adicionadas.

Decisões antigas nunca deverão ser removidas.

Caso deixem de ser utilizadas, deverão ser marcadas como:

**Obsoleta**

informando:

- motivo;

- data;

- decisão substituta.

Isso preserva o histórico arquitetural do projeto.