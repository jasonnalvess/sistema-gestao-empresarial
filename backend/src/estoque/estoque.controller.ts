import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { EstoqueService } from './estoque.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CriarEstoqueProdutoDto } from './dto/criar-estoque-produto.dto';
import { AtualizarEstoqueProdutoDto } from './dto/atualizar-estoque-produto.dto';
import { FiltroEstoqueDto } from './dto/filtro-estoque.dto';

@Controller('estoque')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EstoqueController {
  constructor(private readonly estoqueService: EstoqueService) {}

  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  criar(@Body() body: CriarEstoqueProdutoDto, @Req() req: any) {
    return this.estoqueService.criar(body, req.user);
  }

  @Get()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(@Req() req: any, @Query() filtros: FiltroEstoqueDto) {
    return this.estoqueService.listar(req.user, filtros);
  }

  @Get(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  buscarPorId(@Param('id') id: string, @Req() req: any) {
    return this.estoqueService.buscarPorId(id, req.user);
  }

  @Patch(':id')
  @Roles('ADMIN_EMPRESA')
  atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarEstoqueProdutoDto,
    @Req() req: any,
  ) {
    return this.estoqueService.atualizar(id, body, req.user);
  }
}
