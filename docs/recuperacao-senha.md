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
- `PasswordResetToken`: Armazena o hash SHA-256 do token, userId, data de expiração (30 min) e marcação de uso. Relacionamento 1:1 com Usuario com exclusão em cascata.
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

## Procedimento de Homologação (Próxima Etapa)
1. Executar a migration: `npx prisma migrate dev --name add_password_reset_token`.
2. Configurar as variáveis de ambiente SMTP.
3. Testar o fluxo: `Esqueci Senha` -> `E-mail` -> `Link` -> `Redefinir Senha`.
4. Validar o bloqueio por rate limit após 5 tentativas.
5. Verificar a invalidação do token após o primeiro uso.
