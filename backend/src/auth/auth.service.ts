import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service';
import type { JwtPayload } from './types/jwt-payload.type';

/**
 * Código estável do bloqueio de login por e-mail não confirmado (V3.6.5, E4).
 * O frontend distingue o estado por este código, nunca pelo texto da mensagem.
 */
export const CODIGO_EMAIL_NAO_VERIFICADO = 'EMAIL_NAO_VERIFICADO';

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

    // V3.6.5 / E4 — conta com e-mail não confirmado não recebe token.
    //
    // A verificação vem DEPOIS da senha de propósito: nenhum estado da conta é
    // revelado a quem não provou conhecer a credencial, então a resposta
    // continua genérica e não abre um vetor de enumeração de e-mails.
    //
    // Fail-closed: somente `emailVerificado === true` prossegue. Usuários
    // legados são compatíveis porque a migration aprovada define
    // `emailVerificado Boolean @default(true)`.
    if (!usuario.emailVerificado) {
      throw new ForbiddenException({
        error: CODIGO_EMAIL_NAO_VERIFICADO,
        message: 'Confirme seu e-mail antes de acessar o sistema.',
      });
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
      trocaSenhaObrigatoria: usuario.trocaSenhaObrigatoria,
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
        trocaSenhaObrigatoria: usuario.trocaSenhaObrigatoria,
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
