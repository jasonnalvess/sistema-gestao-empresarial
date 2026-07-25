# Regras de Negócio - Produtos

## Cadastro

- Produto deve ter nome obrigatório.
- Unidade de medida deve ser obrigatória.
- Categoria será opcional inicialmente.
- Marca será opcional inicialmente.
- Preço de custo e preço de venda podem ser zero.
- Produto nasce ativo por padrão.

## Multiempresa

- Cada produto pertence a uma empresa.
- Usuários de uma empresa não podem visualizar produtos de outra empresa.
- Super administrador pode visualizar todos os produtos.

## Estoque

- O cadastro de produto não representa quantidade em estoque.
- Quantidade será controlada pelo módulo Estoque.
- Campos de estoque mínimo e máximo servem como referência para alertas futuros.

## Fiscal

- NCM será opcional no início.
- Futuramente será usado no módulo fiscal.
