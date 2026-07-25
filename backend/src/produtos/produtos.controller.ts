import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ProdutosService } from './produtos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CriarProdutoDto } from './dto/criar-produto.dto';
import { AtualizarProdutoDto } from './dto/atualizar-produto.dto';
import { Auditar } from '../common/decorators/auditar.decorator';
import { AuditoriaAcao, AuditoriaEntidade } from '../common/enums/auditoria.enum';
import { FiltroProdutosDto } from './dto/filtro-produtos.dto';
import { CriarProdutoHistoricoDto } from './dto/criar-produto-historico.dto';

@Controller('produtos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProdutosController {
  constructor(private readonly produtosService: ProdutosService) {}

  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Auditar({
    acao: AuditoriaAcao.CRIAR,
    entidade: AuditoriaEntidade.PRODUTO,
  })
  criar(@Body() body: CriarProdutoDto, @Req() req: any) {
    return this.produtosService.criar(body, req.user);
  }

  @Get()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(@Req() req: any, @Query() filtros: FiltroProdutosDto) {
    return this.produtosService.listar(req.user, filtros);
  }

  @Post(':id/historico')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  adicionarHistorico(
    @Param('id') id: string,
    @Body() body: CriarProdutoHistoricoDto,
    @Req() req: any,
  ) {
    return this.produtosService.adicionarHistorico(id, body, req.user);
  }

  @Get(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listarHistorico(@Param('id') id: string, @Req() req: any) {
    return this.produtosService.listarHistorico(id, req.user);
  }

  @Get(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  buscarPorId(@Param('id') id: string, @Req() req: any) {
    return this.produtosService.buscarPorId(id, req.user);
  }

  @Patch(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Auditar({
    acao: AuditoriaAcao.ATUALIZAR,
    entidade: AuditoriaEntidade.PRODUTO,
  })
  atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarProdutoDto,
    @Req() req: any,
  ) {
    return this.produtosService.atualizar(id, body, req.user);
  }

  @Patch(':id/ativar')
  @Roles('ADMIN_EMPRESA')
  @Auditar({
    acao: AuditoriaAcao.ATIVAR,
    entidade: AuditoriaEntidade.PRODUTO,
  })
  ativar(@Param('id') id: string, @Req() req: any) {
    return this.produtosService.ativar(id, req.user);
  }

  @Patch(':id/desativar')
  @Roles('ADMIN_EMPRESA')
  @Auditar({
    acao: AuditoriaAcao.DESATIVAR,
    entidade: AuditoriaEntidade.PRODUTO,
  })
  desativar(@Param('id') id: string, @Req() req: any) {
    return this.produtosService.desativar(id, req.user);
  }
}
