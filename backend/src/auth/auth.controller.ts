import { PermitirTrocaPendente } from './guards/troca-senha-obrigatoria.guard';
import { TrocarSenhaDto } from './dto/trocar-senha.dto';
import { EsqueciSenhaDto, RedefinirSenhaDto } from './dto/recovery.dto';
import { TrocaSenhaService } from './troca-senha.service';
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RecoveryService } from './recovery.service';
import { RateLimitService } from '../common/services/rate-limit.service';
import type { AuthenticatedUser } from './types/authenticated-user.type';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly trocaSenhaService: TrocaSenhaService,
    private readonly recoveryService: RecoveryService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.senha);
  }

  @Post('esqueci-senha')
  async esqueciSenha(@Body() body: EsqueciSenhaDto, @Req() req: Request) {
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) ||
      req.socket.remoteAddress;
    await this.rateLimitService.checkLimit(req, 'auth/esqueci-senha');
    await this.recoveryService.solicitarRecuperacao(body.email, ip);
    return {
      message:
        'Se o endereço informado estiver cadastrado e puder receber recuperação, você receberá as instruções por e-mail.',
    };
  }

  @Post('redefinir-senha')
  async redefinirSenha(@Body() body: RedefinirSenhaDto, @Req() req: Request) {
    if (body.novaSenha !== body.confirmarSenha) {
      throw new BadRequestException('As senhas não coincidem.');
    }
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) ||
      req.socket.remoteAddress;
    await this.recoveryService.redefinirSenha(body.token, body.novaSenha, ip);
    return {
      message: 'Senha redefinida com sucesso. Você já pode realizar o login.',
    };
  }

  @UseGuards(JwtAuthGuard)
  @PermitirTrocaPendente()
  @Get('me')
  me(@CurrentUser() usuario: AuthenticatedUser) {
    return usuario;
  }
  @UseGuards(JwtAuthGuard)
  @PermitirTrocaPendente()
  @Post('trocar-senha')
  trocarSenha(
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() dados: TrocarSenhaDto,
  ) {
    return this.trocaSenhaService.trocar(usuario, dados);
  }
}
