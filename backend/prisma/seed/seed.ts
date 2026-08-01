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

    // Fornecedores
    {
      nome: 'Visualizar fornecedores',
      chave: 'fornecedores.visualizar',
      descricao: 'Permite consultar fornecedores',
      modulo: 'fornecedores',
    },
    {
      nome: 'Criar fornecedores',
      chave: 'fornecedores.criar',
      descricao: 'Permite cadastrar fornecedores',
      modulo: 'fornecedores',
    },
    {
      nome: 'Editar fornecedores',
      chave: 'fornecedores.editar',
      descricao: 'Permite alterar fornecedores',
      modulo: 'fornecedores',
    },

    // Pedidos de compra
    {
      nome: 'Visualizar pedidos de compra',
      chave: 'pedidos_compra.visualizar',
      descricao: 'Permite consultar pedidos de compra',
      modulo: 'pedidos_compra',
    },
    {
      nome: 'Criar pedidos de compra',
      chave: 'pedidos_compra.criar',
      descricao: 'Permite cadastrar pedidos de compra',
      modulo: 'pedidos_compra',
    },
    {
      nome: 'Editar pedidos de compra',
      chave: 'pedidos_compra.editar',
      descricao: 'Permite alterar pedidos de compra',
      modulo: 'pedidos_compra',
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

  // ============================================================
  // PERFIS PADRÃO DO IAM
  // ============================================================

  const permissoesCadastradas = await prisma.permissao.findMany({
    where: {
      ativo: true,
    },
    select: {
      id: true,
      chave: true,
      modulo: true,
    },
    orderBy: {
      chave: 'asc',
    },
  });

  if (permissoesCadastradas.length !== permissoes.length) {
    throw new Error(
      `Quantidade inesperada de permissões ativas. Esperado: ${permissoes.length}. Encontrado: ${permissoesCadastradas.length}.`,
    );
  }

  const todasAsChaves = permissoesCadastradas.map(
    (permissao) => permissao.chave,
  );

  const selecionarPermissoes = ({
    modulos = [],
    chavesAdicionais = [],
    chavesExcluidas = [],
  }: {
    modulos?: string[];
    chavesAdicionais?: string[];
    chavesExcluidas?: string[];
  }): string[] => {
    const selecionadas = permissoesCadastradas
      .filter(
        (permissao) =>
          modulos.includes(permissao.modulo) ||
          chavesAdicionais.includes(permissao.chave),
      )
      .filter((permissao) => !chavesExcluidas.includes(permissao.chave))
      .map((permissao) => permissao.chave);

    return [...new Set(selecionadas)].sort();
  };

  const permissoesAdministradorSistema = todasAsChaves.filter(
    (chave) => !['sistema.editar'].includes(chave),
  );

  const permissoesAdministradorEmpresa = selecionarPermissoes({
    modulos: [
      'usuarios',
      'perfis',
      'clientes',
      'fornecedores',
      'pedidos_compra',
      'agenda',
      'funcionarios',
      'estoque',
      'caixa',
      'financeiro',
      'fiscal',
    ],
    chavesAdicionais: [
      'empresas.visualizar',
      'empresas.editar',
      'empresas.modulos.gerenciar',
    ],
  });

  const permissoesSupervisor = selecionarPermissoes({
    modulos: [
      'clientes',
      'fornecedores',
      'pedidos_compra',
      'agenda',
      'estoque',
      'caixa',
    ],
    chavesAdicionais: ['funcionarios.visualizar'],
    chavesExcluidas: [
      'clientes.excluir',
      'agenda.excluir',
      'estoque.movimentacoes.cancelar',
      'estoque.ajustar',
      'caixa.movimentacoes.cancelar',
    ],
  });

  const permissoesRh = selecionarPermissoes({
    modulos: ['funcionarios', 'agenda'],
    chavesAdicionais: ['clientes.visualizar'],
    chavesExcluidas: ['agenda.excluir'],
  });

  const permissoesColaborador = selecionarPermissoes({
    chavesAdicionais: [
      'clientes.visualizar',
      'fornecedores.visualizar',
      'pedidos_compra.visualizar',
      'agenda.visualizar',
      'agenda.criar',
      'agenda.editar',
      'funcionarios.visualizar',
      'estoque.visualizar',
      'caixa.visualizar',
    ],
  });

  type PerfilPadrao = {
    nome: string;
    chave: string;
    descricao: string;
    sistema: boolean;
    escopo: 'SISTEMA' | 'EMPRESA';
    empresaId: string | null;
    permissoes: string[];
  };

  const perfisPadrao: PerfilPadrao[] = [
    {
      nome: 'Super Administrador',
      chave: 'super_administrador',
      descricao:
        'Perfil global com acesso integral a todos os recursos do sistema',
      sistema: true,
      escopo: 'SISTEMA',
      empresaId: null,
      permissoes: todasAsChaves,
    },
    {
      nome: 'Administrador do Sistema',
      chave: 'administrador_sistema',
      descricao:
        'Perfil global responsável pela gestão operacional das empresas',
      sistema: true,
      escopo: 'SISTEMA',
      empresaId: null,
      permissoes: permissoesAdministradorSistema,
    },
    {
      nome: 'Administrador da Empresa',
      chave: 'administrador_empresa',
      descricao:
        'Perfil responsável pela administração dos recursos da própria empresa',
      sistema: true,
      escopo: 'EMPRESA',
      empresaId: empresa.id,
      permissoes: permissoesAdministradorEmpresa,
    },
    {
      nome: 'Supervisor',
      chave: 'supervisor',
      descricao:
        'Perfil empresarial responsável pelo acompanhamento das operações',
      sistema: true,
      escopo: 'EMPRESA',
      empresaId: empresa.id,
      permissoes: permissoesSupervisor,
    },
    {
      nome: 'RH',
      chave: 'rh',
      descricao:
        'Perfil empresarial direcionado à gestão de funcionários e agendas',
      sistema: true,
      escopo: 'EMPRESA',
      empresaId: empresa.id,
      permissoes: permissoesRh,
    },
    {
      nome: 'Colaborador',
      chave: 'colaborador',
      descricao: 'Perfil empresarial com acesso operacional básico e restrito',
      sistema: true,
      escopo: 'EMPRESA',
      empresaId: empresa.id,
      permissoes: permissoesColaborador,
    },
  ];

  const permissoesPorChave = new Map(
    permissoesCadastradas.map((permissao) => [permissao.chave, permissao]),
  );

  for (const perfilPadrao of perfisPadrao) {
    const chavesInexistentes = perfilPadrao.permissoes.filter(
      (chave) => !permissoesPorChave.has(chave),
    );

    if (chavesInexistentes.length > 0) {
      throw new Error(
        `O perfil ${perfilPadrao.chave} referencia permissões inexistentes: ${chavesInexistentes.join(', ')}`,
      );
    }

    const perfilExistente = await prisma.perfil.findFirst({
      where: {
        empresaId: perfilPadrao.empresaId,
        chave: perfilPadrao.chave,
      },
    });

    const perfil = perfilExistente
      ? await prisma.perfil.update({
          where: {
            id: perfilExistente.id,
          },
          data: {
            nome: perfilPadrao.nome,
            descricao: perfilPadrao.descricao,
            sistema: perfilPadrao.sistema,
            escopo: perfilPadrao.escopo,
            ativo: true,
          },
        })
      : await prisma.perfil.create({
          data: {
            nome: perfilPadrao.nome,
            chave: perfilPadrao.chave,
            descricao: perfilPadrao.descricao,
            sistema: perfilPadrao.sistema,
            escopo: perfilPadrao.escopo,
            ativo: true,
            empresaId: perfilPadrao.empresaId,
          },
        });

    const vinculos = perfilPadrao.permissoes.map((chave) => {
      const permissao = permissoesPorChave.get(chave);

      if (!permissao) {
        throw new Error(`Permissão não encontrada: ${chave}`);
      }

      return {
        perfilId: perfil.id,
        permissaoId: permissao.id,
        permitido: true,
      };
    });

    await prisma.$transaction(async (tx) => {
      await tx.perfilPermissao.deleteMany({
        where: {
          perfilId: perfil.id,
        },
      });

      if (vinculos.length > 0) {
        await tx.perfilPermissao.createMany({
          data: vinculos,
        });
      }
    });

    console.log(
      `Perfil sincronizado: ${perfilPadrao.nome} (${vinculos.length} permissões)`,
    );
  }

  // ============================================================
  // VÍNCULOS PADRÃO ENTRE USUÁRIOS E PERFIS
  // ============================================================

  type VinculoUsuarioPerfilPadrao = {
    emailUsuario: string;
    chavePerfil: string;
  };

  const vinculosUsuarioPerfilPadrao: VinculoUsuarioPerfilPadrao[] = [
    {
      emailUsuario: 'admin@sistema.com',
      chavePerfil: 'super_administrador',
    },
    {
      emailUsuario: 'admin.empresa@sistema.com',
      chavePerfil: 'administrador_empresa',
    },
    {
      emailUsuario: 'teste@sistema.com',
      chavePerfil: 'colaborador',
    },
  ];

  for (const vinculoPadrao of vinculosUsuarioPerfilPadrao) {
    const usuario = await prisma.usuario.findUnique({
      where: {
        email: vinculoPadrao.emailUsuario,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        empresaId: true,
      },
    });

    if (!usuario) {
      throw new Error(
        `Usuário padrão não encontrado: ${vinculoPadrao.emailUsuario}`,
      );
    }

    const perfil = await prisma.perfil.findFirst({
      where: {
        chave: vinculoPadrao.chavePerfil,
        ativo: true,
        OR: [
          {
            empresaId: usuario.empresaId,
          },
          {
            empresaId: null,
          },
        ],
      },
      select: {
        id: true,
        nome: true,
        chave: true,
        escopo: true,
        empresaId: true,
        ativo: true,
      },
    });

    if (!perfil) {
      throw new Error(
        `Perfil ativo não encontrado para o usuário ${usuario.email}: ${vinculoPadrao.chavePerfil}`,
      );
    }

    if (perfil.escopo === 'SISTEMA') {
      if (perfil.empresaId !== null) {
        throw new Error(
          `Perfil de sistema associado indevidamente a uma empresa: ${perfil.chave}`,
        );
      }

      if (usuario.empresaId !== null) {
        throw new Error(
          `Usuário empresarial ${usuario.email} não pode receber o perfil global ${perfil.chave}`,
        );
      }
    }

    if (perfil.escopo === 'EMPRESA') {
      if (usuario.empresaId === null) {
        throw new Error(
          `Usuário global ${usuario.email} não pode receber o perfil empresarial ${perfil.chave}`,
        );
      }

      if (perfil.empresaId === null) {
        throw new Error(
          `Perfil empresarial ${perfil.chave} não possui empresa vinculada`,
        );
      }

      if (perfil.empresaId !== usuario.empresaId) {
        throw new Error(
          `O perfil ${perfil.chave} pertence a uma empresa diferente da empresa do usuário ${usuario.email}`,
        );
      }
    }

    const vinculo = await prisma.usuarioPerfil.upsert({
      where: {
        usuarioId_perfilId: {
          usuarioId: usuario.id,
          perfilId: perfil.id,
        },
      },
      update: {
        ativo: true,
      },
      create: {
        usuarioId: usuario.id,
        perfilId: perfil.id,
        ativo: true,
      },
    });

    console.log(
      `Vínculo sincronizado: ${usuario.email} -> ${perfil.nome} (${vinculo.ativo ? 'ativo' : 'inativo'})`,
    );
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
