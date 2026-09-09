import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { Permissoes } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmpresaAtual } from '../common/decorators/empresa-atual.decorator';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import type { EmpresaContexto } from '../common/types/empresa-contexto.type';

import { FinanceiroService } from './financeiro.service';
import { FiltroResumoFinanceiroDto } from './dto/filtro-resumo-financeiro.dto';

@Controller('financeiro')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, EmpresaContextoGuard)
export class FinanceiroController {
  constructor(private readonly financeiroService: FinanceiroService) {}

  @Get('resumo')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('financeiro.visualizar')
  resumo(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Query() filtros: FiltroResumoFinanceiroDto,
  ) {
    return this.financeiroService.resumo(empresa.empresaId, filtros);
  }
}
