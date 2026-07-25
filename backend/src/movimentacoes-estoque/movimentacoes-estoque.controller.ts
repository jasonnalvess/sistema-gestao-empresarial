import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { MovimentacoesEstoqueService } from './movimentacoes-estoque.service';
import { CriarMovimentacaoEstoqueDto } from './dto/criar-movimentacao-estoque.dto';
import { CriarTransferenciaEstoqueDto } from './dto/criar-transferencia-estoque.dto';
import { Auditar } from '../common/decorators/auditar.decorator';
import { AuditoriaAcao, AuditoriaEntidade } from '../common/enums/auditoria.enum';
import { FiltroMovimentacoesEstoqueDto } from './dto/filtro-movimentacoes-estoque.dto';

@Controller('movimentacoes-estoque')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MovimentacoesEstoqueController {
  constructor(
    private readonly service: MovimentacoesEstoqueService,
  ) {}

  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Auditar({
    acao: AuditoriaAcao.CRIAR,
    entidade: AuditoriaEntidade.MOVIMENTACAO_ESTOQUE,
  })
  criar(
    @Body() body: CriarMovimentacaoEstoqueDto,
    @Req() req: any,
  ) {
    return this.service.criar(body, req.user);
  }

  @Post('transferencias')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  transferir(
    @Body() body: CriarTransferenciaEstoqueDto,
    @Req() req: any,
  ) {
    return this.service.transferir(body, req.user);
  }

  @Get()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(@Req() req: any, @Query() filtros: FiltroMovimentacoesEstoqueDto) {
    return this.service.listar(req.user, filtros);
  }
}
