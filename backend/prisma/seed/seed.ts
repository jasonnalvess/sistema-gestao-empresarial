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
