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
import { ModuloAtivo } from '../common/decorators/modulo-ativo.decorator';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import { ModuloAtivoGuard } from '../common/guards/modulo-ativo.guard';
import type { EmpresaContexto } from '../common/types/empresa-contexto.type';
import { CrmOportunidadesService } from './crm-oportunidades.service';
import { AtualizarCrmOportunidadeDto } from './dto/atualizar-crm-oportunidade.dto';
import { CriarCrmOportunidadeDto } from './dto/criar-crm-oportunidade.dto';
import { FiltroCrmOportunidadesDto } from './dto/filtro-crm-oportunidades.dto';
import { MovimentarCrmOportunidadeDto } from './dto/movimentar-crm-oportunidade.dto';
import { ReabrirCrmOportunidadeDto } from './dto/reabrir-crm-oportunidade.dto';
import { DesvincularVendaCrmOportunidadeDto } from './dto/desvincular-venda-crm-oportunidade.dto';
import { VincularVendaCrmOportunidadeDto } from './dto/vincular-venda-crm-oportunidade.dto';

@Controller('crm/oportunidades')
@ModuloAtivo('crm')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
  EmpresaContextoGuard,
  ModuloAtivoGuard,
  PermissionsGuard,
)
export class CrmOportunidadesController {
  constructor(private readonly service: CrmOportunidadesService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('crm.oportunidades.criar')
  criar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() body: CriarCrmOportunidadeDto,
  ) {
    return this.service.criar(empresa.empresaId, usuario.id, body);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('crm.visualizar')
  listar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Query() filtro: FiltroCrmOportunidadesDto,
  ) {
    return this.service.listar(empresa.empresaId, filtro);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('crm.visualizar')
  buscarPorId(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
  ) {
    return this.service.buscarPorId(empresa.empresaId, id);
  }

  @Patch(':id/movimentar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('crm.oportunidades.movimentar')
  movimentar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() body: MovimentarCrmOportunidadeDto,
  ) {
    return this.service.movimentar(empresa.empresaId, id, usuario.id, body);
  }

  @Patch(':id/reabrir')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('crm.oportunidades.movimentar')
  reabrir(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() body: ReabrirCrmOportunidadeDto,
  ) {
    return this.service.reabrir(empresa.empresaId, id, usuario.id, body);
  }

  @Patch(':id/venda/desvincular')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('crm.oportunidades.editar')
  desvincularVenda(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() body: DesvincularVendaCrmOportunidadeDto,
  ) {
    return this.service.desvincularVenda(
      empresa.empresaId,
      id,
      usuario.id,
      body,
    );
  }

  @Patch(':id/venda')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('crm.oportunidades.editar', 'vendas.visualizar')
  vincularVenda(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() body: VincularVendaCrmOportunidadeDto,
  ) {
    return this.service.vincularVenda(empresa.empresaId, id, usuario.id, body);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('crm.oportunidades.editar')
  atualizar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() body: AtualizarCrmOportunidadeDto,
  ) {
    return this.service.atualizar(empresa.empresaId, id, usuario.id, body);
  }
}
