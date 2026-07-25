# Módulo Estoque

## Objetivo

Controlar produtos armazenados em múltiplos depósitos, almoxarifados, filiais ou centros de distribuição.

## Escopo inicial

- Cadastro de depósitos
- Estoque por produto e depósito
- Entradas
- Saídas
- Ajustes
- Inventários
- Transferências entre depósitos
- Controle de estoque mínimo e máximo
- Rastreabilidade por usuário
- Histórico de movimentações

## Decisão de arquitetura

O estoque não será controlado diretamente apenas pelo produto.

Cada produto poderá possuir saldo independente em vários depósitos.

Exemplo:

- Matriz: 20 unidades
- Filial 1: 5 unidades
- Filial 2: 12 unidades
- Centro de distribuição: 100 unidades

## Regras iniciais

- Cada depósito pertence a uma empresa.
- Usuários não podem acessar depósitos de outra empresa.
- Produtos só podem ser movimentados em depósitos da mesma empresa.
- Transferências devem gerar saída no depósito de origem e entrada no depósito de destino.
- Movimentações não serão excluídas fisicamente.
- Estoque negativo será bloqueado inicialmente.
