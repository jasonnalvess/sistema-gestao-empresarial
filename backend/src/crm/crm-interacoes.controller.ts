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
import { CrmInteracoesService } from './crm-interacoes.service';
import { AtualizarClienteInteracaoDto } from './dto/atualizar-cliente-interacao.dto';
import { CriarClienteInteracaoDto } from './dto/criar-cliente-interacao.dto';
import { FiltroClienteInteracoesDto } from './dto/filtro-cliente-interacoes.dto';

@Controller('crm/interacoes')
@ModuloAtivo('crm')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
  EmpresaContextoGuard,
  ModuloAtivoGuard,
  PermissionsGuard,
)
export class CrmInteracoesController {
  constructor(private readonly service: CrmInteracoesService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('crm.interacoes.criar')
  criar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() body: CriarClienteInteracaoDto,
  ) {
    return this.service.criar(empresa.empresaId, usuario.id, body);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('crm.visualizar')
  listar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Query() filtro: FiltroClienteInteracoesDto,
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

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('crm.interacoes.editar')
  atualizar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() body: AtualizarClienteInteracaoDto,
  ) {
    return this.service.atualizar(empresa.empresaId, id, usuario.id, body);
  }
}
