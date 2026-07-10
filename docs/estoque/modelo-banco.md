# Modelo de Banco - Estoque

## Deposito

Representa um local físico de armazenamento.

Campos planejados:

- id
- nome
- codigo
- descricao
- endereco
- ativo
- empresaId
- createdAt
- updatedAt

## EstoqueProduto

Representa o saldo de um produto em um depósito específico.

Campos:

- produtoId
- depositoId
- empresaId
- quantidadeAtual
- estoqueMinimo
- estoqueMaximo
- custoMedio
- ultimoCusto

## MovimentacaoEstoque

Representa toda alteração de saldo.

Tipos iniciais:

- ENTRADA
- SAIDA
- AJUSTE
- INVENTARIO
- TRANSFERENCIA_ENTRADA
- TRANSFERENCIA_SAIDA

Campos previstos:

- produtoId
- depositoId
- quantidade
- saldoAnterior
- saldoPosterior
- custoUnitario
- observacao
- documentoReferencia
- usuarioId
- createdAt

## TransferenciaEstoque

Representa uma transferência entre depósitos.

Campos previstos:

- depositoOrigemId
- depositoDestinoId
- produtoId
- quantidade
- usuarioId
- observacao
- createdAt
