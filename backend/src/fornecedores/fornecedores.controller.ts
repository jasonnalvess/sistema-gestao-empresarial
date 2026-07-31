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

import { FornecedoresService } from './fornecedores.service';
import { AtualizarFornecedorDto } from './dto/atualizar-fornecedor.dto';
import { CriarFornecedorDto } from './dto/criar-fornecedor.dto';
import { CriarFornecedorHistoricoDto } from './dto/criar-fornecedor-historico.dto';
import { FiltroFornecedoresDto } from './dto/filtro-fornecedores.dto';

@Controller('fornecedores')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class FornecedoresController {
  constructor(private readonly fornecedoresService: FornecedoresService) {}

  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('fornecedores.criar')
  criar(
    @Body() body: CriarFornecedorDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.fornecedoresService.criar(body, usuario);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('fornecedores.visualizar')
  listar(
    @Query() filtros: FiltroFornecedoresDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.fornecedoresService.listar(usuario, filtros);
  }

  @Post(':id/historico')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('fornecedores.editar')
  adicionarHistorico(
    @Param('id') id: string,
    @Body() body: CriarFornecedorHistoricoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.fornecedoresService.adicionarHistorico(id, body, usuario);
  }

  @Get(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('fornecedores.visualizar')
  listarHistorico(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.fornecedoresService.listarHistorico(id, usuario);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('fornecedores.visualizar')
  buscarPorId(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.fornecedoresService.buscarPorId(id, usuario);
  }

  @Patch(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('fornecedores.editar')
  atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarFornecedorDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.fornecedoresService.atualizar(id, body, usuario);
  }

  @Patch(':id/ativar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('fornecedores.ativar')
  ativar(@Param('id') id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.fornecedoresService.ativar(id, usuario);
  }

  @Patch(':id/desativar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('fornecedores.inativar')
  desativar(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.fornecedoresService.desativar(id, usuario);
  }
}
