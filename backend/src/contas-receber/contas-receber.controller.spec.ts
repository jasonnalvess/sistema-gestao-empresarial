import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { FormaRecebimento } from '@prisma/client';

import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';

import { ContasReceberController } from './contas-receber.controller';
import { ContasReceberService } from './contas-receber.service';

const empresa = { empresaId: 'empresa-1', origem: 'JWT' as const };
const usuario: AuthenticatedUser = {
  id: 'usuario-1',
  email: 'usuario@empresa.com',
  empresaId: 'empresa-1',
  tipo: 'ADMIN_EMPRESA',
};

describe('ContasReceberController', () => {
  let controller: ContasReceberController;
  let service: Record<string, jest.Mock>;

  beforeEach(() => {
    service = {
      criar: jest.fn(),
      atualizar: jest.fn(),
      registrarRecebimento: jest.fn(),
      cancelar: jest.fn(),
      gerarAPartirOrdemServico: jest.fn(),
      listar: jest.fn(),
      obterResumo: jest.fn(),
      buscarPorId: jest.fn(),
      adicionarHistorico: jest.fn(),
      listarHistorico: jest.fn(),
    };

    controller = new ContasReceberController(
      service as unknown as ContasReceberService,
    );
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });

  it('encaminha empresa, DTOs, IDs, filtros e usuário ao service', async () => {
    const criacao = {
      descricao: 'Conta',
      dataVencimento: '2026-08-10',
      valorOriginal: 100,
    };
    const atualizacao = { observacao: 'Atualizada' };
    const recebimento = {
      valor: 100,
      formaRecebimento: FormaRecebimento.PIX,
    };
    const gerar = {
      dataVencimento: '2026-08-10',
      valorOriginal: 100,
    };
    const filtros = { page: 1 };
    const filtrosResumo = {
      vencimentoInicio: '2026-08-01',
      vencimentoFim: '2026-08-31',
    };
    const historico = { descricao: 'Observação' };

    await Promise.all([
      controller.criar(empresa, criacao, usuario),
      controller.listar(empresa, filtros),
      controller.obterResumo(empresa, filtrosResumo),
      controller.buscarPorId(empresa, 'conta-1'),
      controller.atualizar(empresa, 'conta-1', atualizacao, usuario),
      controller.registrarRecebimento(empresa, 'conta-1', recebimento, usuario),
      controller.cancelar(empresa, 'conta-1', usuario),
      controller.gerarAPartirOrdemServico(empresa, 'ordem-1', gerar, usuario),
      controller.adicionarHistorico(empresa, 'conta-1', historico, usuario),
      controller.listarHistorico(empresa, 'conta-1'),
    ]);

    expect(service.criar).toHaveBeenCalledWith('empresa-1', criacao, usuario);
    expect(service.listar).toHaveBeenCalledWith('empresa-1', filtros);
    expect(service.obterResumo).toHaveBeenCalledWith(
      'empresa-1',
      filtrosResumo,
    );
    expect(service.buscarPorId).toHaveBeenCalledWith('empresa-1', 'conta-1');
    expect(service.atualizar).toHaveBeenCalledWith(
      'empresa-1',
      'conta-1',
      atualizacao,
      usuario,
    );
    expect(service.registrarRecebimento).toHaveBeenCalledWith(
      'empresa-1',
      'conta-1',
      recebimento,
      usuario,
    );
    expect(service.cancelar).toHaveBeenCalledWith(
      'empresa-1',
      'conta-1',
      usuario,
    );
    expect(service.gerarAPartirOrdemServico).toHaveBeenCalledWith(
      'empresa-1',
      'ordem-1',
      gerar,
      usuario,
    );
    expect(service.adicionarHistorico).toHaveBeenCalledWith(
      'empresa-1',
      'conta-1',
      historico,
      usuario,
    );
    expect(service.listarHistorico).toHaveBeenCalledWith(
      'empresa-1',
      'conta-1',
    );
  });

  it('declara resumo como rota estática distinta de :id', () => {
    const resumo = Object.getOwnPropertyDescriptor(
      ContasReceberController.prototype,
      'obterResumo',
    )?.value as unknown as object;
    const detalhe = Object.getOwnPropertyDescriptor(
      ContasReceberController.prototype,
      'buscarPorId',
    )?.value as unknown as object;

    expect(Reflect.getMetadata(PATH_METADATA, resumo)).toBe('resumo');
    expect(Reflect.getMetadata(PATH_METADATA, detalhe)).toBe(':id');
  });

  it('declara os guards na ordem JWT, papéis, permissões e empresa', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, ContasReceberController),
    ).toEqual([
      JwtAuthGuard,
      RolesGuard,
      PermissionsGuard,
      EmpresaContextoGuard,
    ]);
  });

  it.each([
    ['criar', 'financeiro.contas_receber.criar'],
    ['gerarAPartirOrdemServico', 'financeiro.contas_receber.criar'],
    ['listar', 'financeiro.contas_receber.visualizar'],
    ['obterResumo', 'financeiro.contas_receber.visualizar'],
    ['buscarPorId', 'financeiro.contas_receber.visualizar'],
    ['listarHistorico', 'financeiro.contas_receber.visualizar'],
    ['atualizar', 'financeiro.contas_receber.editar'],
    ['adicionarHistorico', 'financeiro.contas_receber.editar'],
    ['registrarRecebimento', 'financeiro.contas_receber.receber'],
    ['cancelar', 'financeiro.contas_receber.cancelar'],
  ] as const)('deve exigir %s em %s', (metodo, permissao) => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        ContasReceberController.prototype[metodo],
      ),
    ).toEqual([permissao]);
  });

  it.each([
    'criar',
    'gerarAPartirOrdemServico',
    'listar',
    'obterResumo',
    'buscarPorId',
    'listarHistorico',
    'atualizar',
    'adicionarHistorico',
    'registrarRecebimento',
    'cancelar',
  ] as const)('deve aceitar os três papéis em %s', (metodo) => {
    expect(
      Reflect.getMetadata(ROLES_KEY, ContasReceberController.prototype[metodo]),
    ).toEqual(['SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA']);
  });
});
