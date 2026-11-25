import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissoes } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { EmpresaAtual } from '../common/decorators/empresa-atual.decorator';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import type { EmpresaContexto } from '../common/types/empresa-contexto.type';

import { FornecedoresService } from './fornecedores.service';
import { AtualizarFornecedorDto } from './dto/atualizar-fornecedor.dto';
import { CriarFornecedorDto } from './dto/criar-fornecedor.dto';
import { CriarFornecedorHistoricoDto } from './dto/criar-fornecedor-historico.dto';
import { FiltroFornecedoresDto } from './dto/filtro-fornecedores.dto';

@Controller('fornecedores')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, EmpresaContextoGuard)
export class FornecedoresController {
  constructor(private readonly fornecedoresService: FornecedoresService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('fornecedores.criar')
  criar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Body() body: CriarFornecedorDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.fornecedoresService.criar(empresa.empresaId, body, usuario);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('fornecedores.visualizar')
  listar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Query() filtros: FiltroFornecedoresDto,
  ) {
    return this.fornecedoresService.listar(empresa.empresaId, filtros);
  }

  @Post(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('fornecedores.editar')
  adicionarHistorico(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: CriarFornecedorHistoricoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.fornecedoresService.adicionarHistorico(
      empresa.empresaId,
      id,
      body,
      usuario,
    );
  }

  @Get(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('fornecedores.visualizar')
  listarHistorico(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
  ) {
    return this.fornecedoresService.listarHistorico(empresa.empresaId, id);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('fornecedores.visualizar')
  buscarPorId(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
  ) {
    return this.fornecedoresService.buscarPorId(empresa.empresaId, id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('fornecedores.editar')
  atualizar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: AtualizarFornecedorDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.fornecedoresService.atualizar(
      empresa.empresaId,
      id,
      body,
      usuario,
    );
  }

  @Patch(':id/ativar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('fornecedores.editar')
  ativar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.fornecedoresService.ativar(empresa.empresaId, id, usuario);
  }

  @Patch(':id/desativar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('fornecedores.editar')
  desativar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.fornecedoresService.desativar(empresa.empresaId, id, usuario);
  }
}
