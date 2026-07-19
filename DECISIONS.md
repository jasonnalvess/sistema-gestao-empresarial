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