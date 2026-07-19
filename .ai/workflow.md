# WORKFLOW.md

# Fluxo Oficial de Desenvolvimento

Versão: 1.0

---

# Objetivo

Este documento define o fluxo obrigatório que deve ser seguido por qualquer agente de IA ou desenvolvedor durante a implementação de uma tarefa.

Seu objetivo é garantir que toda alteração seja previsível, segura e compatível com a arquitetura do Sistema de Gestão Empresarial.

Nenhuma etapa deve ser ignorada.

---

# Fluxo Geral

Receber tarefa

↓

Entender problema

↓

Definir escopo

↓

Ler código existente

↓

Pesquisar implementações semelhantes

↓

Planejar implementação

↓

Implementar

↓

Validar

↓

Revisar

↓

Entregar

---

# ETAPA 1 — Compreensão

Antes de escrever qualquer linha de código responder:

- Qual problema precisa ser resolvido?

- Qual comportamento esperado?

- Existe documentação?

- Existe implementação semelhante?

- Existe histórico dessa funcionalidade?

Caso exista dúvida relevante:

Parar.

Solicitar esclarecimentos.

---

# ETAPA 2 — Escopo

Identificar exatamente:

O que deve ser alterado.

O que NÃO deve ser alterado.

O agente nunca deve ampliar o escopo.

Exemplo:

Solicitação:

Corrigir Header.

Escopo permitido:

Header.

Escopo proibido:

Sidebar

Layout

Menu

Providers

Rotas

---

# ETAPA 3 — Investigação

Antes de implementar identificar:

Arquivos envolvidos.

Dependências.

Componentes compartilhados.

Services utilizados.

Permissões.

Integrações.

Fluxo atual.

Nunca implementar sem compreender o funcionamento existente.

---

# ETAPA 4 — Pesquisa

Antes de criar qualquer novo código verificar:

Existe componente semelhante?

Existe Service semelhante?

Existe Hook semelhante?

Existe Utilitário semelhante?

Existe Helper semelhante?

Existe padrão semelhante?

Caso exista:

Reutilizar.

---

# ETAPA 5 — Planejamento

Antes de modificar arquivos definir:

Arquivos que serão alterados.

Arquivos que NÃO serão alterados.

Possíveis impactos.

Estratégia de implementação.

Somente após esse planejamento iniciar alterações.

---

# ETAPA 6 — Implementação

Durante a implementação:

Modificar apenas arquivos necessários.

Evitar refatorações.

Evitar reorganização de código.

Evitar mudanças de estilo.

Evitar alterações automáticas em massa.

Nunca alterar arquitetura sem autorização.

---

# ETAPA 7 — Regras Durante a Implementação

Sempre:

✔ preservar funcionalidades.

✔ reutilizar código.

✔ seguir padrão existente.

✔ manter compatibilidade.

Nunca:

✘ alterar APIs sem necessidade.

✘ alterar banco sem autorização.

✘ alterar autenticação.

✘ alterar autorização.

✘ alterar Multiempresa.

✘ remover código aparentemente sem uso.

---

# ETAPA 8 — Banco de Dados

Antes de alterar:

schema.prisma

migrations

índices

relacionamentos

FK

PK

interromper implementação caso não exista autorização explícita.

---

# ETAPA 9 — Componentes Compartilhados

Caso seja necessário alterar:

Layout

Sidebar

Header

Providers

Contexts

Hooks

Tabela padrão

Menu

Modais

identificar todos os módulos impactados.

Caso exista risco de regressão:

interromper.

---

# ETAPA 10 — APIs

Antes de alterar endpoint verificar:

Frontend utiliza?

Outro módulo utiliza?

Existe contrato?

Existe documentação?

Existe integração futura?

Mudanças incompatíveis exigem autorização.

---

# ETAPA 11 — Validação

Antes de concluir executar quando aplicável:

Lint.

Build.

Testes.

Validação manual.

Revisão do Diff.

Nunca considerar implementação concluída sem validação.

---

# ETAPA 12 — Revisão

Revisar:

Escopo.

Arquivos alterados.

Código duplicado.

Comentários temporários.

Console.log.

TODO.

Código morto.

Imports não utilizados.

Arquivos temporários.

---

# ETAPA 13 — Git

Antes de finalizar verificar:

git status

git diff

branch atual

arquivos modificados

Nunca realizar commits contendo alterações não relacionadas à tarefa.

---

# ETAPA 14 — Entrega

Toda entrega deve conter:

Resumo.

Arquivos alterados.

Arquivos criados.

Arquivos removidos.

Validações realizadas.

Riscos.

Pendências.

Próximos passos.

---

# Situações que Exigem Parada Imediata

Interromper implementação quando:

não compreender o comportamento.

existir risco de perda de dados.

existir risco de vazamento entre empresas.

existir necessidade de alterar autenticação.

existir necessidade de alterar autorização.

existir necessidade de alterar schema.prisma.

existir necessidade de alterar migrations.

existir necessidade de alterar arquitetura.

existir conflito entre documentação e código.

Nesses casos solicitar autorização.

---

# Situações que Exigem Atenção

Alterações em:

Layout.

Header.

Sidebar.

Providers.

Contexts.

Hooks globais.

Prisma.

JWT.

Guards.

Middlewares.

Interceptors.

Tenant.

RBAC.

Esses componentes são considerados críticos.

---

# Critérios de Qualidade

Uma implementação somente é considerada concluída quando:

✔ resolve o problema.

✔ mantém compatibilidade.

✔ não gera regressões conhecidas.

✔ respeita arquitetura.

✔ respeita Multiempresa.

✔ respeita autenticação.

✔ respeita autorização.

✔ respeita escopo.

✔ possui código limpo.

---

# Definição de Concluído (Definition of Done)

Uma tarefa somente pode ser considerada concluída quando:

Todo comportamento esperado foi implementado.

Nenhuma funcionalidade existente foi removida.

Todos os testes aplicáveis passaram.

Nenhuma alteração crítica foi realizada sem autorização.

O código segue o padrão do projeto.

Não existem arquivos temporários.

Não existem logs de depuração.

Não existem comentários desnecessários.

O Diff está coerente com o escopo.

---

# Filosofia Final

Este projeto representa um ERP de longo prazo.

Toda implementação deve facilitar futuras expansões.

O objetivo nunca é produzir a maior quantidade possível de código.

O objetivo é produzir a melhor implementação possível com o menor impacto possível.

Sempre preservar.

Sempre validar.

Sempre confirmar.

Nunca assumir.

Nunca adivinhar.

Quando houver dúvida:

Parar.

Investigar.

Solicitar autorização.

Depois implementar.