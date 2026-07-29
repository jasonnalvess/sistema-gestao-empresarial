import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissoes } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PaginacaoDto } from '../common/dto/paginacao.dto';
import { AtualizarUsuarioDto } from './dto/atualizar-usuario.dto';
import { CriarUsuarioDto } from './dto/criar-usuario.dto';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

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
  ) {
    return this.usuariosService.listar(usuario, paginacao);
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
}
