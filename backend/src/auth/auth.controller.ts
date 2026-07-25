import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from './types/authenticated-user.type';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: { email: string; senha: string }) {
    return this.authService.login(body.email, body.senha);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() usuario: AuthenticatedUser) {
    return usuario;
  }
}
