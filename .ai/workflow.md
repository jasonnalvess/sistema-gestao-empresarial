# Workflow de desenvolvimento

## 1. Branch e ambiente

1. Trabalhe somente em `/opt/sistema-gestao/teste`.
2. Nunca altere `/opt/sistema-gestao/producao` sem autorizacao explicita.
3. Consulte a branch atual e `git status --short`.
4. Preserve alteracoes preexistentes do usuario.
5. Crie ou troque de branch apenas quando solicitado ou quando a politica do repositorio exigir.

## 2. Analise

1. Leia os documentos indicados em `AGENTS.md`.
2. Localize arquivos, contratos, DTOs, services, testes e componentes relacionados.
3. Compare modulos semelhantes antes de propor um novo padrao.
4. Verifique autenticacao, permissoes e isolamento multiempresa.
5. Identifique se a tarefa exige banco ou migration; nao presuma que exige.

## 3. Plano

Antes de modificar arquivos, apresente um plano curto com:

- arquivos ou areas afetadas;
- comportamento a preservar;
- validacoes previstas;
- riscos ou pontos a confirmar.

## 4. Implementacao

- Respeite estritamente o escopo solicitado.
- Faca alteracoes pequenas e revisaveis.
- Mantenha regras de negocio nos services.
- Mantenha controllers simples.
- Nao use `any` em codigo novo.
- Reutilize componentes e services existentes.
- Nao altere `.env`, producao ou Prisma fora de uma tarefa explicita.

## 5. Lint

Backend:

```bash
cd /opt/sistema-gestao/teste/backend
npx eslint caminho/do/arquivo-alterado.ts
```

O script `npm run lint` do backend usa `--fix` e pode alterar muitos arquivos. Execute-o apenas quando apropriado ao escopo e revise todas as mudancas produzidas.

Frontend:

```bash
cd /opt/sistema-gestao/teste/frontend
npx eslint caminho/do/arquivo-alterado.tsx
```

O lint completo do frontend e:

```bash
npm run lint
```

## 6. Build

Backend:

```bash
cd /opt/sistema-gestao/teste/backend
npm run build
```

Frontend:

```bash
cd /opt/sistema-gestao/teste/frontend
npm run build
```

Para alteracoes apenas documentais, registre que build nao se aplica.

## 7. Testes

Backend:

```bash
cd /opt/sistema-gestao/teste/backend
npm test
npm run test:e2e
```

Tambem existem `npm run test:watch` e `npm run test:cov`. O frontend nao possui script de testes no `package.json` atual.

Execute testes proporcionais ao risco e ao modulo alterado. Nunca use banco de producao ou apague dados para fazer testes passarem.

## 8. Revisao Git

Sempre execute:

```bash
git diff --check
git diff
git status --short
```

Confira que apenas arquivos do escopo foram alterados e que nenhum segredo, `.env`, artefato de build ou backup entrou no diff.

## 9. Commit

- Nao faca commit sem solicitacao quando a tarefa proibir ou nao exigir commit.
- Quando solicitado, use mensagem objetiva e inclua somente arquivos do escopo.
- Nunca execute `push --force`.
- Nunca reescreva ou descarte trabalho preexistente sem autorizacao.
