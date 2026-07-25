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

import { FornecedoresService } from './fornecedores.service';
import { CriarFornecedorDto } from './dto/criar-fornecedor.dto';
import { AtualizarFornecedorDto } from './dto/atualizar-fornecedor.dto';
import { FiltroFornecedoresDto } from './dto/filtro-fornecedores.dto';
import { CriarFornecedorHistoricoDto } from './dto/criar-fornecedor-historico.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('fornecedores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FornecedoresController {
  constructor(
    private readonly fornecedoresService: FornecedoresService,
  ) {}

  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  criar(
    @Body() body: CriarFornecedorDto,
    @Req() req: any,
  ) {
    return this.fornecedoresService.criar(
      body,
      req.user,
    );
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(
    @Query() filtros: FiltroFornecedoresDto,
    @Req() req: any,
  ) {
    return this.fornecedoresService.listar(
      req.user,
      filtros,
    );
  }

  @Post(':id/historico')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  adicionarHistorico(
    @Param('id') id: string,
    @Body() body: CriarFornecedorHistoricoDto,
    @Req() req: any,
  ) {
    return this.fornecedoresService.adicionarHistorico(
      id,
      body,
      req.user,
    );
  }

  @Get(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listarHistorico(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.fornecedoresService.listarHistorico(
      id,
      req.user,
    );
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  buscarPorId(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.fornecedoresService.buscarPorId(
      id,
      req.user,
    );
  }

  @Patch(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarFornecedorDto,
    @Req() req: any,
  ) {
    return this.fornecedoresService.atualizar(
      id,
      body,
      req.user,
    );
  }

  @Patch(':id/ativar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  ativar(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.fornecedoresService.ativar(
      id,
      req.user,
    );
  }

  @Patch(':id/desativar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  desativar(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.fornecedoresService.desativar(
      id,
      req.user,
    );
  }
}
