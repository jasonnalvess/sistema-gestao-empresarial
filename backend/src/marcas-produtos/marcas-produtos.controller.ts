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
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PaginacaoDto } from '../common/dto/paginacao.dto';

import { MarcasProdutosService } from './marcas-produtos.service';
import { AtualizarMarcaProdutoDto } from './dto/atualizar-marca-produto.dto';
import { CriarMarcaProdutoDto } from './dto/criar-marca-produto.dto';

@Controller('marcas-produtos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MarcasProdutosController {
  constructor(private readonly marcasProdutosService: MarcasProdutosService) {}

  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  criar(
    @Body() body: CriarMarcaProdutoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.marcasProdutosService.criar(body, usuario);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(
    @CurrentUser() usuario: AuthenticatedUser,
    @Query() paginacao: PaginacaoDto,
  ) {
    return this.marcasProdutosService.listar(usuario, paginacao);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  buscarPorId(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.marcasProdutosService.buscarPorId(id, usuario);
  }

  @Patch(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarMarcaProdutoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.marcasProdutosService.atualizar(id, body, usuario);
  }

  @Patch(':id/ativar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  ativar(@Param('id') id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.marcasProdutosService.ativar(id, usuario);
  }

  @Patch(':id/desativar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  desativar(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.marcasProdutosService.desativar(id, usuario);
  }
}
