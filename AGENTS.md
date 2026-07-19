# AGENTS.md — Sistema de Gestão Empresarial

## 1. Objetivo do projeto

Este repositório contém um Sistema de Gestão Empresarial SaaS multiempresa.

O sistema deve permitir que múltiplas empresas utilizem a mesma aplicação, mantendo isolamento completo entre seus dados.

A prioridade atual é concluir rapidamente a primeira versão operacional do sistema.

Não ampliar o escopo da V1 sem instrução expressa.

---

## 2. Estrutura principal

- `backend/`: API NestJS, Prisma e PostgreSQL.
- `frontend/`: aplicação Next.js, React, TypeScript e Tailwind.
- `backend/prisma/`: schema e migrations do banco.
- `docs/`: documentação técnica e funcional, quando presente.

Antes de implementar qualquer alteração:

1. Leia este arquivo.
2. Analise os arquivos existentes relacionados à tarefa.
3. Identifique os padrões usados em módulos semelhantes.
4. Preserve as decisões arquiteturais existentes.
5. Faça alterações pequenas, focadas e revisáveis.

---

## 3. Tecnologias obrigatórias

### Backend

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- DTOs com validação
- Guards e decorators existentes para autenticação e autorização

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- React Query
- Axios
- React Hook Form
- Zod
- Recharts para gráficos

Não substituir essas tecnologias sem autorização expressa.

---

## 4. Regras multiempresa

O isolamento de dados é uma regra crítica de segurança.

- Toda entidade empresarial deve estar associada à empresa correta.
- Toda consulta deve respeitar a empresa do usuário autenticado.
- Nunca aceitar `empresaId` do frontend como única fonte de confiança.
- Preferir obter a empresa a partir do usuário autenticado, token, sessão ou contexto validado.
- Nunca permitir que um usuário consulte ou altere dados de outra empresa.
- Ao consultar registros por ID, validar simultaneamente o ID do registro e a empresa.
- Operações de atualização e exclusão também devem filtrar pela empresa.
- Relacionamentos entre entidades devem pertencer à mesma empresa.
- O Super Administrador pode possuir acesso global apenas quando a regra existente autorizar explicitamente.

Não remover filtros de empresa para simplificar código ou testes.

---

## 5. Perfis e permissões

Perfis previstos:

- Super Administrador
- Administrador do Sistema
- Administrador da Empresa
- Supervisor
- RH
- Colaborador

Regras gerais:

- Não alterar permissões existentes sem instrução expressa.
- Não permitir escalonamento de privilégios.
- Administradores do sistema devem atuar somente dentro do escopo atribuído.
- Administradores de empresa devem atuar somente nas empresas autorizadas.
- Rotas protegidas devem continuar usando guards e decorators.
- Ocultar elementos no frontend não substitui validação no backend.

---

## 6. Regras de backend

- Seguir o padrão existente de módulos, controllers, services e DTOs.
- Não criar rotas duplicadas.
- Não alterar contratos existentes sem necessidade.
- Não remover validações existentes.
- Não usar `any`.
- Não usar consultas SQL diretas quando o Prisma atender à necessidade.
- Utilizar transações para operações que alterem múltiplos recursos dependentes.
- Tratar erros com exceções apropriadas do NestJS.
- Evitar services excessivamente grandes.
- Separar consulta, workflow, financeiro e dashboard quando isso reduzir complexidade.
- Manter compatibilidade com o schema Prisma atual.
- Não criar migration destrutiva sem destacar claramente o risco.
- Nunca executar reset, drop ou limpeza de banco automaticamente.

Ao criar ou alterar endpoints:

1. Atualize DTOs.
2. Valide autorização.
3. Valide empresa.
4. Implemente regra de negócio.
5. Trate erros.
6. Adicione ou atualize testes quando houver infraestrutura para isso.
7. Documente mudanças relevantes.

---

## 7. Regras de frontend

- Usar componentes compartilhados existentes antes de criar novos.
- Não duplicar cards, tabelas, filtros, diálogos ou gráficos.
- Não usar `any`.
- Definir tipos para respostas da API.
- Usar React Query para dados remotos.
- Usar o service centralizado do módulo para chamadas HTTP.
- Manter estados de carregamento, erro e vazio.
- Usar React Hook Form e Zod nos formulários.
- Preservar responsividade.
- Preservar o padrão visual existente.
- Não alterar autenticação, interceptadores ou layout global sem necessidade.
- Não acessar dados de outra empresa por parâmetros manipuláveis.
- Não inserir segredos em variáveis `NEXT_PUBLIC_*`.

Organização compartilhada preferencial:

- `components/dashboard/`
- `components/dashboard/charts/`
- `components/tables/`
- `components/filters/`
- `components/dialogs/`
- `components/forms/`
- `components/feedback/`
- `components/navigation/`
- `components/ui/`

---

## 8. Módulo de vendas

Fluxo atual:

`RASCUNHO -> PENDENTE -> APROVADA -> FATURADA -> CONCLUIDA`

Regras:

- Uma venda pode ser enviada para aprovação.
- Uma venda aprovada pode ser faturada.
- O faturamento pode gerar conta a receber conforme a regra existente.
- A venda pode ser concluída automaticamente quando as contas a receber correspondentes forem recebidas.
- O histórico deve registrar mudanças importantes.
- Não quebrar os endpoints existentes.
- Não alterar o fluxo sem instrução expressa.

Dashboard de vendas existente:

- indicadores
- vendas por status
- informações financeiras
- produtos mais vendidos
- vendas recentes

Componentes de dashboard existentes devem ser reutilizados.

---

## 9. Segurança

Nunca:

- Expor senhas, tokens ou chaves.
- Versionar arquivos `.env`.
- Registrar tokens completos nos logs.
- Desativar autenticação para facilitar testes.
- Remover isolamento multiempresa.
- Usar dados de produção em testes.
- Alterar ou apagar migrations antigas arbitrariamente.
- Executar comandos destrutivos sem autorização.
- Fazer push direto para produção.
- Modificar a pasta de produção ao implementar tarefas de desenvolvimento.

O trabalho deve ocorrer no ambiente de teste.

---

## 10. Banco de dados

Bancos existentes:

- `sistema_gestao_teste`
- `sistema_gestao_prod`

Durante desenvolvimento:

- Usar apenas o banco de teste.
- Nunca conectar ao banco de produção.
- Nunca executar `prisma migrate reset`.
- Nunca executar `DROP DATABASE`.
- Nunca apagar dados existentes para fazer um teste passar.
- Toda migration deve ser revisável e ter nome descritivo.

---

## 11. Qualidade e validação

Antes de concluir uma tarefa:

### Backend

Executar, quando disponível:

```bash
npm run lint
npm run build
npm test
