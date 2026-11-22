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

## Complemento — geração e entrega de credencial temporária no reset manual

**Data de aprovação:** 10/11/2026.

Este complemento integra a ADR-026 sem alterar seu texto histórico. Registra o mecanismo aprovado para geração e entrega da senha temporária no reset manual de conta existente.

### Autorização

- O reset manual é exclusivo de SUPER_ADMIN ativo.
- É proibido executar reset da própria conta.
- O administrador não escolhe a senha do usuário.
- A operação permanece separada da recuperação de senha por e-mail da V3.6.2.

### Geração e armazenamento

- O backend gera uma senha temporária criptograficamente aleatória, obedecendo à política de senha vigente.
- Somente o hash seguro é persistido.
- A senha em texto puro não é gravada em banco, logs ou auditoria.

### Exposição e transporte

- A senha temporária é exibida uma única vez na resposta ao SUPER_ADMIN autenticado.
- A transmissão ocorre exclusivamente por HTTPS.
- A resposta utiliza `Cache-Control: no-store`.
- A senha não pode ser persistida no frontend nem aparecer em logs, auditoria, cookies ou armazenamento local.
- O SUPER_ADMIN entrega a senha ao usuário por canal seguro externo.
- Não enviar a senha temporária por e-mail.

### Primeiro acesso e revogação

- No primeiro acesso, `trocaSenhaObrigatoria=true` força o usuário a definir sua senha definitiva.
- Incrementar `versaoAutorizacao`.
- Invalidar os tokens de recuperação aplicáveis.

### Atomicidade e auditoria

- Atualização da senha, flags, versão, invalidação dos tokens e auditoria devem ocorrer na mesma transação.
- Falha na entrega da resposta não permite recuperar a senha original.
- Uma nova operação deverá gerar outra credencial e registrar nova auditoria.

## Complemento — concorrência otimista no reset manual

**Data de aprovação:** 10/11/2026. **Escopo:** V3.6.3, `POST /usuarios/:id/redefinir-senha-manual`.

Este complemento integra a ADR-026 sem alterar seu texto histórico.

### Decisão

A solicitação passa a exigir a versão de autorização do usuário-alvo (`versaoAutorizacao`), validada dentro da transação após o lock do alvo e antes de qualquer escrita. A ordem de locks `ator → alvo`, o isolamento Serializable e o retry já existentes são preservados.

Divergência entre a versão enviada e a versão persistida — menor ou maior — retorna HTTP 409 com código `RESET_CONCORRENTE` e mensagem que solicita recarregar os dados e confirmar novamente. O corpo do 409 não contém versão atual, senha temporária nem detalhes sensíveis.

O sucesso devolve a nova `versaoAutorizacao` obtida do retorno do próprio `update`, junto da credencial temporária de exposição única. A versão do alvo é exposta somente na consulta de detalhe autorizada, nunca na listagem.

### Motivo

Impedir que um reset baseado em versão obsoleta invalide silenciosamente uma credencial temporária já entregue ao administrador. A conferência sob lock elimina a janela de corrida.

### Limites

- Não substitui idempotency key: operações sequenciais confirmadas continuam gerando nova credencial e nova auditoria.
- A versão também muda por outros eventos de segurança (recuperação, troca de senha, perfis, desativação, mudança de tipo). O 409 significa que o alvo mudou desde a consulta, não necessariamente que houve outro reset.
- Esgotamento de retry, deadlock ou indisponibilidade do banco não são mapeados para `RESET_CONCORRENTE`; somente a divergência efetivamente comprovada da versão gera esse código. O esgotamento de retry por `P2034` ou `P2010` com SQLSTATE `40001`/`40P01` retorna HTTP 503, e erros Prisma não relacionados são propagados sem conversão.
- Autorização SUPER_ADMIN, proibição de auto-reset, isolamento multiempresa, atomicidade, invalidação de tokens e auditoria transacional permanecem inalterados.
- Geração e hash da senha continuam fora da transação; o hash é descartado sem uso em caso de 409.

### Impacto de contrato

- Corpo obrigatório com `versaoAutorizacao` inteiro entre 0 e 2147483647, sem conversão implícita de string ou decimal; ausência ou valor inválido retorna 400.
- Novo campo `versaoAutorizacao` na resposta de sucesso e novo status 409.
- Consumidores devem recarregar e reconfirmar, sem retry automático.

### Testes obrigatórios

DTO (ausência, nulo, string, decimal, negativo, acima de int32 e campo extra); serviço (versão igual, menor e maior); 409 sem escrita, exclusão de token, auditoria ou senha na resposta; precedência de 401, 403, 404 e 409; retorno da nova versão; controller e E2E com envelope e `no-store`; retry não classificado como 409; concorrência real em PostgreSQL com exatamente um sucesso, pendente de provisionamento de banco isolado.

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

# ADR-028 — Política de Ambientes

## Aprovação e escopo

Aprovada pelo responsável em 2026-11-14. Complementa a ADR-019 (Ambientes) sem revogá-la: a ADR-019 continua válida e passa a ser detalhada por esta decisão. Aplica-se ao repositório TESTE e a todas as etapas futuras do roadmap.

## Decisão

O SGE passa a ter três ambientes formais.

### TESTE — ambiente principal

Diretório: `/opt/sistema-gestao/teste`.

Banco: `sistema_gestao_teste`.

Responsabilidades:

- Desenvolvimento.
- Testes automatizados que não exigem banco isolado.
- Testes funcionais manuais.
- Homologação de cada sprint e módulo.
- Homologação integrada final da versão.

A homologação funcional oficial do SGE acontece em TESTE. Não é necessária uma segunda instalação permanente para homologar cada etapa.

### INTEGRAÇÃO — ambiente técnico

Banco: `sistema_gestao_integracao`.

Responsabilidades:

- Testes automatizados que exigem PostgreSQL real.
- Testes de integração e fixtures isoladas.

Não utilizar para homologação manual.

Não compartilhar dados de homologação funcional com fixtures automatizadas.

Preservar o isolamento de credenciais e permissões entre os bancos.

### PRODUÇÃO — ambiente futuro

Diretório: `/opt/sistema-gestao/producao`.

Banco: `sistema_gestao_prod`.

Responsabilidades:

- Operação definitiva após conclusão do roadmap e autorização expressa.
- Não considerar o banco existente como produção implantada (auditado em 2026-11-14: schema vazio).
- Não implantar funcionalidades automaticamente após homologação em TESTE.

### Estrutura `/opt/sistema-gestao/homologacao` — descontinuação

- A estrutura será descontinuada como ambiente permanente de homologação.
- Nenhum diretório, arquivo, build, symlink, configuração ou dado foi removido na data desta decisão.
- A desativação depende de inventário de preservação aprovado e de autorização expressa em etapa posterior.

## Motivo e limites

Estabelece fonte confiável de controle de versões e ambientes, baseada na auditoria READ ONLY de 2026-11-14 (TESTE ativo; estrutura de homologação montada e parada; produção não implantada).

Esta decisão não autoriza, por si, nenhuma exclusão, migration, sincronização ou deploy.

## Classificação obrigatória de etapas

Todo relatório de sprint, módulo ou versão deverá apresentar separadamente:

1. Estado do código: implementado ou não.
2. Estado do banco TESTE: migrations aplicadas e situação estrutural.
3. Testes automatizados: executados, aprovados ou pendentes.
4. Homologação funcional: realizada ou pendente, identificando o ambiente.
5. Produção: implantada ou não implantada.

Não utilizar simplesmente a expressão "concluído" sem esclarecer essas dimensões.

Homologação em TESTE não significa implantação em PRODUÇÃO.

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

# ADR-029 — Consolidação Git única das entregas V3.6

## Aprovação e escopo

Proposta (aguardando aprovação formal) — 2026-11-21, na D17. Complementa a ADR-028 (Política de Ambientes) e
o processo de encerramento da V3.6, sem revogar decisões anteriores e sem alterar os status
funcionais homologados em TESTE.

## Decisão

As entregas V3.6.3, V3.6.4, V3.6.6-A, V3.6.6, V3.6.5 e V3.6.7 serão publicadas em **um único
commit de consolidação** do estado auditado, e não pela reconstrução artificial de commits
históricos individuais.

O estado consolidado é o conjunto de arquivos não ignorados do working tree em 2026-11-21, cujo
conteúdo é byte-idêntico ao snapshot `r6_v367` (770/770 arquivos), acrescido de três arquivos
transversais de ingresso/proxy (`frontend/src/proxy.ts`, `frontend/src/lib/ip-ingresso.mjs`,
`frontend/test/ip-ingresso.test.mjs`) já compilados no build TESTE.

## Limites

- Artefatos acidentais, backups locais, builds, dependências, credenciais e o stash permanecem
  fora do commit e preservados no disco.
- A publicação exige validação prévia e autorização expressa; esta ADR não autoriza commit,
  push ou deploy.
- A ordem histórica das versões e das migrations (V3.6.4 antes de V3.6.5) permanece registrada.
- A correspondência com TESTE é comprovada por rebuild idêntico do backend e pelas fontes
  embutidas no build do frontend; a integração PostgreSQL e os E2E permanecem gates pendentes.
- Os snapshots r1–r6, os relatórios D14–D17 e o stash são preservados sem sobrescrita.

## Evidências

`relatorios/relatorio_auditoria_consolidacao_unica_d17.md` e os artefatos da D17 em
`inventario/` e `evidencias/`.

---
