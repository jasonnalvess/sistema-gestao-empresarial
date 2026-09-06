import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Permissoes } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { EmpresaAtual } from '../common/decorators/empresa-atual.decorator';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import type { EmpresaContexto } from '../common/types/empresa-contexto.type';
import { PerfisService } from './perfis.service';
import { FiltroPerfisDto } from './dto/filtro-perfis.dto';

@Controller('perfis')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Permissoes('perfis.visualizar')
export class PerfisController {
  constructor(private readonly service: PerfisService) {}

  @Get('globais')
  @Roles('SUPER_ADMIN')
  listarGlobais(@Query() filtros: FiltroPerfisDto) {
    return this.service.listarGlobais(filtros);
  }

  @Get('globais/:id')
  @Roles('SUPER_ADMIN')
  buscarGlobal(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.buscarGlobal(id);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  @UseGuards(EmpresaContextoGuard)
  listar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Query() filtros: FiltroPerfisDto,
  ) {
    return this.service.listar(empresa.empresaId, filtros);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  @UseGuards(EmpresaContextoGuard)
  buscar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.buscar(empresa.empresaId, id);
  }
}
