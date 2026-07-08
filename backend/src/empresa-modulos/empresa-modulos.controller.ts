import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { EmpresaModulosService } from './empresa-modulos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { VincularEmpresaModuloDto } from './dto/vincular-empresa-modulo.dto';

@Controller('empresa-modulos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmpresaModulosController {
  constructor(private readonly empresaModulosService: EmpresaModulosService) {}

  @Post()
  @Roles('SUPER_ADMIN')
  vincular(@Body() body: VincularEmpresaModuloDto) {
    return this.empresaModulosService.vincular(body.empresaId, body.moduloId);
  }

  @Get('empresa/:empresaId')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  listarPorEmpresa(@Param('empresaId') empresaId: string, @Req() req: any) {
    return this.empresaModulosService.listarPorEmpresa(empresaId, req.user);
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
