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

import { CaixasService } from './caixas.service';

import { CriarCaixaDto } from './dto/criar-caixa.dto';
import { AtualizarCaixaDto } from './dto/atualizar-caixa.dto';
import { AbrirCaixaDto } from './dto/abrir-caixa.dto';
import { FecharCaixaDto } from './dto/fechar-caixa.dto';
import { CriarMovimentacaoCaixaDto } from './dto/criar-movimentacao-caixa.dto';
import { FiltroCaixasDto } from './dto/filtro-caixas.dto';
import { FiltroMovimentacoesCaixaDto } from './dto/filtro-movimentacoes-caixa.dto';
import { FiltroResumoCaixasDto } from './dto/filtro-resumo-caixas.dto';
import { FiltroAberturasCaixaDto } from './dto/filtro-aberturas-caixa.dto';

@Controller('caixas')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, EmpresaContextoGuard)
export class CaixasController {
  constructor(private readonly caixasService: CaixasService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('caixa.criar')
  criar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Body() body: CriarCaixaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.caixasService.criar(empresa.empresaId, usuario.id, body);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('caixa.visualizar')
  listar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Query() filtros: FiltroCaixasDto,
  ) {
    return this.caixasService.listar(empresa.empresaId, filtros);
  }

  @Get('resumo/geral')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('caixa.visualizar')
  resumo(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Query() filtros: FiltroResumoCaixasDto,
  ) {
    return this.caixasService.resumo(empresa.empresaId, filtros);
  }

  @Get('movimentacoes/listar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('caixa.visualizar')
  listarMovimentacoes(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Query() filtros: FiltroMovimentacoesCaixaDto,
  ) {
    return this.caixasService.listarMovimentacoes(empresa.empresaId, filtros);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('caixa.visualizar')
  buscarPorId(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
  ) {
    return this.caixasService.buscarPorId(empresa.empresaId, id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('caixa.editar')
  atualizar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: AtualizarCaixaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.caixasService.atualizar(
      empresa.empresaId,
      id,
      usuario.id,
      body,
    );
  }

  @Post(':id/abrir')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('caixa.abrir')
  abrir(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: AbrirCaixaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.caixasService.abrir(empresa.empresaId, id, usuario.id, body);
  }

  @Post(':id/fechar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('caixa.fechar')
  fechar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: FecharCaixaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.caixasService.fechar(empresa.empresaId, id, usuario.id, body);
  }

  @Get(':id/abertura')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('caixa.visualizar')
  aberturaAtual(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
  ) {
    return this.caixasService.buscarAberturaAtiva(empresa.empresaId, id);
  }

  @Get(':id/aberturas')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('caixa.visualizar')
  listarAberturas(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Query() filtros: FiltroAberturasCaixaDto,
  ) {
    return this.caixasService.listarAberturas(empresa.empresaId, id, filtros);
  }

  @Post(':id/movimentacoes')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('caixa.movimentacoes.registrar')
  movimentar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: CriarMovimentacaoCaixaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.caixasService.criarMovimentacao(
      empresa.empresaId,
      id,
      usuario.id,
      body,
    );
  }
}
