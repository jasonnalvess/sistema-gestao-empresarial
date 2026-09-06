import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Permissoes } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PermissoesService } from './permissoes.service';
import { FiltroPermissoesDto } from './dto/filtro-permissoes.dto';

@Controller('permissoes')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
@Permissoes('perfis.visualizar')
export class PermissoesController {
  constructor(private readonly service: PermissoesService) {}

  @Get()
  listar(@Query() filtros: FiltroPermissoesDto) {
    return this.service.listar(filtros);
  }
}
