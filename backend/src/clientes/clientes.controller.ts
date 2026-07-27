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
import { ClientesService } from './clientes.service';
import { AtualizarClienteDto } from './dto/atualizar-cliente.dto';
import { CriarClienteHistoricoDto } from './dto/criar-cliente-historico.dto';
import { CriarClienteDto } from './dto/criar-cliente.dto';
import { FiltroClientesDto } from './dto/filtro-clientes.dto';

@Controller('clientes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  criar(
    @Body() body: CriarClienteDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.clientesService.criar(body, usuario);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(
    @CurrentUser() usuario: AuthenticatedUser,
    @Query() paginacao: FiltroClientesDto,
  ) {
    return this.clientesService.listar(usuario, paginacao);
  }

  @Post(':id/historico')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  adicionarHistorico(
    @Param('id') id: string,
    @Body() body: CriarClienteHistoricoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.clientesService.adicionarHistorico(id, body, usuario);
  }

  @Get(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listarHistorico(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.clientesService.listarHistorico(id, usuario);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  buscarPorId(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.clientesService.buscarPorId(id, usuario);
  }

  @Patch(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarClienteDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.clientesService.atualizar(id, body, usuario);
  }

  @Patch(':id/ativar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  ativar(@Param('id') id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.clientesService.ativar(id, usuario);
  }

  @Patch(':id/desativar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  desativar(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.clientesService.desativar(id, usuario);
  }
}
