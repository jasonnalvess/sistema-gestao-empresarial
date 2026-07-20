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

## Caixa

- cada caixa pertence a uma empresa e todas as aberturas, movimentacoes e historicos usam a empresa do proprio caixa;
- um caixa pode possuir no maximo uma abertura ativa, garantida por transicao condicional, bloqueio da linha do caixa e indice unico parcial no PostgreSQL;
- abertura, movimentacao, fechamento e historico correspondente sao persistidos na mesma transacao;
- entradas usam incremento atomico e saidas usam decremento condicional a saldo suficiente;
- o bloqueio da linha do caixa serializa abertura, movimentacao e fechamento concorrentes, preservando a ordem efetiva de saldo anterior e saldo posterior;
- o fechamento conquista condicionalmente a abertura ativa e impede novas movimentacoes depois de concluido;
- movimentos originados de pagamentos e recebimentos permanecem unicos pelos respectivos identificadores;
- conflitos de unicidade sao tratados conforme a constraint afetada e erros inesperados sao propagados;
- movimentos financeiros sao imutaveis; nao existe regra de negocio aprovada para estorno manual e, portanto, nenhum endpoint de exclusao ou estorno e inferido.

## Contas a pagar

- cada pedido de compra totalmente recebido pode gerar exatamente uma conta a pagar, sem parcelamento automatico nessa origem;
- a unicidade por pedido de compra e garantida no banco, mantendo contas manuais com pedido nulo permitidas;
- pagamentos parciais mantem a conta parcialmente paga e pagamentos integrais zeram o saldo e marcam a conta como paga;
- juros e multa aumentam o saldo ajustado; desconto reduz o saldo; o pagamento nunca pode superar esse saldo;
- todos os valores monetarios aceitam no maximo duas casas decimais, tanto nas entradas da API quanto em valores internos originados de Pedido de Compra;
- nao existe arredondamento silencioso: valores com precisao superior a centavos sao rejeitados;
- calculos financeiros criticos utilizam Decimal e uma conta e quitada somente quando o saldo calculado e exatamente zero, sem tolerancia de meio centavo;
- pagamento e cancelamento bloqueiam a mesma linha da conta, de modo que somente uma operacao concorrente pode vencer;
- pagamento, atualizacao da conta, saida do Caixa e historicos confirmam ou revertem na mesma transacao;
- Contas a Pagar nao altera diretamente o saldo do Caixa; utiliza a operacao financeira do Caixa com o mesmo transaction client;
- uma movimentacao de Caixa e unica por pagamento e conflitos de idempotencia sao tratados pela constraint correspondente;
- contas com pagamentos permanecem impedidas de cancelamento;
- pagamentos sao imutaveis e nao existe regra aprovada de estorno; o estorno financeiro permanece pendente de definicao funcional.
