import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { Permissoes } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmpresaAtual } from '../common/decorators/empresa-atual.decorator';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import type { EmpresaContexto } from '../common/types/empresa-contexto.type';

import { AuditoriaService } from './auditoria.service';
import { FiltroAuditoriaDto } from './dto/filtro-auditoria.dto';
import { FiltroAuditoriaGlobalDto } from './dto/filtro-auditoria-global.dto';

@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, EmpresaContextoGuard)
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('auditoria.empresa.visualizar')
  listarEmpresa(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Query() filtros: FiltroAuditoriaDto,
  ) {
    return this.auditoriaService.listarEmpresa(empresa.empresaId, filtros);
  }

  @Get('global')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  @Permissoes('sistema.auditoria.visualizar')
  listarGlobal(@Query() filtros: FiltroAuditoriaGlobalDto) {
    return this.auditoriaService.listarGlobal(filtros);
  }
}
