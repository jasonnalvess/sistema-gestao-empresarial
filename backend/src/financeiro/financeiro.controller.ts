import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

import { FinanceiroService } from './financeiro.service';
import { FiltroResumoFinanceiroDto } from './dto/filtro-resumo-financeiro.dto';

@Controller('financeiro')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceiroController {
  constructor(private readonly financeiroService: FinanceiroService) {}

  @Get('resumo')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  resumo(
    @Query() filtros: FiltroResumoFinanceiroDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.financeiroService.resumo(usuario, filtros);
  }
}
