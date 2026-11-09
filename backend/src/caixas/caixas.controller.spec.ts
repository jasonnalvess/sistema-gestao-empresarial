import { GUARDS_METADATA } from '@nestjs/common/constants';
import { TipoMovimentacaoCaixa } from '@prisma/client';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import { CaixasController } from './caixas.controller';
import type { CaixasService } from './caixas.service';

const empresa = { empresaId: 'e1', origem: 'JWT' as const };
const usuario: AuthenticatedUser = {
  id: 'u1',
  email: 'usuario@empresa.com',
  empresaId: 'e1',
  tipo: 'ADMIN_EMPRESA',
};

describe('CaixasController', () => {
  const criarController = () => {
    const service = {
      criar: jest.fn(),
      listar: jest.fn(),
      resumo: jest.fn(),
      listarMovimentacoes: jest.fn(),
      buscarPorId: jest.fn(),
      atualizar: jest.fn(),
      abrir: jest.fn(),
      fechar: jest.fn(),
      buscarAberturaAtiva: jest.fn(),
      listarAberturas: jest.fn(),
      criarMovimentacao: jest.fn(),
    };
    return {
      service,
      controller: new CaixasController(service as unknown as CaixasService),
    };
  };

  it('declara os quatro guards na ordem oficial', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, CaixasController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
      PermissionsGuard,
      EmpresaContextoGuard,
    ]);
  });

  it.each([
    ['criar', 'caixa.criar'],
    ['listar', 'caixa.visualizar'],
    ['resumo', 'caixa.visualizar'],
    ['listarMovimentacoes', 'caixa.visualizar'],
    ['buscarPorId', 'caixa.visualizar'],
    ['atualizar', 'caixa.editar'],
    ['abrir', 'caixa.abrir'],
    ['fechar', 'caixa.fechar'],
    ['aberturaAtual', 'caixa.visualizar'],
    ['listarAberturas', 'caixa.visualizar'],
    ['movimentar', 'caixa.movimentacoes.registrar'],
  ] as const)('exige a permissão oficial em %s', (metodo, permissao) => {
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, CaixasController.prototype[metodo]),
    ).toEqual([permissao]);
  });

  it.each([
    'criar',
    'listar',
    'resumo',
    'listarMovimentacoes',
    'buscarPorId',
    'atualizar',
    'abrir',
    'fechar',
    'aberturaAtual',
    'listarAberturas',
    'movimentar',
  ] as const)('aceita os três papéis em %s', (metodo) => {
    expect(
      Reflect.getMetadata(ROLES_KEY, CaixasController.prototype[metodo]),
    ).toEqual(['SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA']);
  });

  it('encaminha empresa, autoria, IDs, DTOs e filtros', async () => {
    const { controller, service } = criarController();
    const criar = { nome: 'Principal', codigo: 'CX1' };
    const atualizar = { nome: 'Principal 2' };
    const abrir = { saldoInicial: 10 };
    const fechar = { saldoInformado: 10 };
    const movimento = {
      tipo: TipoMovimentacaoCaixa.ENTRADA,
      descricao: 'Entrada',
      valor: 10,
    };
    const filtros = { page: 2, limit: 20 };

    await controller.criar(empresa, criar, usuario);
    await controller.listar(empresa, filtros);
    await controller.resumo(empresa, {});
    await controller.listarMovimentacoes(empresa, filtros);
    await controller.buscarPorId(empresa, 'c1');
    await controller.atualizar(empresa, 'c1', atualizar, usuario);
    await controller.abrir(empresa, 'c1', abrir, usuario);
    await controller.fechar(empresa, 'c1', fechar, usuario);
    await controller.aberturaAtual(empresa, 'c1');
    await controller.listarAberturas(empresa, 'c1', filtros);
    await controller.movimentar(empresa, 'c1', movimento, usuario);

    expect(service.criar).toHaveBeenCalledWith('e1', 'u1', criar);
    expect(service.listar).toHaveBeenCalledWith('e1', filtros);
    expect(service.resumo).toHaveBeenCalledWith('e1', {});
    expect(service.listarMovimentacoes).toHaveBeenCalledWith('e1', filtros);
    expect(service.buscarPorId).toHaveBeenCalledWith('e1', 'c1');
    expect(service.atualizar).toHaveBeenCalledWith('e1', 'c1', 'u1', atualizar);
    expect(service.abrir).toHaveBeenCalledWith('e1', 'c1', 'u1', abrir);
    expect(service.fechar).toHaveBeenCalledWith('e1', 'c1', 'u1', fechar);
    expect(service.buscarAberturaAtiva).toHaveBeenCalledWith('e1', 'c1');
    expect(service.listarAberturas).toHaveBeenCalledWith('e1', 'c1', filtros);
    expect(service.criarMovimentacao).toHaveBeenCalledWith(
      'e1',
      'c1',
      'u1',
      movimento,
    );
  });

  it('não usa a permissão de cancelamento em endpoint existente', () => {
    for (const metodo of Object.getOwnPropertyNames(
      CaixasController.prototype,
    )) {
      const permissoes: unknown = Reflect.getMetadata(
        PERMISSIONS_KEY,
        CaixasController.prototype[metodo as keyof CaixasController],
      );
      expect(Array.isArray(permissoes) ? permissoes : []).not.toContain(
        'caixa.movimentacoes.cancelar',
      );
    }
  });
});
