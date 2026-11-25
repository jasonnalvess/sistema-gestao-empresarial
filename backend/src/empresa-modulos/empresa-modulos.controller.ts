import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { EmpresaAtual } from '../common/decorators/empresa-atual.decorator';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import type { EmpresaContexto } from '../common/types/empresa-contexto.type';
import { VincularEmpresaModuloDto } from './dto/vincular-empresa-modulo.dto';
import { EmpresaModulosService } from './empresa-modulos.service';

@Controller('empresa-modulos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmpresaModulosController {
  constructor(private readonly empresaModulosService: EmpresaModulosService) {}

  @Post()
  @Roles('SUPER_ADMIN')
  vincular(@Body() body: VincularEmpresaModuloDto) {
    return this.empresaModulosService.vincular(body.empresaId, body.moduloId);
  }

  @Get('me')
  @UseGuards(EmpresaContextoGuard)
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listarAtivosDaEmpresa(@EmpresaAtual() empresa: EmpresaContexto) {
    return this.empresaModulosService.listarAtivosDaEmpresa(empresa.empresaId);
  }

  @Get('empresa/:empresaId')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  listarPorEmpresa(
    @Param('empresaId') empresaId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.empresaModulosService.listarPorEmpresa(empresaId, usuario);
  }

  @Patch(':id/ativar')
  @Roles('SUPER_ADMIN')
  ativar(@Param('id') id: string) {
    return this.empresaModulosService.ativar(id);
  }

  @Patch(':id/desativar')
  @Roles('SUPER_ADMIN')
  desativar(@Param('id') id: string) {
    return this.empresaModulosService.desativar(id);
  }
}
