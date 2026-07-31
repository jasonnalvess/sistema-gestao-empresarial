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
import { EmpresaAtual } from '../common/decorators/empresa-atual.decorator';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import type { EmpresaContexto } from '../common/types/empresa-contexto.type';
import { ClientesService } from './clientes.service';
import { AtualizarClienteDto } from './dto/atualizar-cliente.dto';
import { CriarClienteHistoricoDto } from './dto/criar-cliente-historico.dto';
import { CriarClienteDto } from './dto/criar-cliente.dto';
import { FiltroClientesDto } from './dto/filtro-clientes.dto';

@Controller('clientes')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, EmpresaContextoGuard)
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('clientes.criar')
  criar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Body() body: CriarClienteDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.clientesService.criar(empresa.empresaId, body, usuario);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('clientes.visualizar')
  listar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Query() paginacao: FiltroClientesDto,
  ) {
    return this.clientesService.listar(empresa.empresaId, paginacao);
  }

  @Post(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('clientes.editar')
  adicionarHistorico(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: CriarClienteHistoricoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.clientesService.adicionarHistorico(
      empresa.empresaId,
      id,
      body,
      usuario,
    );
  }

  @Get(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('clientes.visualizar')
  listarHistorico(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
  ) {
    return this.clientesService.listarHistorico(empresa.empresaId, id);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('clientes.visualizar')
  buscarPorId(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
  ) {
    return this.clientesService.buscarPorId(empresa.empresaId, id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('clientes.editar')
  atualizar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: AtualizarClienteDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.clientesService.atualizar(empresa.empresaId, id, body, usuario);
  }

  @Patch(':id/ativar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('clientes.editar')
  ativar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.clientesService.ativar(empresa.empresaId, id, usuario);
  }

  @Patch(':id/desativar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('clientes.editar')
  desativar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.clientesService.desativar(empresa.empresaId, id, usuario);
  }
}
