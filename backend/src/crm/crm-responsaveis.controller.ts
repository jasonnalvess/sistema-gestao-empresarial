import { Controller, Get, UseGuards } from '@nestjs/common';
import { Permissoes } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmpresaAtual } from '../common/decorators/empresa-atual.decorator';
import { ModuloAtivo } from '../common/decorators/modulo-ativo.decorator';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import { ModuloAtivoGuard } from '../common/guards/modulo-ativo.guard';
import type { EmpresaContexto } from '../common/types/empresa-contexto.type';
import { CrmOportunidadesService } from './crm-oportunidades.service';

@Controller('crm/responsaveis')
@ModuloAtivo('crm')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
  EmpresaContextoGuard,
  ModuloAtivoGuard,
  PermissionsGuard,
)
export class CrmResponsaveisController {
  constructor(private readonly service: CrmOportunidadesService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('crm.visualizar')
  listar(@EmpresaAtual() empresa: EmpresaContexto) {
    return this.service.listarResponsaveis(empresa.empresaId);
  }
}
