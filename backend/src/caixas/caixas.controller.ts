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

import { CaixasService } from './caixas.service';

import { CriarCaixaDto } from './dto/criar-caixa.dto';
import { AtualizarCaixaDto } from './dto/atualizar-caixa.dto';
import { AbrirCaixaDto } from './dto/abrir-caixa.dto';
import { FecharCaixaDto } from './dto/fechar-caixa.dto';
import { CriarMovimentacaoCaixaDto } from './dto/criar-movimentacao-caixa.dto';
import { FiltroCaixasDto } from './dto/filtro-caixas.dto';
import { FiltroMovimentacoesCaixaDto } from './dto/filtro-movimentacoes-caixa.dto';
import { FiltroResumoCaixasDto } from './dto/filtro-resumo-caixas.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('caixas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CaixasController {
  constructor(
    private readonly caixasService: CaixasService,
  ) {}

  @Post()
  @Roles('ADMIN_EMPRESA')
  criar(
    @Body() body: CriarCaixaDto,
    @Req() req: any,
  ) {
    return this.caixasService.criar(
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
    @Query() filtros: FiltroCaixasDto,
    @Req() req: any,
  ) {
    return this.caixasService.listar(
      req.user,
      filtros,
    );
  }

  @Get('resumo/geral')
  @Roles(
    'SUPER_ADMIN',
    'ADMIN_EMPRESA',
    'USUARIO_EMPRESA',
  )
  resumo(
    @Query() filtros: FiltroResumoCaixasDto,
    @Req() req: any,
  ) {
    return this.caixasService.resumo(
      req.user,
      filtros,
    );
  }

  @Get('movimentacoes/listar')
  @Roles(
    'SUPER_ADMIN',
    'ADMIN_EMPRESA',
    'USUARIO_EMPRESA',
  )
  listarMovimentacoes(
    @Query() filtros: FiltroMovimentacoesCaixaDto,
    @Req() req: any,
  ) {
    return this.caixasService.listarMovimentacoes(
      req.user,
      filtros,
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
    return this.caixasService.buscarPorId(
      id,
      req.user,
    );
  }

  @Patch(':id')
  @Roles('ADMIN_EMPRESA')
  atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarCaixaDto,
    @Req() req: any,
  ) {
    return this.caixasService.atualizar(
      id,
      body,
      req.user,
    );
  }

  @Post(':id/abrir')
  @Roles('ADMIN_EMPRESA')
  abrir(
    @Param('id') id: string,
    @Body() body: AbrirCaixaDto,
    @Req() req: any,
  ) {
    return this.caixasService.abrir(
      id,
      body,
      req.user,
    );
  }

  @Post(':id/fechar')
  @Roles('ADMIN_EMPRESA')
  fechar(
    @Param('id') id: string,
    @Body() body: FecharCaixaDto,
    @Req() req: any,
  ) {
    return this.caixasService.fechar(
      id,
      body,
      req.user,
    );
  }

  @Get(':id/abertura')
  @Roles(
    'SUPER_ADMIN',
    'ADMIN_EMPRESA',
    'USUARIO_EMPRESA',
  )
  aberturaAtual(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.caixasService.buscarAberturaAtiva(
      id,
      req.user,
    );
  }

  @Get(':id/aberturas')
  @Roles(
    'SUPER_ADMIN',
    'ADMIN_EMPRESA',
    'USUARIO_EMPRESA',
  )
  listarAberturas(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.caixasService.listarAberturas(
      id,
      req.user,
    );
  }

  @Post(':id/movimentacoes')
  @Roles('ADMIN_EMPRESA')
  movimentar(
    @Param('id') id: string,
    @Body() body: CriarMovimentacaoCaixaDto,
    @Req() req: any,
  ) {
    return this.caixasService.criarMovimentacao(
      id,
      body,
      req.user,
    );
  }
}