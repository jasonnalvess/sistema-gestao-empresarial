import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FiltroAuditoriaDto } from './dto/filtro-auditoria.dto';

@Controller('auditoria')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  listar(@Req() req: any, @Query() filtros: FiltroAuditoriaDto) {
    return this.auditoriaService.listar(req.user, filtros);
  }
}
