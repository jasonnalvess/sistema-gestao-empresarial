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
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { EmpresaAtual } from '../common/decorators/empresa-atual.decorator';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import type { EmpresaContexto } from '../common/types/empresa-contexto.type';

import { OrdensServicoService } from './ordens-servico.service';
import { AlterarStatusOrdemServicoDto } from './dto/alterar-status-ordem-servico.dto';
import { CriarOrdemServicoDto } from './dto/criar-ordem-servico.dto';
import { CriarOrdemServicoHistoricoDto } from './dto/criar-ordem-servico-historico.dto';
import { FiltroOrdensServicoDto } from './dto/filtro-ordens-servico.dto';

@Controller('ordens-servico')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, EmpresaContextoGuard)
export class OrdensServicoController {
  constructor(private readonly ordensServicoService: OrdensServicoService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('ordens_servico.criar')
  criar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Body() body: CriarOrdemServicoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.ordensServicoService.criar(empresa.empresaId, usuario.id, body);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('ordens_servico.visualizar')
  listar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Query() paginacao: FiltroOrdensServicoDto,
  ) {
    return this.ordensServicoService.listar(empresa.empresaId, paginacao);
  }

  @Post(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('ordens_servico.historico.adicionar')
  adicionarHistorico(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: CriarOrdemServicoHistoricoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.ordensServicoService.adicionarHistorico(
      empresa.empresaId,
      id,
      usuario.id,
      body,
    );
  }

  @Get(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('ordens_servico.visualizar')
  listarHistorico(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
  ) {
    return this.ordensServicoService.listarHistorico(empresa.empresaId, id);
  }

  @Patch(':id/status')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('ordens_servico.status.alterar')
  alterarStatus(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: AlterarStatusOrdemServicoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.ordensServicoService.alterarStatus(
      empresa.empresaId,
      id,
      usuario.id,
      body,
    );
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('ordens_servico.visualizar')
  buscarPorId(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
  ) {
    return this.ordensServicoService.buscarPorId(empresa.empresaId, id);
  }
}
