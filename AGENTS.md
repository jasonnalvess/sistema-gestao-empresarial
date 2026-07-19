# AGENTS.md

# Sistema de Gestão Empresarial

Versão: 1.0

---

# Missão

Este documento define as regras permanentes para qualquer Inteligência Artificial ou desenvolvedor que participe deste projeto.

O objetivo principal do agente NÃO é escrever código.

O objetivo principal é evoluir o sistema preservando sua arquitetura, estabilidade e segurança.

Sempre que existir conflito entre rapidez e qualidade, a qualidade deve prevalecer.

---

# Sobre o Projeto

Este projeto é um ERP SaaS Multiempresa (Multi-Tenant).

A plataforma deverá permitir que milhares de empresas utilizem o mesmo sistema mantendo isolamento absoluto entre seus dados.

O sistema deverá crescer continuamente através da criação de novos módulos sem necessidade de reescrever funcionalidades existentes.

A arquitetura foi planejada para ser modular, escalável e reutilizável.

---

# Stack Oficial

## Backend

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT

## Frontend

- Next.js
- React
- TypeScript
- TailwindCSS

## Banco

- PostgreSQL

---

# Princípios Permanentes

## 1. Nunca quebrar funcionalidades existentes

Se uma alteração puder afetar funcionalidades já implementadas, interrompa a implementação e solicite confirmação.

---

## 2. Nunca assumir comportamento

Sempre verificar.

Nunca deduzir.

Nunca "achar que funciona assim".

Caso exista dúvida, investigar antes.

---

## 3. Menor alteração possível

Resolver problemas alterando o menor número possível de arquivos.

Evitar refatorações grandes quando uma alteração pequena resolve a tarefa.

---

## 4. Preservação da Arquitetura

Nunca alterar a arquitetura do sistema sem autorização.

Isso inclui:

- organização dos módulos;
- estrutura das APIs;
- autenticação;
- autorização;
- banco de dados;
- estrutura Multiempresa.

---

## 5. Reutilização

Antes de criar qualquer:

- componente;
- service;
- hook;
- helper;
- utilitário;
- provider;
- guard;
- middleware;

pesquisar se já existe implementação equivalente.

Duplicação de código deve ser evitada.

---

# Fluxo Obrigatório Antes de Implementar

Toda implementação deve seguir obrigatoriamente esta sequência.

## Etapa 1

Ler completamente a solicitação.

---

## Etapa 2

Identificar exatamente o escopo.

O que faz parte?

O que NÃO faz parte?

---

## Etapa 3

Localizar os arquivos envolvidos.

---

## Etapa 4

Pesquisar implementações semelhantes.

---

## Etapa 5

Entender o fluxo atual.

Nunca modificar código sem compreender como ele funciona.

---

## Etapa 6

Somente agora iniciar alterações.

---

# Controle de Escopo

Modificar apenas arquivos necessários.

Nunca aproveitar uma tarefa para:

- reorganizar código;
- mover arquivos;
- renomear módulos;
- alterar padrões;
- fazer refatorações não solicitadas.

---

# Arquivos Críticos

Alterações nestes arquivos exigem atenção especial.

## Backend

- auth.module
- auth.service
- jwt.strategy
- guards
- prisma.service
- prisma.module
- tenant middleware
- interceptors globais
- filtros globais

## Frontend

- Layout
- Sidebar
- Header
- Providers
- Contexts
- Menu
- Rotas principais

## Banco

- schema.prisma
- migrations
- configurações PostgreSQL

---

# Multiempresa

Esta é a decisão arquitetural mais importante do projeto.

Nunca implementar qualquer funcionalidade que possa permitir vazamento de dados entre empresas.

Toda consulta deve respeitar a empresa autenticada.

Todo usuário pertence a uma empresa.

Todo dado pertence a uma empresa.

Nunca remover filtros de Tenant.

Nunca ignorar contexto da empresa.

---

# Segurança

Toda segurança deve ser validada no Backend.

Nunca confiar em dados enviados pelo Frontend.

Nunca confiar em menus ocultos.

Nunca confiar em validações JavaScript.

---

# Permissões

Toda ação deve respeitar permissões.

Nunca remover verificações de autorização.

Nunca conceder permissões automaticamente.

Nunca utilizar perfil do Frontend como única fonte de autorização.

---

# Banco de Dados

Toda alteração estrutural deve utilizar migrations.

Nunca modificar tabelas diretamente em produção.

Nunca remover colunas sem autorização.

Nunca remover tabelas sem autorização.

Nunca alterar relacionamentos sem autorização.

---

# APIs

Antes de alterar uma API verificar:

- Frontend utiliza?

- Outro módulo utiliza?

- Existe documentação?

- Existe integração futura planejada?

Mudanças incompatíveis exigem autorização.

---

# Backend

Controllers:

Responsáveis apenas por receber requisições.

Nunca implementar regra de negócio em Controllers.

Services:

Toda regra de negócio deve permanecer nos Services.

DTOs:

Toda entrada deve utilizar DTO.

Nunca receber dados livres.

---

# Frontend

Criar componentes pequenos.

Priorizar reutilização.

Não criar novo componente se já existir equivalente.

Manter padrão visual existente.

Toda nova tela deve ser responsiva.

---

# Git

Antes de qualquer alteração verificar:

- branch atual;
- git status;
- arquivos modificados.

Nunca assumir que a branch correta é develop.

Verificar sempre o objetivo da branch.

---

# Comandos Proibidos

Sem autorização explícita é proibido executar:

git reset --hard

git clean -fd

git push --force

git checkout .

git restore .

DROP DATABASE

DROP SCHEMA

DROP TABLE

TRUNCATE

DELETE sem WHERE

UPDATE sem WHERE

---

# Quando Parar

Interromper imediatamente caso:

- não compreenda a arquitetura;

- exista risco de regressão;

- exista risco de perda de dados;

- exista risco de vazamento entre empresas;

- exista necessidade de alterar autenticação;

- exista necessidade de alterar autorização;

- exista necessidade de alterar schema.prisma;

- exista necessidade de alterar migrations;

- exista necessidade de alterar componentes globais;

- exista necessidade de alterar arquitetura.

Nesses casos solicitar autorização antes de continuar.

---

# Checklist Antes de Concluir

Confirmar:

☐ Apenas arquivos necessários foram alterados.

☐ Nenhuma funcionalidade existente foi removida.

☐ Não houve aumento indevido do escopo.

☐ O sistema continua compatível.

☐ Build executado quando aplicável.

☐ Lint executado quando aplicável.

☐ Não existem arquivos temporários.

☐ Não existem comentários de debug.

☐ Não existem console.log esquecidos.

☐ Não existem TODOs adicionados sem necessidade.

---

# Relatório Obrigatório

Ao finalizar qualquer tarefa informar obrigatoriamente:

## Escopo

Resumo da implementação.

## Arquivos Alterados

Lista completa.

## Arquivos Criados

Quando houver.

## Arquivos Removidos

Quando houver.

## Validações

- Build

- Lint

- Testes

- Revisão

## Riscos

Caso existam.

## Pendências

Caso existam.

## Próximos Passos

Quando aplicável.

---

# Objetivo Permanente

O agente deve agir como um engenheiro de software responsável pela manutenção de um ERP em produção.

O sucesso da implementação não é medido pela quantidade de código produzido.

O sucesso é medido por:

- estabilidade;
- previsibilidade;
- segurança;
- simplicidade;
- reutilização;
- facilidade de manutenção.

Sempre preservar a arquitetura.

Sempre preservar funcionalidades.

Sempre proteger os dados dos clientes.

Sempre preferir mudanças pequenas, seguras e bem compreendidas.

Este documento deverá evoluir junto com o projeto.