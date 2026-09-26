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
import { Permissoes } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaginacaoDto } from '../common/dto/paginacao.dto';
import { EmpresaAtual } from '../common/decorators/empresa-atual.decorator';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import type { EmpresaContexto } from '../common/types/empresa-contexto.type';
import { UnidadesMedidaService } from './unidades-medida.service';
import { AtualizarUnidadeMedidaDto } from './dto/atualizar-unidade-medida.dto';
import { CriarUnidadeMedidaDto } from './dto/criar-unidade-medida.dto';

@Controller('unidades-medida')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, EmpresaContextoGuard)
export class UnidadesMedidaController {
  constructor(private readonly unidadesMedidaService: UnidadesMedidaService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.unidades.criar')
  criar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Body() body: CriarUnidadeMedidaDto,
  ) {
    return this.unidadesMedidaService.criar(empresa.empresaId, body);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.unidades.visualizar')
  listar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Query() paginacao: PaginacaoDto,
  ) {
    return this.unidadesMedidaService.listar(empresa.empresaId, paginacao);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.unidades.visualizar')
  buscarPorId(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
  ) {
    return this.unidadesMedidaService.buscarPorId(empresa.empresaId, id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.unidades.editar')
  atualizar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: AtualizarUnidadeMedidaDto,
  ) {
    return this.unidadesMedidaService.atualizar(empresa.empresaId, id, body);
  }

  @Patch(':id/ativar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.unidades.editar')
  ativar(@EmpresaAtual() empresa: EmpresaContexto, @Param('id') id: string) {
    return this.unidadesMedidaService.ativar(empresa.empresaId, id);
  }

  @Patch(':id/desativar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.unidades.editar')
  desativar(@EmpresaAtual() empresa: EmpresaContexto, @Param('id') id: string) {
    return this.unidadesMedidaService.desativar(empresa.empresaId, id);
  }
}
