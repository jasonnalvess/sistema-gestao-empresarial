import { PermitirTrocaPendente } from './guards/troca-senha-obrigatoria.guard';
import { TrocarSenhaDto } from './dto/trocar-senha.dto';
import { TrocaSenhaService } from './troca-senha.service';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from './types/authenticated-user.type';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly trocaSenhaService: TrocaSenhaService,
  ) {}

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.senha);
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
