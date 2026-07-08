import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ModulosService } from './modulos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CriarModuloDto } from './dto/criar-modulo.dto';

@Controller('modulos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModulosController {
  constructor(private readonly modulosService: ModulosService) {}

  @Post()
  @Roles('SUPER_ADMIN')
  criar(@Body() body: CriarModuloDto) {
    return this.modulosService.criar(body);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  listar() {
    return this.modulosService.listar();
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  buscarPorId(@Param('id') id: string) {
    return this.modulosService.buscarPorId(id);
  }

  @Patch(':id/ativar')
  @Roles('SUPER_ADMIN')
  ativar(@Param('id') id: string) {
    return this.modulosService.ativar(id);
  }

  @Patch(':id/desativar')
  @Roles('SUPER_ADMIN')
  desativar(@Param('id') id: string) {
    return this.modulosService.desativar(id);
  }
}
