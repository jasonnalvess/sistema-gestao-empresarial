# Documentação Técnica — Recuperação de Senha V3.6.2-A

## Visão Geral

Implementação do fluxo de recuperação de senha via e-mail com tokens temporários seguros, rate limiting persistido e integração SMTP.

## Configurações de Ambiente (.env)

As seguintes variáveis devem ser configuradas no ambiente de teste:

### SMTP

- `SMTP_HOST`: Host do servidor de e-mail.
- `SMTP_PORT`: Porta do servidor SMTP.
- `SMTP_SECURE`: `true` para TLS/SSL, `false` caso contrário.
- `SMTP_USER`: Nome de usuário para autenticação SMTP.
- `SMTP_PASS`: Senha para autenticação SMTP.
- `SMTP_FROM`: E-mail do remetente (ex: `suporte@sge.com.br`).

### Frontend

- `FRONTEND_URL`: URL base do frontend (ex: `https://app.sge.com.br`).

## Detalhes Técnicos

### 1. Modelo de Dados

Foram adicionados dois modelos ao `schema.prisma`:

- `PasswordResetToken`: Armazena o hash SHA-256 do token ativo, userId, data de expiração (30 min) e marcação de uso. Também mantém o estado pendente da emissão nos campos `pendingTokenHash`, `pendingExpiresAt`, `pendingRequestId` e `pendingCreatedAt`. Relacionamento 1:1 com Usuario com exclusão em cascata.
- `RateLimit`: Controla o número de requisições por IP e endpoint em janelas de 15 minutos.

### 2. Segurança do Token

- **Geração**: 32 bytes aleatórios convertidos para hexadecimal (256 bits).
- **Armazenamento**: Apenas o hash SHA-256 é persistido.
- **Consumo Atômico**: A validação e a marcação de uso do token ocorrem dentro de uma transação com bloqueio de linha (`FOR UPDATE`), impedindo race conditions.
- **Validação**: Uso único e expiração rigorosa de 30 minutos.
- **Comparação**: O token é validado via hash no banco de dados.

### 3. Rate Limiting

- **Atomicidade**: Implementado via `INSERT ... ON CONFLICT DO UPDATE` utilizando `$executeRaw` para garantir que o incremento seja atômico diretamente no banco de dados, eliminando race conditions.
- **Janela**: 15 minutos.
- **Limite**: 5 solicitações por IP para o endpoint `/auth/esqueci-senha`.
- **Identificação de IP**: Implementada cadeia de confiança. O sistema valida se a requisição provém de uma origem interna confiável (ex: Next.js) antes de aceitar o cabeçalho `cf-connecting-ip`. IPs inválidos ou origens não confiáveis são tratados como IP do socket.

### 4. Auditoria

- **Eventos Registrados**:
  - `SOLICITACAO_RECUPERACAO_SENHA`: Registrado ao emitir token para usuário válido.
  - `REDEFINICAO_SENHA_CONCLUIDA`: Registrado após a alteração efetiva da senha.
- **Segurança**: Nenhum token, hash ou senha é gravado nos logs de auditoria.

### 5. Emissão Segura de Tokens (B16)

- **Estado ativo e pendente na mesma linha**: `tokenHash`/`expiresAt` guardam o token ativo (ambos nulos ou ambos preenchidos) e `pending*` guarda a solicitação em andamento (todos nulos ou todos preenchidos). Constraint CHECK garante `usedAt` apenas com token ativo.
- **Reserva (Tx1)**: bloqueia a linha do `Usuario` com `FOR UPDATE`, grava apenas os campos `pending*` e preserva o token ativo anterior. A pendência vale por **10 minutos** a partir da reserva.
- **Envio SMTP**: ocorre fora de qualquer transação PostgreSQL. O token bruto existe apenas em memória e no e-mail; o banco recebe somente SHA-256.
- **Promoção (Tx2)**: após sucesso SMTP, bloqueia novamente o usuário e a linha do token, confirma que `pendingRequestId` ainda é o da solicitação, rejeita pendência expirada e só então promove o hash pendente. A validade do token ativo é recalculada em **30 minutos a partir da promoção**, com `usedAt = NULL` e limpeza dos campos pendentes.
- **Cancelamento (Tx3)**: em falha SMTP explícita ou timeout, limpa somente a própria pendência (`pendingRequestId` correspondente). O token ativo anterior permanece válido e uma falha antiga não apaga a pendência de uma solicitação mais recente.
- **Promoção condicional**: solicitações superadas, expiradas ou canceladas não promovem e não alteram o token ativo.
- **Limitação sem outbox**: não há atomicidade distribuída entre SMTP e PostgreSQL. Se o processo cair após o aceite SMTP e antes da promoção, a pendência permanece até expirar ou ser substituída e o link recebido pode não ser promovido. O aceite SMTP não garante entrega na caixa postal.
- **Migration pendente**: a migration aditiva `20261108000000_b16_pending_password_reset_token` foi criada, mas não aplicada. A funcionalidade não está homologada em runtime até a aplicação autorizada das migrations pendentes.

### 6. Concorrência e Ordem Canônica de Locks (Fase 3D-D)

- **Ordem canônica**: todas as transações de recuperação adquirem primeiro o lock da linha de `Usuario` (`SELECT ... FOR UPDATE`) e somente depois o lock da linha de `PasswordResetToken` do mesmo usuário. A ordem `Usuario -> PasswordResetToken` vale para reserva, promoção, cancelamento e redefinição, eliminando a inversão que permitia deadlock entre emissão e consumo.
- **Leitura-dica sem lock**: antes de abrir a transação, `redefinirSenha` calcula o SHA-256 do token recebido e faz uma consulta sem lock apenas para descobrir o `userId`. Essa consulta não autoriza o consumo e um token inexistente é rejeitado sem abrir transação.
- **Revalidação sob lock**: dentro da transação, após os dois locks, a linha do token é relida e o método exige novamente: registro existente, `userId` igual ao da dica, hash atual igual ao recebido, `usedAt` nulo, `expiresAt` preenchido e futuro, usuário existente e ativo. Se uma promoção trocar o hash ou o registro desaparecer entre a dica e o lock, a redefinição falha sem alterações.
- **Consumo e limpeza atômicos**: o mesmo `UPDATE` que preenche `usedAt` também limpa `pendingTokenHash`, `pendingExpiresAt`, `pendingRequestId` e `pendingCreatedAt`. Com isso, uma solicitação reservada antes da troca de senha não pode ser promovida depois e reativar um token.
- **Retry limitado**: as quatro operações transacionais usam no máximo três tentativas. Apenas `P2034`, `P2010` com `meta.code = 40001` e `P2010` com `meta.code = 40P01` são considerados conflitos retentáveis; o esgotamento gera `ConflictException('Alteração concorrente. Tente novamente.')`. Erros de validação, autorização e negócio não são convertidos.
- **SMTP fora da transação**: a reserva acontece antes do envio; o SMTP é chamado uma única vez, fora das transações e fora do retry; promoção e cancelamento têm retry próprio sem reenviar e-mail.
- **Diagnóstico sem segredos**: falhas de envio, promoção, cancelamento e auditoria deixam de ser silenciosas e são registradas apenas com códigos técnicos (`P2034`, `P2010/40P01`, nome da exceção). Tokens, hashes, senhas, e-mails e credenciais não vão para os logs.
- **Limitação de homologação**: os testes unitários usam banco fake e não comprovam ausência de deadlock real no PostgreSQL. A validação de concorrência depende da aplicação autorizada das migrations pendentes e de testes reais em ambiente de homologação; a V3.6.2 não está homologada.

## Procedimento de Homologação (Próxima Etapa)

1. Aplicar, em etapa autorizada, as migrations pendentes `20261105000000_add_rate_limit_unique` e `20261108000000_b16_pending_password_reset_token`.
2. Configurar as variáveis de ambiente SMTP.
3. Testar o fluxo: `Esqueci Senha` -> `E-mail` -> `Link` -> `Redefinir Senha`.
4. Validar o bloqueio por rate limit após 5 tentativas.
5. Verificar a invalidação do token após o primeiro uso.
