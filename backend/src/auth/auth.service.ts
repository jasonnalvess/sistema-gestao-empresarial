import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service';
import type { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, senha: string) {
    const usuario =
      await this.usuariosService.buscarPorEmailComAutorizacao(email);

    if (!usuario) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    if (!usuario.ativo) {
      throw new UnauthorizedException('Usuário inativo');
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    const perfis = [
      ...new Set(usuario.perfis.map((vinculo) => vinculo.perfil.chave)),
    ].sort();

    const permissoes = [
      ...new Set(
        usuario.perfis.flatMap((vinculo) =>
          vinculo.perfil.permissoes.map(
            (perfilPermissao) => perfilPermissao.permissao.chave,
          ),
        ),
      ),
    ].sort();

    const payload = {
      versaoAutorizacao: usuario.versaoAutorizacao,
      id: usuario.id,
      email: usuario.email,
      tipo: usuario.tipo,
      empresaId: usuario.empresaId,
      perfis,
      permissoes,
    } satisfies JwtPayload;

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      access_token: accessToken,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
        empresaId: usuario.empresaId,
        perfis,
        permissoes,
      },
    };
  }
}
