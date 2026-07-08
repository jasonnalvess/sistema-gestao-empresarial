import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { EmpresasService } from './empresas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CriarEmpresaDto } from './dto/criar-empresa.dto';
import { AtualizarEmpresaDto } from './dto/atualizar-empresa.dto';

@Controller('empresas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  @Post()
  @Roles('SUPER_ADMIN')
  criar(@Body() body: CriarEmpresaDto) {
    return this.empresasService.criar(body);
  }

  @Get()
  listar(@Req() req: any) {
    return this.empresasService.listar(req.user);
  }

  @Get(':id')
  buscarPorId(@Param('id') id: string, @Req() req: any) {
    return this.empresasService.buscarPorId(id, req.user);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  atualizar(@Param('id') id: string, @Body() body: AtualizarEmpresaDto) {
    return this.empresasService.atualizar(id, body);
  }

  @Patch(':id/ativar')
  @Roles('SUPER_ADMIN')
  ativar(@Param('id') id: string) {
    return this.empresasService.ativar(id);
  }

  @Patch(':id/desativar')
  @Roles('SUPER_ADMIN')
  desativar(@Param('id') id: string) {
    return this.empresasService.desativar(id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  excluir(@Param('id') id: string) {
    return this.empresasService.excluir(id);
  }
}
