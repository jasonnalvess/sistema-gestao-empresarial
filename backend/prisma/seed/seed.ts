import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const senhaPadrao = await bcrypt.hash('123456', 10);

  const empresa = await prisma.empresa.upsert({
    where: { cnpj: '00000000000100' },
    update: {},
    create: {
      nome: 'Empresa Teste',
      cnpj: '00000000000100',
      ativa: true,
    },
  });

  await prisma.usuario.upsert({
    where: { email: 'admin@sistema.com' },
    update: {},
    create: {
      nome: 'Super Admin',
      email: 'admin@sistema.com',
      senha: senhaPadrao,
      tipo: 'SUPER_ADMIN',
      ativo: true,
    },
  });

  await prisma.usuario.upsert({
    where: { email: 'admin.empresa@sistema.com' },
    update: {},
    create: {
      nome: 'Admin Empresa',
      email: 'admin.empresa@sistema.com',
      senha: senhaPadrao,
      tipo: 'ADMIN_EMPRESA',
      ativo: true,
      empresaId: empresa.id,
    },
  });

  const modulos = [
    {
      nome: 'Fiscal',
      chave: 'fiscal',
      descricao: 'Notas fiscais e relatórios fiscais',
    },
    {
      nome: 'Estoque',
      chave: 'estoque',
      descricao: 'Produtos, entradas, saídas e inventário',
    },
    {
      nome: 'Caixa',
      chave: 'caixa',
      descricao: 'Controle de receitas, despesas e fluxo de caixa',
    },
    {
      nome: 'Agenda',
      chave: 'agenda',
      descricao: 'Agenda de clientes e atendimentos',
    },
    {
      nome: 'Funcionários',
      chave: 'funcionarios',
      descricao: 'Cadastro e controle de funcionários',
    },
  ];

  for (const modulo of modulos) {
    await prisma.moduloSistema.upsert({
      where: { chave: modulo.chave },
      update: {},
      create: {
        ...modulo,
        ativo: true,
      },
    });
  }

  const permissoes = [
    // Sistema
    {
      nome: 'Visualizar configurações do sistema',
      chave: 'sistema.visualizar',
      descricao: 'Permite visualizar configurações gerais do sistema',
      modulo: 'sistema',
    },
    {
      nome: 'Editar configurações do sistema',
      chave: 'sistema.editar',
      descricao: 'Permite alterar configurações gerais do sistema',
      modulo: 'sistema',
    },
    {
      nome: 'Visualizar auditoria',
      chave: 'sistema.auditoria.visualizar',
      descricao: 'Permite consultar registros de auditoria do sistema',
      modulo: 'sistema',
    },

    // Empresas
    {
      nome: 'Visualizar empresas',
      chave: 'empresas.visualizar',
      descricao: 'Permite consultar empresas cadastradas',
      modulo: 'empresas',
    },
    {
      nome: 'Criar empresas',
      chave: 'empresas.criar',
      descricao: 'Permite cadastrar novas empresas',
      modulo: 'empresas',
    },
    {
      nome: 'Editar empresas',
      chave: 'empresas.editar',
      descricao: 'Permite alterar empresas cadastradas',
      modulo: 'empresas',
    },
    {
      nome: 'Ativar empresas',
      chave: 'empresas.ativar',
      descricao: 'Permite ativar empresas',
      modulo: 'empresas',
    },
    {
      nome: 'Inativar empresas',
      chave: 'empresas.inativar',
      descricao: 'Permite inativar empresas',
      modulo: 'empresas',
    },
    {
      nome: 'Gerenciar módulos da empresa',
      chave: 'empresas.modulos.gerenciar',
      descricao: 'Permite ativar ou desativar módulos de uma empresa',
      modulo: 'empresas',
    },

    // Usuários
    {
      nome: 'Visualizar usuários',
      chave: 'usuarios.visualizar',
      descricao: 'Permite consultar usuários',
      modulo: 'usuarios',
    },
    {
      nome: 'Criar usuários',
      chave: 'usuarios.criar',
      descricao: 'Permite cadastrar usuários',
      modulo: 'usuarios',
    },
    {
      nome: 'Editar usuários',
      chave: 'usuarios.editar',
      descricao: 'Permite alterar usuários',
      modulo: 'usuarios',
    },
    {
      nome: 'Ativar usuários',
      chave: 'usuarios.ativar',
      descricao: 'Permite ativar usuários',
      modulo: 'usuarios',
    },
    {
      nome: 'Inativar usuários',
      chave: 'usuarios.inativar',
      descricao: 'Permite inativar usuários',
      modulo: 'usuarios',
    },
    {
      nome: 'Redefinir senha de usuários',
      chave: 'usuarios.senha.redefinir',
      descricao: 'Permite redefinir a senha de outros usuários',
      modulo: 'usuarios',
    },
    {
      nome: 'Gerenciar perfis dos usuários',
      chave: 'usuarios.perfis.gerenciar',
      descricao: 'Permite atribuir ou remover perfis de usuários',
      modulo: 'usuarios',
    },

    // Perfis e permissões
    {
      nome: 'Visualizar perfis',
      chave: 'perfis.visualizar',
      descricao: 'Permite consultar perfis de acesso',
      modulo: 'perfis',
    },
    {
      nome: 'Criar perfis',
      chave: 'perfis.criar',
      descricao: 'Permite criar perfis de acesso',
      modulo: 'perfis',
    },
    {
      nome: 'Editar perfis',
      chave: 'perfis.editar',
      descricao: 'Permite alterar perfis de acesso',
      modulo: 'perfis',
    },
    {
      nome: 'Ativar perfis',
      chave: 'perfis.ativar',
      descricao: 'Permite ativar perfis de acesso',
      modulo: 'perfis',
    },
    {
      nome: 'Inativar perfis',
      chave: 'perfis.inativar',
      descricao: 'Permite inativar perfis de acesso',
      modulo: 'perfis',
    },
    {
      nome: 'Gerenciar permissões dos perfis',
      chave: 'perfis.permissoes.gerenciar',
      descricao: 'Permite definir as permissões atribuídas aos perfis',
      modulo: 'perfis',
    },

    // Clientes
    {
      nome: 'Visualizar clientes',
      chave: 'clientes.visualizar',
      descricao: 'Permite consultar clientes',
      modulo: 'clientes',
    },
    {
      nome: 'Criar clientes',
      chave: 'clientes.criar',
      descricao: 'Permite cadastrar clientes',
      modulo: 'clientes',
    },
    {
      nome: 'Editar clientes',
      chave: 'clientes.editar',
      descricao: 'Permite alterar clientes',
      modulo: 'clientes',
    },
    {
      nome: 'Excluir clientes',
      chave: 'clientes.excluir',
      descricao: 'Permite excluir clientes',
      modulo: 'clientes',
    },

    // Agenda
    {
      nome: 'Visualizar agenda',
      chave: 'agenda.visualizar',
      descricao: 'Permite consultar compromissos e atendimentos',
      modulo: 'agenda',
    },
    {
      nome: 'Criar agendamentos',
      chave: 'agenda.criar',
      descricao: 'Permite criar compromissos e atendimentos',
      modulo: 'agenda',
    },
    {
      nome: 'Editar agendamentos',
      chave: 'agenda.editar',
      descricao: 'Permite alterar compromissos e atendimentos',
      modulo: 'agenda',
    },
    {
      nome: 'Cancelar agendamentos',
      chave: 'agenda.cancelar',
      descricao: 'Permite cancelar compromissos e atendimentos',
      modulo: 'agenda',
    },

    // Funcionários
    {
      nome: 'Visualizar funcionários',
      chave: 'funcionarios.visualizar',
      descricao: 'Permite consultar funcionários',
      modulo: 'funcionarios',
    },
    {
      nome: 'Criar funcionários',
      chave: 'funcionarios.criar',
      descricao: 'Permite cadastrar funcionários',
      modulo: 'funcionarios',
    },
    {
      nome: 'Editar funcionários',
      chave: 'funcionarios.editar',
      descricao: 'Permite alterar funcionários',
      modulo: 'funcionarios',
    },
    {
      nome: 'Inativar funcionários',
      chave: 'funcionarios.inativar',
      descricao: 'Permite inativar funcionários',
      modulo: 'funcionarios',
    },

    // Estoque
    {
      nome: 'Visualizar estoque',
      chave: 'estoque.visualizar',
      descricao: 'Permite consultar produtos e saldos de estoque',
      modulo: 'estoque',
    },
    {
      nome: 'Criar produtos',
      chave: 'estoque.produtos.criar',
      descricao: 'Permite cadastrar produtos',
      modulo: 'estoque',
    },
    {
      nome: 'Editar produtos',
      chave: 'estoque.produtos.editar',
      descricao: 'Permite alterar produtos',
      modulo: 'estoque',
    },
    {
      nome: 'Registrar entradas',
      chave: 'estoque.entradas.registrar',
      descricao: 'Permite registrar entradas de produtos',
      modulo: 'estoque',
    },
    {
      nome: 'Registrar saídas',
      chave: 'estoque.saidas.registrar',
      descricao: 'Permite registrar saídas de produtos',
      modulo: 'estoque',
    },
    {
      nome: 'Realizar ajustes',
      chave: 'estoque.ajustes.realizar',
      descricao: 'Permite realizar ajustes de saldo no estoque',
      modulo: 'estoque',
    },
    {
      nome: 'Realizar inventários',
      chave: 'estoque.inventarios.realizar',
      descricao: 'Permite criar e executar inventários',
      modulo: 'estoque',
    },

    // Caixa
    {
      nome: 'Visualizar caixa',
      chave: 'caixa.visualizar',
      descricao: 'Permite consultar caixas e movimentações',
      modulo: 'caixa',
    },
    {
      nome: 'Abrir caixa',
      chave: 'caixa.abrir',
      descricao: 'Permite abrir caixas',
      modulo: 'caixa',
    },
    {
      nome: 'Fechar caixa',
      chave: 'caixa.fechar',
      descricao: 'Permite fechar caixas',
      modulo: 'caixa',
    },
    {
      nome: 'Registrar movimentações',
      chave: 'caixa.movimentacoes.registrar',
      descricao: 'Permite registrar entradas e saídas no caixa',
      modulo: 'caixa',
    },
    {
      nome: 'Cancelar movimentações',
      chave: 'caixa.movimentacoes.cancelar',
      descricao: 'Permite cancelar movimentações do caixa',
      modulo: 'caixa',
    },

    // Financeiro
    {
      nome: 'Visualizar financeiro',
      chave: 'financeiro.visualizar',
      descricao: 'Permite consultar informações financeiras',
      modulo: 'financeiro',
    },
    {
      nome: 'Criar contas a pagar',
      chave: 'financeiro.contas_pagar.criar',
      descricao: 'Permite cadastrar contas a pagar',
      modulo: 'financeiro',
    },
    {
      nome: 'Pagar contas',
      chave: 'financeiro.contas_pagar.pagar',
      descricao: 'Permite registrar o pagamento de contas',
      modulo: 'financeiro',
    },
    {
      nome: 'Cancelar pagamentos',
      chave: 'financeiro.contas_pagar.cancelar',
      descricao: 'Permite cancelar pagamentos registrados',
      modulo: 'financeiro',
    },
    {
      nome: 'Criar contas a receber',
      chave: 'financeiro.contas_receber.criar',
      descricao: 'Permite cadastrar contas a receber',
      modulo: 'financeiro',
    },
    {
      nome: 'Receber contas',
      chave: 'financeiro.contas_receber.receber',
      descricao: 'Permite registrar o recebimento de contas',
      modulo: 'financeiro',
    },
    {
      nome: 'Cancelar recebimentos',
      chave: 'financeiro.contas_receber.cancelar',
      descricao: 'Permite cancelar recebimentos registrados',
      modulo: 'financeiro',
    },
    {
      nome: 'Visualizar relatórios financeiros',
      chave: 'financeiro.relatorios.visualizar',
      descricao: 'Permite consultar relatórios financeiros',
      modulo: 'financeiro',
    },

    // Fiscal
    {
      nome: 'Visualizar notas fiscais',
      chave: 'fiscal.notas.visualizar',
      descricao: 'Permite consultar notas fiscais',
      modulo: 'fiscal',
    },
    {
      nome: 'Emitir notas fiscais',
      chave: 'fiscal.notas.emitir',
      descricao: 'Permite emitir notas fiscais',
      modulo: 'fiscal',
    },
    {
      nome: 'Cancelar notas fiscais',
      chave: 'fiscal.notas.cancelar',
      descricao: 'Permite cancelar notas fiscais',
      modulo: 'fiscal',
    },
    {
      nome: 'Inutilizar numeração fiscal',
      chave: 'fiscal.notas.inutilizar',
      descricao: 'Permite inutilizar numerações de notas fiscais',
      modulo: 'fiscal',
    },
    {
      nome: 'Visualizar relatórios fiscais',
      chave: 'fiscal.relatorios.visualizar',
      descricao: 'Permite consultar relatórios fiscais',
      modulo: 'fiscal',
    },
  ];

  for (const permissao of permissoes) {
    await prisma.permissao.upsert({
      where: { chave: permissao.chave },
      update: {
        nome: permissao.nome,
        descricao: permissao.descricao,
        modulo: permissao.modulo,
        ativo: true,
      },
      create: {
        ...permissao,
        ativo: true,
      },
    });
  }

  console.log('Seed executado com sucesso!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
