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

import { ContasReceberService } from './contas-receber.service';

import { AtualizarContaReceberDto } from './dto/atualizar-conta-receber.dto';
import { CriarContaReceberDto } from './dto/criar-conta-receber.dto';
import { CriarContaReceberHistoricoDto } from './dto/criar-conta-receber-historico.dto';
import { FiltroContasReceberDto } from './dto/filtro-contas-receber.dto';
import { GerarContaOrdemServicoDto } from './dto/gerar-conta-ordem-servico.dto';
import { RegistrarRecebimentoContaReceberDto } from './dto/registrar-recebimento-conta-receber.dto';

@Controller('contas-receber')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, EmpresaContextoGuard)
export class ContasReceberController {
  constructor(private readonly contasReceberService: ContasReceberService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('financeiro.contas_receber.criar')
  criar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Body() body: CriarContaReceberDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.contasReceberService.criar(empresa.empresaId, body, usuario);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('financeiro.contas_receber.visualizar')
  listar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Query() filtros: FiltroContasReceberDto,
  ) {
    return this.contasReceberService.listar(empresa.empresaId, filtros);
  }

  @Post(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('financeiro.contas_receber.editar')
  adicionarHistorico(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: CriarContaReceberHistoricoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.contasReceberService.adicionarHistorico(
      empresa.empresaId,
      id,
      body,
      usuario,
    );
  }

  @Get(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('financeiro.contas_receber.visualizar')
  listarHistorico(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
  ) {
    return this.contasReceberService.listarHistorico(empresa.empresaId, id);
  }

  @Post(':id/recebimentos')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('financeiro.contas_receber.receber')
  registrarRecebimento(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: RegistrarRecebimentoContaReceberDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.contasReceberService.registrarRecebimento(
      empresa.empresaId,
      id,
      body,
      usuario,
    );
  }

  @Patch(':id/cancelar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('financeiro.contas_receber.cancelar')
  cancelar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.contasReceberService.cancelar(empresa.empresaId, id, usuario);
  }

  @Post('ordem-servico/:ordemServicoId')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('financeiro.contas_receber.criar')
  gerarAPartirOrdemServico(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('ordemServicoId') ordemServicoId: string,
    @Body() body: GerarContaOrdemServicoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.contasReceberService.gerarAPartirOrdemServico(
      empresa.empresaId,
      ordemServicoId,
      body,
      usuario,
    );
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('financeiro.contas_receber.visualizar')
  buscarPorId(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
  ) {
    return this.contasReceberService.buscarPorId(empresa.empresaId, id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('financeiro.contas_receber.editar')
  atualizar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: AtualizarContaReceberDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.contasReceberService.atualizar(
      empresa.empresaId,
      id,
      body,
      usuario,
    );
  }
}
