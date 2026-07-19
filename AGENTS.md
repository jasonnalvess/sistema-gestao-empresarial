# AGENTS.md - Sistema de Gestao Empresarial

## Objetivo

Este arquivo e o ponto de entrada para agentes de desenvolvimento que atuam neste repositorio. O projeto e um sistema de gestao empresarial SaaS multiempresa. A prioridade e evoluir a primeira versao operacional sem ampliar o escopo solicitado.

O ambiente de desenvolvimento autorizado fica em:

```text
/opt/sistema-gestao/teste
```

Nunca altere `/opt/sistema-gestao/producao` sem autorizacao explicita.

## Leitura obrigatoria

Antes de modificar qualquer arquivo, leia:

1. `AGENTS.md`;
2. `.ai/architecture.md`;
3. `.ai/business-rules.md`;
4. `.ai/workflow.md`;
5. `.ai/roadmap.md`;
6. `DECISIONS.md`;
7. instrucoes `AGENTS.md` adicionais existentes na arvore do modulo afetado.

Analise tambem os arquivos relacionados a tarefa, os modulos semelhantes, os scripts do `package.json` correspondente e o estado atual do Git.

## Regras criticas

- O backend usa NestJS, Prisma e PostgreSQL.
- O frontend usa Next.js, React, TypeScript, Tailwind CSS, React Query, React Hook Form, Zod e Recharts.
- Nunca confie em `empresaId` recebido pelo frontend.
- Obtenha o tenant a partir do usuario autenticado.
- Toda consulta, alteracao e relacionamento empresarial deve respeitar o isolamento por empresa.
- Controllers devem coordenar HTTP, validacao e autorizacao; nao devem conter regras de negocio complexas.
- A logica de negocio deve permanecer nos services.
- Nao use `any` em codigo novo.
- Nunca modifique arquivos `.env`.
- Nunca inclua segredos, tokens, senhas ou credenciais no Git.
- Preserve guards, decorators, interceptors, contratos e padroes existentes.
- Reutilize componentes antes de criar alternativas duplicadas.
- Respeite estritamente o escopo solicitado.

## Comandos proibidos

Nao execute:

```bash
git reset --hard
git clean -fd
git push --force
prisma migrate reset
DROP DATABASE
```

Tambem nao execute migrations, limpeza de dados, comandos contra producao ou operacoes destrutivas sem autorizacao explicita.

## Processo antes de alterar

1. Confirme que o trabalho esta em `/opt/sistema-gestao/teste`.
2. Execute `git status --short` e preserve alteracoes preexistentes.
3. Examine a estrutura e os arquivos relacionados.
4. Confirme regras multiempresa, permissoes e contratos afetados.
5. Apresente um plano curto antes de modificar arquivos.
6. Edite apenas o necessario para o escopo aprovado.

## Processo depois de alterar

1. Execute lint nos arquivos alterados.
2. Execute o build do projeto afetado quando houver alteracao de codigo.
3. Execute testes relacionados quando houver infraestrutura disponivel.
4. Execute `git diff --check`.
5. Revise integralmente `git diff` antes de finalizar.
6. Execute `git status --short` e informe arquivos criados e alterados.
7. Registre validacoes, falhas preexistentes e pontos ainda a confirmar.

Os comandos disponiveis e suas ressalvas estao em `.ai/workflow.md`.
