import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissoes } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import { EmpresaAtual } from '../common/decorators/empresa-atual.decorator';
import type { EmpresaContexto } from '../common/types/empresa-contexto.type';
import {
  CriarEstruturaRhDto,
  EditarEstruturaRhDto,
  FiltroEstruturaRhDto,
} from '../cargos/estrutura-rh.dto';
import { DepartamentosService } from './departamentos.service';
@Controller('departamentos')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, EmpresaContextoGuard)
@Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
export class DepartamentosController {
  constructor(private readonly service: DepartamentosService) {}
  @Get()
  @Permissoes('funcionarios.visualizar')
  listar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Query() filtros: FiltroEstruturaRhDto,
  ) {
    return this.service.listar(empresa.empresaId, filtros);
  }
  @Get(':id')
  @Permissoes('funcionarios.visualizar')
  buscar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.buscar(empresa.empresaId, id);
  }
  @Post()
  @Permissoes('funcionarios.estrutura.gerenciar')
  criar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Body() dados: CriarEstruturaRhDto,
  ) {
    return this.service.criar(empresa.empresaId, dados);
  }
  @Patch(':id')
  @Permissoes('funcionarios.estrutura.gerenciar')
  editar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dados: EditarEstruturaRhDto,
  ) {
    return this.service.editar(empresa.empresaId, id, dados);
  }
  @Patch(':id/ativar')
  @Permissoes('funcionarios.estrutura.gerenciar')
  ativar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.alterarAtivo(empresa.empresaId, id, true);
  }
  @Patch(':id/inativar')
  @Permissoes('funcionarios.estrutura.gerenciar')
  inativar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.alterarAtivo(empresa.empresaId, id, false);
  }
}
