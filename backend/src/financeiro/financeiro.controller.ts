import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { FinanceiroService } from './financeiro.service';
import { FiltroResumoFinanceiroDto } from './dto/filtro-resumo-financeiro.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('financeiro')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceiroController {
  constructor(
    private readonly financeiroService: FinanceiroService,
  ) {}

  @Get('resumo')
  @Roles(
    'SUPER_ADMIN',
    'ADMIN_EMPRESA',
    'USUARIO_EMPRESA',
  )
  resumo(
    @Query() filtros: FiltroResumoFinanceiroDto,
    @Req() req: any,
  ) {
    return this.financeiroService.resumo(
      req.user,
      filtros,
    );
  }
}
