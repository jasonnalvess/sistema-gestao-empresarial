# Regras de negocio

## Multiempresa

- O sistema e SaaS multiempresa.
- Nunca confiar em `empresaId` recebido pelo frontend.
- O tenant deve ser obtido do usuario autenticado, token ou contexto validado pelo backend.
- Toda consulta de entidade empresarial deve filtrar pela empresa autorizada.
- Busca, atualizacao e exclusao por ID devem validar simultaneamente registro e empresa.
- Relacionamentos, como produto, cliente, estoque ou documento financeiro, devem pertencer a mesma empresa.
- O acesso global de `SUPER_ADMIN` so e permitido quando a regra e a rota o autorizarem explicitamente.

O isolamento e aplicado hoje nos services por meio de `empresaId` e validacoes de propriedade. Nao foi identificada uma politica de Row-Level Security no banco; portanto, omitir um filtro no service e um risco de seguranca.

## Perfis e permissoes

Perfis conhecidos fornecidos para o dominio:

- `SUPER_ADMIN`;
- `ADMIN_SISTEMA`;
- `ADMIN_EMPRESA`;
- `SUPERVISOR`;
- `RH`;
- `COLABORADOR`.

No schema Prisma ativo examinado, o enum de usuarios nao materializa toda essa lista. A correspondencia entre perfis de dominio, enum persistido e guards esta **a confirmar**. Ate essa confirmacao:

- nao renomear ou criar perfis por suposicao;
- nao alterar permissoes existentes;
- nao confiar apenas na ocultacao de elementos no frontend;
- manter autorizacao efetiva no backend.

## Vendas

Fluxo implementado:

```text
RASCUNHO
  -> PENDENTE
  -> APROVADA
  -> FATURADA
  -> CONCLUIDA
```

Uma venda pode ser concluida automaticamente quando todas as contas a receber vinculadas estiverem integralmente quitadas.

Garantias permanentes dos fluxos de faturamento e cancelamento:

- faturamento e cancelamento executam seus efeitos dependentes em uma unica transacao Prisma;
- as transicoes `APROVADA -> FATURADA` e de status cancelavel para `CANCELADA` sao condicionais e atomicas;
- somente a transacao vencedora carrega e processa itens, estoque, financeiro e historico;
- a baixa de estoque exige saldo suficiente na mesma operacao que aplica `decrement`;
- a devolucao de estoque usa `increment` atomico depois da transicao para `CANCELADA`;
- falhas em estoque, movimentacoes, contas ou historico causam rollback integral;
- estoque, movimentacoes e contas sempre utilizam a empresa da propria venda;
- parcelas geradas por venda sao unicas por `vendaId` e `parcelaAtual`;
- contas manuais ou de outras origens continuam permitidas quando `vendaId` for nulo.

## Estoque

O codigo ativo possui produtos, categorias, estoque e movimentacoes de estoque. O schema associa registros empresariais a `empresaId`.

Regras confirmadas pelo desenho atual:

- produto e estoque devem pertencer a empresa autenticada;
- movimentacoes precisam respeitar o tenant;
- saldos nao devem ser manipulados por dados de outra empresa;
- operacoes dependentes devem preservar consistencia entre produto, estoque e movimentacao.

Regras detalhadas de inventario, transferencia, reserva, estoque negativo e custo medio estao **a confirmar** antes de qualquer implementacao.

## Financeiro

Ha um diretorio de `contas-receber` no worktree, mas ele nao esta registrado no `AppModule` atual. Modulos completos de financeiro, contas a pagar e caixas nao foram confirmados nesta arvore ativa.

Regras confirmadas para futuras alteracoes financeiras:

- documentos financeiros empresariais devem respeitar o tenant autenticado;
- recebimentos relacionados a vendas devem referenciar recursos da mesma empresa;
- operacoes com multiplos recursos dependentes devem ser transacionais.

Parcelamento, juros, descontos, estornos, conciliacao, caixa e regras de vencimento estao **a confirmar**. Nao inferir comportamento financeiro apenas pelo nome de um arquivo ou diretorio.
