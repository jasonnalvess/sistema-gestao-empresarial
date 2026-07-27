import {
  Body,
  Controller,
  Delete,
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
import { AtualizarEmpresaDto } from './dto/atualizar-empresa.dto';
import { CriarEmpresaDto } from './dto/criar-empresa.dto';
import { EmpresasService } from './empresas.service';

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
  listar(@CurrentUser() usuario: AuthenticatedUser) {
    return this.empresasService.listar(usuario);
  }

  @Get(':id')
  buscarPorId(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.empresasService.buscarPorId(id, usuario);
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
