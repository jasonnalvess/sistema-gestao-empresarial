import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ContasReceberService } from './contas-receber.service';

import { CriarContaReceberDto } from './dto/criar-conta-receber.dto';
import { AtualizarContaReceberDto } from './dto/atualizar-conta-receber.dto';
import { FiltroContasReceberDto } from './dto/filtro-contas-receber.dto';
import { RegistrarRecebimentoContaReceberDto } from './dto/registrar-recebimento-conta-receber.dto';
import { CriarContaReceberHistoricoDto } from './dto/criar-conta-receber-historico.dto';
import { GerarContaOrdemServicoDto } from './dto/gerar-conta-ordem-servico.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('contas-receber')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContasReceberController {
  constructor(
    private readonly contasReceberService: ContasReceberService,
  ) {}

  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  criar(
    @Body() body: CriarContaReceberDto,
    @Req() req: any,
  ) {
    return this.contasReceberService.criar(
      body,
      req.user,
    );
  }

  @Get()
  @Roles(
    'SUPER_ADMIN',
    'ADMIN_EMPRESA',
    'USUARIO_EMPRESA',
  )
  listar(
    @Query() filtros: FiltroContasReceberDto,
    @Req() req: any,
  ) {
    return this.contasReceberService.listar(
      req.user,
      filtros,
    );
  }

  @Post(':id/historico')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  adicionarHistorico(
    @Param('id') id: string,
    @Body() body: CriarContaReceberHistoricoDto,
    @Req() req: any,
  ) {
    return this.contasReceberService.adicionarHistorico(
      id,
      body,
      req.user,
    );
  }

  @Get(':id/historico')
  @Roles(
    'SUPER_ADMIN',
    'ADMIN_EMPRESA',
    'USUARIO_EMPRESA',
  )
  listarHistorico(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.contasReceberService.listarHistorico(
      id,
      req.user,
    );
  }

  @Post(':id/recebimentos')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  registrarRecebimento(
    @Param('id') id: string,
    @Body() body: RegistrarRecebimentoContaReceberDto,
    @Req() req: any,
  ) {
    return this.contasReceberService.registrarRecebimento(
      id,
      body,
      req.user,
    );
  }

  @Patch(':id/cancelar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  cancelar(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.contasReceberService.cancelar(
      id,
      req.user,
    );
  }

  @Post('ordem-servico/:ordemServicoId')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  gerarAPartirOrdemServico(
    @Param('ordemServicoId') ordemServicoId: string,
    @Body() body: GerarContaOrdemServicoDto,
    @Req() req: any,
  ) {
    return this.contasReceberService.gerarAPartirOrdemServico(
      ordemServicoId,
      body,
      req.user,
    );
  }

  @Get(':id')
  @Roles(
    'SUPER_ADMIN',
    'ADMIN_EMPRESA',
    'USUARIO_EMPRESA',
  )
  buscarPorId(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.contasReceberService.buscarPorId(
      id,
      req.user,
    );
  }

  @Patch(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarContaReceberDto,
    @Req() req: any,
  ) {
    return this.contasReceberService.atualizar(
      id,
      body,
      req.user,
    );
  }
}