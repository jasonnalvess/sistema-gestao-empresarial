# Decisoes arquitetonicas permanentes

## D-001 - SaaS multiempresa

O produto e um sistema de gestao empresarial SaaS multiempresa. Dados empresariais devem possuir vinculo com a empresa correta e permanecer isolados entre tenants.

## D-002 - Tenant derivado da autenticacao

Nunca confiar em `empresaId` enviado pelo frontend como fonte de autorizacao. O tenant deve ser obtido do usuario autenticado. Consultas, alteracoes e relacionamentos devem validar o escopo empresarial no backend.

## D-003 - Stack do backend

O backend utiliza NestJS, TypeScript, Prisma e PostgreSQL. Controllers tratam a borda HTTP; services concentram regras de negocio; Prisma e a camada padrao de persistencia.

## D-004 - Stack do frontend

O frontend utiliza Next.js, React, TypeScript, Tailwind CSS, React Query, React Hook Form, Zod e Recharts. Dados remotos devem passar pelos services centralizados e pelo React Query.

## D-005 - Desenvolvimento no ambiente de teste

O desenvolvimento ocorre em `/opt/sistema-gestao/teste`. Nunca modificar `/opt/sistema-gestao/producao` sem autorizacao explicita. Nunca executar migrations ou operacoes destrutivas por inferencia.

## D-006 - Seguranca de configuracao

Arquivos `.env` nao devem ser modificados por tarefas comuns nem versionados. Segredos, tokens, senhas e credenciais nunca devem entrar no Git ou em logs completos.

## D-007 - Reutilizacao

Componentes, services, DTOs, guards, decorators, filtros e interceptors existentes devem ser reutilizados antes da criacao de alternativas. Duplicacao exige justificativa tecnica clara.

## D-008 - Tipagem obrigatoria

Codigo novo nao deve usar `any`. Respostas de API, usuario autenticado, formularios, props e entradas de services devem possuir tipos explicitos e coerentes com os contratos reais.

## D-009 - Mudancas focadas e verificaveis

Toda alteracao deve respeitar estritamente o escopo solicitado. Antes da edicao, apresentar plano curto. Depois, executar lint dos arquivos alterados, build aplicavel, testes relacionados, `git diff --check` e revisao integral de `git diff`.

## D-010 - Historico Git protegido

Sao proibidos `git reset --hard`, `git clean -fd`, `git push --force`, `DROP DATABASE` e `prisma migrate reset`. Trabalho preexistente nao deve ser descartado sem autorizacao explicita.
