# Roadmap tecnico

Este documento descreve o estado aproximado observado no codigo. Nao substitui validacao funcional, testes ou decisao de produto.

## Modulos ativos observados

| Area | Evidencia atual | Estado aproximado |
| --- | --- | --- |
| Autenticacao e usuarios | Modulos, controllers, services, guards e testes | Implementado, requer endurecimento continuo |
| Empresas e modulos por empresa | Modulos registrados e schema multiempresa | Implementado |
| Produtos e categorias | Backend, paginas, services e componentes | Implementado |
| Estoque e movimentacoes | Backend, paginas e dashboard relacionado | Implementado |
| Auditoria | Modulo e interceptador global | Implementado |
| Dashboard geral | Modulo backend e componentes frontend | Implementado |
| Agenda | Backend e pagina frontend | Implementado |
| Clientes | Backend, listagem e detalhe frontend | Implementado |
| Ordens de servico | Backend, listagem e detalhe frontend | Implementado |

## Modulos presentes, mas a confirmar

- `inventarios-estoque`: diretorio presente, nao registrado no `AppModule` atual;
- `pedidos-compra`: diretorio presente, nao registrado no `AppModule` atual;
- `contas-receber`: diretorio presente, nao registrado no `AppModule` atual.

Esses diretorios aparecem como arquivos nao rastreados no worktree examinado. Nao considerar sua integracao concluida sem revisao especifica.

## Regras e modulos ainda nao confirmados no codigo ativo

- Vendas e seu fluxo de aprovacao, faturamento e conclusao;
- contas a pagar, caixas e resumo financeiro completo;
- todos os perfis de dominio informados;
- componentes `DashboardCard`, `DashboardGrid`, `DashboardStatusCard`, `ChartContainer`, `BarChartCard` e `PieChartCard`.

## Pendencias prioritarias

1. Melhorar responsividade mobile das telas operacionais.
2. Revisar comportamento e ergonomia do menu lateral em telas pequenas.
3. Reduzir a divida tecnica de ESLint, especialmente usos de `any`, imports sem uso e efeitos React sinalizados pelas regras atuais.
4. Criar ou consolidar testes de frontend; nao existe script de testes no package atual.
5. Ampliar testes de isolamento multiempresa e autorizacao no backend.
6. Confirmar e integrar de forma controlada os modulos presentes mas nao registrados.
7. Alinhar os perfis de dominio com schema, guards, menu e permissoes.
8. Confirmar a branch ou entrega que contem Vendas e os componentes reutilizaveis de graficos.

## Criterios para a primeira versao operacional

- fluxos essenciais funcionando sem acesso cruzado entre empresas;
- autenticacao e permissoes validadas no backend;
- lint dos arquivos novos sem erros;
- builds de backend e frontend concluidos;
- fluxos criticos cobertos por testes proporcionais ao risco;
- navegacao mobile utilizavel;
- nenhuma credencial ou configuracao de producao no Git.
