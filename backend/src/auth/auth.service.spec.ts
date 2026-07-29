import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const usuariosServiceMock = {
    buscarPorEmailComAutorizacao: jest.fn(),
  };

  const jwtServiceMock = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsuariosService,
          useValue: usuariosServiceMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  it('deve gerar token com perfis e permissões sem duplicidade', async () => {
    usuariosServiceMock.buscarPorEmailComAutorizacao.mockResolvedValue({
      id: 'usuario-1',
      nome: 'Usuário Teste',
      email: 'teste@sistema.com',
      senha: 'senha-criptografada',
      tipo: 'USUARIO_EMPRESA',
      ativo: true,
      empresaId: 'empresa-1',
      perfis: [
        {
          perfil: {
            id: 'perfil-1',
            nome: 'Colaborador',
            chave: 'colaborador',
            escopo: 'EMPRESA',
            empresaId: 'empresa-1',
            permissoes: [
              {
                permissao: {
                  chave: 'agenda.visualizar',
                },
              },
              {
                permissao: {
                  chave: 'clientes.visualizar',
                },
              },
            ],
          },
        },
        {
          perfil: {
            id: 'perfil-2',
            nome: 'Perfil Adicional',
            chave: 'perfil_adicional',
            escopo: 'EMPRESA',
            empresaId: 'empresa-1',
            permissoes: [
              {
                permissao: {
                  chave: 'agenda.visualizar',
                },
              },
            ],
          },
        },
      ],
    });

    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
    jwtServiceMock.signAsync.mockResolvedValue('token-jwt');

    const resultado = await service.login(
      'teste@sistema.com',
      'senha-informada',
    );

    const payloadEsperado = {
      id: 'usuario-1',
      email: 'teste@sistema.com',
      tipo: 'USUARIO_EMPRESA',
      empresaId: 'empresa-1',
      perfis: ['colaborador', 'perfil_adicional'],
      permissoes: ['agenda.visualizar', 'clientes.visualizar'],
    };

    expect(
      usuariosServiceMock.buscarPorEmailComAutorizacao,
    ).toHaveBeenCalledWith('teste@sistema.com');

    expect(bcrypt.compare).toHaveBeenCalledWith(
      'senha-informada',
      'senha-criptografada',
    );

    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith(payloadEsperado);

    expect(resultado).toEqual({
      access_token: 'token-jwt',
      usuario: {
        id: 'usuario-1',
        nome: 'Usuário Teste',
        email: 'teste@sistema.com',
        tipo: 'USUARIO_EMPRESA',
        empresaId: 'empresa-1',
        perfis: ['colaborador', 'perfil_adicional'],
        permissoes: ['agenda.visualizar', 'clientes.visualizar'],
      },
    });
  });

  it('deve rejeitar usuário inexistente', async () => {
    usuariosServiceMock.buscarPorEmailComAutorizacao.mockResolvedValue(null);

    await expect(
      service.login('inexistente@sistema.com', 'senha'),
    ).rejects.toThrow(new UnauthorizedException('E-mail ou senha inválidos'));

    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
  });

  it('deve rejeitar usuário inativo', async () => {
    usuariosServiceMock.buscarPorEmailComAutorizacao.mockResolvedValue({
      id: 'usuario-1',
      nome: 'Usuário Inativo',
      email: 'inativo@sistema.com',
      senha: 'senha-criptografada',
      tipo: 'USUARIO_EMPRESA',
      ativo: false,
      empresaId: 'empresa-1',
      perfis: [],
    });

    await expect(service.login('inativo@sistema.com', 'senha')).rejects.toThrow(
      new UnauthorizedException('Usuário inativo'),
    );

    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
  });

  it('deve rejeitar senha inválida', async () => {
    usuariosServiceMock.buscarPorEmailComAutorizacao.mockResolvedValue({
      id: 'usuario-1',
      nome: 'Usuário Teste',
      email: 'teste@sistema.com',
      senha: 'senha-criptografada',
      tipo: 'USUARIO_EMPRESA',
      ativo: true,
      empresaId: 'empresa-1',
      perfis: [],
    });

    jest.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(
      service.login('teste@sistema.com', 'senha-incorreta'),
    ).rejects.toThrow(new UnauthorizedException('E-mail ou senha inválidos'));

    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
  });
});
