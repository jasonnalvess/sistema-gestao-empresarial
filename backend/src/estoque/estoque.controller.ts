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

import { EstoqueService } from './estoque.service';
import { AtualizarEstoqueProdutoDto } from './dto/atualizar-estoque-produto.dto';
import { CriarEstoqueProdutoDto } from './dto/criar-estoque-produto.dto';
import { FiltroEstoqueDto } from './dto/filtro-estoque.dto';

@Controller('estoque')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EstoqueController {
  constructor(private readonly estoqueService: EstoqueService) {}

  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  criar(
    @Body() body: CriarEstoqueProdutoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.estoqueService.criar(body, usuario);
  }

  @Get()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(
    @CurrentUser() usuario: AuthenticatedUser,
    @Query() filtros: FiltroEstoqueDto,
  ) {
    return this.estoqueService.listar(usuario, filtros);
  }

  @Get(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  buscarPorId(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.estoqueService.buscarPorId(id, usuario);
  }

  @Patch(':id')
  @Roles('ADMIN_EMPRESA')
  atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarEstoqueProdutoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.estoqueService.atualizar(id, body, usuario);
  }
}
