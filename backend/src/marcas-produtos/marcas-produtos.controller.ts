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

import { MarcasProdutosService } from './marcas-produtos.service';
import { CriarMarcaProdutoDto } from './dto/criar-marca-produto.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginacaoDto } from '../common/dto/paginacao.dto';

@Controller('marcas-produtos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MarcasProdutosController {
  constructor(private readonly marcasProdutosService: MarcasProdutosService) {}

  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  criar(@Body() body: CriarMarcaProdutoDto, @Req() req: any) {
    return this.marcasProdutosService.criar(body, req.user);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(@Req() req: any, @Query() paginacao: PaginacaoDto) {
    return this.marcasProdutosService.listar(req.user, paginacao);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  buscarPorId(@Param('id') id: string, @Req() req: any) {
    return this.marcasProdutosService.buscarPorId(id, req.user);
  }

  @Patch(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  atualizar(
    @Param('id') id: string,
    @Body() body: Partial<CriarMarcaProdutoDto>,
    @Req() req: any,
  ) {
    return this.marcasProdutosService.atualizar(id, body, req.user);
  }

  @Patch(':id/ativar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  ativar(@Param('id') id: string, @Req() req: any) {
    return this.marcasProdutosService.ativar(id, req.user);
  }

  @Patch(':id/desativar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  desativar(@Param('id') id: string, @Req() req: any) {
    return this.marcasProdutosService.desativar(id, req.user);
  }
}
