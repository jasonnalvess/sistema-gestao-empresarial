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
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PaginacaoDto } from '../common/dto/paginacao.dto';

import { UnidadesMedidaService } from './unidades-medida.service';
import { AtualizarUnidadeMedidaDto } from './dto/atualizar-unidade-medida.dto';
import { CriarUnidadeMedidaDto } from './dto/criar-unidade-medida.dto';

@Controller('unidades-medida')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UnidadesMedidaController {
  constructor(private readonly unidadesMedidaService: UnidadesMedidaService) {}

  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  criar(
    @Body() body: CriarUnidadeMedidaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.unidadesMedidaService.criar(body, usuario);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(
    @CurrentUser() usuario: AuthenticatedUser,
    @Query() paginacao: PaginacaoDto,
  ) {
    return this.unidadesMedidaService.listar(usuario, paginacao);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  buscarPorId(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.unidadesMedidaService.buscarPorId(id, usuario);
  }

  @Patch(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarUnidadeMedidaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.unidadesMedidaService.atualizar(id, body, usuario);
  }

  @Patch(':id/ativar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  ativar(@Param('id') id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.unidadesMedidaService.ativar(id, usuario);
  }

  @Patch(':id/desativar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  desativar(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.unidadesMedidaService.desativar(id, usuario);
  }
}
