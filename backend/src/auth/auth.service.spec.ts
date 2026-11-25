import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { AuthService, CODIGO_EMAIL_NAO_VERIFICADO } from './auth.service';

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
      emailVerificado: true,
      versaoAutorizacao: 7,
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
      versaoAutorizacao: 7,
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

  describe('verificação de e-mail (V3.6.5 / E4)', () => {
    const usuarioComEmail = (emailVerificado: boolean) => ({
      id: 'usuario-1',
      nome: 'Usuário Teste',
      email: 'teste@sistema.com',
      senha: 'senha-criptografada',
      tipo: 'USUARIO_EMPRESA',
      ativo: true,
      emailVerificado,
      trocaSenhaObrigatoria: false,
      versaoAutorizacao: 0,
      empresaId: 'empresa-1',
      perfis: [],
    });

    const capturarErro = async (
      promessa: Promise<unknown>,
    ): Promise<UnauthorizedException> => {
      try {
        await promessa;
      } catch (erro) {
        return erro as UnauthorizedException;
      }
      throw new Error('Esperava-se falha de autenticação.');
    };

    it('autentica usuário verificado e emite token', async () => {
      usuariosServiceMock.buscarPorEmailComAutorizacao.mockResolvedValue(
        usuarioComEmail(true),
      );
      jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
      jwtServiceMock.signAsync.mockResolvedValue('token-jwt');

      const resultado = await service.login(
        'teste@sistema.com',
        'senha-correta',
      );

      expect(jwtServiceMock.signAsync).toHaveBeenCalledTimes(1);
      expect(resultado.access_token).toBe('token-jwt');
    });

    it('bloqueia usuário não verificado sem emitir token', async () => {
      usuariosServiceMock.buscarPorEmailComAutorizacao.mockResolvedValue(
        usuarioComEmail(false),
      );
      jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

      await expect(
        service.login('teste@sistema.com', 'senha-correta'),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
    });

    it('informa o código estável de e-mail não verificado', async () => {
      usuariosServiceMock.buscarPorEmailComAutorizacao.mockResolvedValue(
        usuarioComEmail(false),
      );
      jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

      await expect(
        service.login('teste@sistema.com', 'senha-correta'),
      ).rejects.toMatchObject({
        response: {
          error: CODIGO_EMAIL_NAO_VERIFICADO,
          message: 'Confirme seu e-mail antes de acessar o sistema.',
        },
      });
    });

    it('preserva usuário antigo, verificado pelo default da migration', async () => {
      usuariosServiceMock.buscarPorEmailComAutorizacao.mockResolvedValue({
        ...usuarioComEmail(true),
        versaoAutorizacao: 0,
        perfis: [],
      });
      jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
      jwtServiceMock.signAsync.mockResolvedValue('token-jwt');

      await expect(
        service.login('teste@sistema.com', 'senha-correta'),
      ).resolves.toMatchObject({ access_token: 'token-jwt' });

      // O formato do JWT permanece inalterado: `emailVerificado` não entra no
      // payload — a autoridade continua sendo o banco na `JwtStrategy`.
      expect(jwtServiceMock.signAsync).toHaveBeenCalledWith({
        trocaSenhaObrigatoria: false,
        versaoAutorizacao: 0,
        id: 'usuario-1',
        email: 'teste@sistema.com',
        tipo: 'USUARIO_EMPRESA',
        empresaId: 'empresa-1',
        perfis: [],
        permissoes: [],
      });
    });

    it('não revela o estado de verificação antes de validar a senha', async () => {
      usuariosServiceMock.buscarPorEmailComAutorizacao.mockResolvedValue(
        usuarioComEmail(false),
      );
      jest.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        service.login('teste@sistema.com', 'senha-errada'),
      ).rejects.toThrow(new UnauthorizedException('E-mail ou senha inválidos'));

      expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
    });

    it('responde igual para senha inválida em conta verificada e não verificada', async () => {
      jest.mocked(bcrypt.compare).mockResolvedValue(false as never);

      usuariosServiceMock.buscarPorEmailComAutorizacao.mockResolvedValueOnce(
        usuarioComEmail(true),
      );
      const verificada = await capturarErro(
        service.login('teste@sistema.com', 'senha-errada'),
      );

      usuariosServiceMock.buscarPorEmailComAutorizacao.mockResolvedValueOnce(
        usuarioComEmail(false),
      );
      const naoVerificada = await capturarErro(
        service.login('teste@sistema.com', 'senha-errada'),
      );

      expect(naoVerificada.getStatus()).toBe(401);
      expect(naoVerificada.getResponse()).toEqual(verificada.getResponse());
      expect(naoVerificada.message).toBe(verificada.message);
    });
  });
});
