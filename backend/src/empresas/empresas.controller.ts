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
import { Permissoes } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AtualizarEmpresaDto } from './dto/atualizar-empresa.dto';
import { CriarEmpresaDto } from './dto/criar-empresa.dto';
import { EmpresasService } from './empresas.service';

@Controller('empresas')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  @Post()
  @Roles('SUPER_ADMIN')
  @Permissoes('empresas.criar')
  criar(@Body() body: CriarEmpresaDto) {
    return this.empresasService.criar(body);
  }

  @Get()
  @Permissoes('empresas.visualizar')
  listar(@CurrentUser() usuario: AuthenticatedUser) {
    return this.empresasService.listar(usuario);
  }

  @Get(':id')
  @Permissoes('empresas.visualizar')
  buscarPorId(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.empresasService.buscarPorId(id, usuario);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  @Permissoes('empresas.editar')
  atualizar(@Param('id') id: string, @Body() body: AtualizarEmpresaDto) {
    return this.empresasService.atualizar(id, body);
  }

  @Patch(':id/ativar')
  @Roles('SUPER_ADMIN')
  @Permissoes('empresas.ativar')
  ativar(@Param('id') id: string) {
    return this.empresasService.ativar(id);
  }

  @Patch(':id/desativar')
  @Roles('SUPER_ADMIN')
  @Permissoes('empresas.inativar')
  desativar(@Param('id') id: string) {
    return this.empresasService.desativar(id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @Permissoes('empresas.excluir')
  excluir(@Param('id') id: string) {
    return this.empresasService.excluir(id);
  }
}
