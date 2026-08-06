# Changelog

Todas as alterações relevantes do Sistema de Gestão Empresarial são documentadas neste arquivo.

## [2.0.0] - 2026-08-05

### Adicionado

- Arquitetura SaaS multiempresa.
- Isolamento de dados por empresa.
- Contexto empresarial explícito.
- Autenticação JWT.
- RBAC granular por permissões.
- Catálogo de módulos e permissões.
- Gestão de empresas, usuários e módulos.
- Clientes.
- Fornecedores.
- Produtos.
- Categorias de Produtos.
- Marcas.
- Unidades de Medida.
- Depósitos.
- Estoque.
- Movimentações de Estoque.
- Inventários.
- Pedidos de Compra.
- Contas a Pagar.
- Contas a Receber.
- Financeiro.
- Caixas.
- Agenda.
- Ordens de Serviço.
- Vendas.
- Dashboard empresarial.
- Auditoria empresarial e global.
- Sanitização de dados sensíveis da Auditoria.
- Query keys tenant-aware.
- Proteções de concorrência e locks transacionais.
- Seed seguro com autorização explícita.

### Alterado

- Módulos legados migrados para `EmpresaContextoGuard`.
- Controllers migrados para `PermissionsGuard`.
- `SUPER_ADMIN` passou a exigir empresa selecionada em módulos empresariais.
- Frontend migrado para `EmpresaSelecionadaContext`.
- Caches globais substituídos por caches isolados por empresa.
- Numeração de Vendas e Contas a Receber serializada.
- Paginação do histórico de aberturas de Caixa.
- Tratamento de `P2002` refinado.
- Mocks e tipagens dos testes saneados.
- ESLint zerado no backend e frontend.

### Segurança

- Bloqueio de seed em produção.
- Allowlist do banco de teste.
- Remoção de credenciais previsíveis.
- Proteção contra descoberta de recursos de outra empresa.
- Resposta 404 uniforme para recursos externos.
- Locks contendo `empresaId`.
- Ausência de SQL unsafe.
- Sanitização de senha, token, authorization, API keys, cookies, secrets e `DATABASE_URL`.
- Auditoria best-effort sem comprometer a resposta principal.

### Qualidade

- 59 suítes de testes.
- 945 testes aprovados.
- TypeScript backend aprovado.
- TypeScript frontend aprovado.
- Build backend aprovado.
- Build frontend aprovado.
- ESLint backend com zero diagnósticos.
- ESLint frontend com zero diagnósticos.
- 37 migrations aplicadas e schema atualizado.

### Limitações conhecidas

- Módulos Fiscal e Funcionários ainda não implementados funcionalmente.
- Gestão completa de Perfis ainda não possui interface administrativa dedicada.
- Validação E2E visual com navegador ainda é limitada.
- Produção não foi atualizada durante as sprints de encerramento.
- Integrações fiscais, bancárias e externas ficam para versões futuras.
