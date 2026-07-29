import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('segredo-teste'),
    } as unknown as ConfigService;

    strategy = new JwtStrategy(configService);
  });

  it('deve transformar o payload em usuário autenticado', () => {
    const resultado = strategy.validate({
      id: 'usuario-1',
      email: 'usuario@sistema.com',
      tipo: 'USUARIO_EMPRESA',
      empresaId: 'empresa-1',
      perfis: ['colaborador'],
      permissoes: ['agenda.visualizar', 'clientes.visualizar'],
    });

    expect(resultado).toEqual({
      id: 'usuario-1',
      email: 'usuario@sistema.com',
      tipo: 'USUARIO_EMPRESA',
      empresaId: 'empresa-1',
      perfis: ['colaborador'],
      permissoes: ['agenda.visualizar', 'clientes.visualizar'],
    });
  });
});
