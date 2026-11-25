import {
  Body,
  Post,
  Patch,
  Put,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CriarPerfilDto } from './dto/criar-perfil.dto';
import { EditarPerfilDto } from './dto/editar-perfil.dto';
import { ConfigurarPermissoesDto } from './dto/configurar-permissoes.dto';
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

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  @Permissoes('perfis.criar')
  @UseGuards(EmpresaContextoGuard)
  criar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @CurrentUser() ator: AuthenticatedUser,
    @Body() dados: CriarPerfilDto,
  ) {
    return this.service.criar(empresa.empresaId, ator, dados);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  @Permissoes('perfis.editar')
  @UseGuards(EmpresaContextoGuard)
  editar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @CurrentUser() ator: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dados: EditarPerfilDto,
  ) {
    return this.service.editar(empresa.empresaId, ator, id, dados);
  }

  @Patch(':id/ativar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  @Permissoes('perfis.ativar')
  @UseGuards(EmpresaContextoGuard)
  ativar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @CurrentUser() ator: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.alterarAtivo(empresa.empresaId, ator, id, true);
  }

  @Patch(':id/inativar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  @Permissoes('perfis.inativar')
  @UseGuards(EmpresaContextoGuard)
  inativar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @CurrentUser() ator: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.alterarAtivo(empresa.empresaId, ator, id, false);
  }

  @Put(':id/permissoes')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  @Permissoes('perfis.permissoes.gerenciar')
  @UseGuards(EmpresaContextoGuard)
  configurarPermissoes(
    @EmpresaAtual() empresa: EmpresaContexto,
    @CurrentUser() ator: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dados: ConfigurarPermissoesDto,
  ) {
    return this.service.configurarPermissoes(
      empresa.empresaId,
      ator,
      id,
      dados,
    );
  }
}
