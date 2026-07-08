# Modelo de Banco - Produtos

## Entidades principais

### Produto

Representa o item comercial ou operacional cadastrado no sistema.

Campos planejados:

- nome
- descricao
- codigoInterno
- codigoBarras
- ncm
- unidade
- marca
- categoria
- precoCusto
- precoVenda
- estoqueMinimo
- estoqueMaximo
- peso
- altura
- largura
- comprimento
- ativo
- empresaId

### MarcaProduto

Representa a marca/fabricante do produto.

### UnidadeMedida

Representa unidade de controle, como UN, CX, KG, LT, M, PC.

## Regras

- Produto pertence a uma empresa.
- Produto pode ter categoria.
- Produto pode ter marca.
- Produto deve ter unidade.
- Produto pode ser inativado, mas não excluído fisicamente.
- Código interno deve ser único por empresa quando informado.
- Código de barras deve ser único por empresa quando informado.
