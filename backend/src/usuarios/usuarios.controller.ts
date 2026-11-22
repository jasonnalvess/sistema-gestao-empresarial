import { AtualizarPerfisUsuarioDto } from './dto/atualizar-perfis-usuario.dto';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Headers,
  Param,
  ParseUUIDPipe,
  Put,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissoes } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { EMPRESA_ID_HEADER } from '../common/constants/empresa-contexto.constants';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PaginacaoDto } from '../common/dto/paginacao.dto';
import { AtualizarUsuarioDto } from './dto/atualizar-usuario.dto';
import { CriarUsuarioDto } from './dto/criar-usuario.dto';
import { RedefinirSenhaManualDto } from './dto/redefinir-senha-manual.dto';
import { UsuariosService } from './usuarios.service';
import { RecoveryService } from '../auth/recovery.service';
import { RateLimitService } from '../common/services/rate-limit.service';
import { IpUtil } from '../common/utils/ip.util';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class UsuariosController {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly recoveryService: RecoveryService,
    private readonly rateLimitService: RateLimitService,
    private readonly ipUtil: IpUtil,
  ) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  @Permissoes('usuarios.criar')
  criar(
    @Body() body: CriarUsuarioDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.usuariosService.criar(body, usuario);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  @Permissoes('usuarios.visualizar')
  listar(
    @CurrentUser() usuario: AuthenticatedUser,
    @Query() paginacao: PaginacaoDto,
    @Headers(EMPRESA_ID_HEADER) empresaSelecionada?: string,
  ) {
    return this.usuariosService.listar(usuario, paginacao, empresaSelecionada);
  }

  @Get(':id/perfis')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  @Permissoes('usuarios.perfis.gerenciar')
  listarPerfis(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.usuariosService.listarPerfis(id, usuario);
  }

  @Put(':id/perfis')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  @Permissoes('usuarios.perfis.gerenciar')
  atualizarPerfis(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AtualizarPerfisUsuarioDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.usuariosService.atualizarPerfis(id, body, usuario);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  @Permissoes('usuarios.visualizar')
  buscarPorId(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.usuariosService.buscarPorId(id, usuario);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  @Permissoes('usuarios.editar')
  atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarUsuarioDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.usuariosService.atualizar(id, body, usuario);
  }

  @Patch(':id/ativar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  @Permissoes('usuarios.ativar')
  ativar(@Param('id') id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.usuariosService.ativar(id, usuario);
  }

  @Patch(':id/desativar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  @Permissoes('usuarios.inativar')
  desativar(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.usuariosService.desativar(id, usuario);
  }

  @Post(':id/redefinir-senha')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  @Permissoes('usuarios.editar')
  async redefinirSenhaAdministrativa(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @Req() req: Request,
  ) {
    // Sem IP confiável do ingresso, a requisição é recusada antes do rate
    // limit para não compartilhar o bucket de loopback/0.0.0.0. Com IP válido,
    // o rate limit (getRealIp) resolve o mesmo valor usado na auditoria.
    const ip = this.ipUtil.getTrustedIp(req);
    if (!ip) {
      throw new ForbiddenException('Origem da requisição não verificada.');
    }

    await this.rateLimitService.checkLimit(req, 'auth/redefinir-senha-admin');
    await this.recoveryService.solicitarRedefinicaoAdministrativa(
      id,
      usuario.id,
      ip,
    );
    return {
      message:
        'Se o endereço informado estiver cadastrado e puder receber recuperação, você receberá as instruções por e-mail.',
    };
  }

  @Post(':id/redefinir-senha-manual')
  @Roles('SUPER_ADMIN')
  @Header('Cache-Control', 'no-store')
  resetarSenhaManual(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RedefinirSenhaManualDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.usuariosService.resetarSenhaAdministrativaManual(
      id,
      usuario,
      body.versaoAutorizacao,
      this.ipUtil.getTrustedIp(req) ?? undefined,
    );
  }
}
