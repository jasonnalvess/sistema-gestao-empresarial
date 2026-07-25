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

import { UnidadesMedidaService } from './unidades-medida.service';
import { CriarUnidadeMedidaDto } from './dto/criar-unidade-medida.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginacaoDto } from '../common/dto/paginacao.dto';

@Controller('unidades-medida')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UnidadesMedidaController {
  constructor(private readonly unidadesMedidaService: UnidadesMedidaService) {}

  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  criar(@Body() body: CriarUnidadeMedidaDto, @Req() req: any) {
    return this.unidadesMedidaService.criar(body, req.user);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(@Req() req: any, @Query() paginacao: PaginacaoDto) {
    return this.unidadesMedidaService.listar(req.user, paginacao);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  buscarPorId(@Param('id') id: string, @Req() req: any) {
    return this.unidadesMedidaService.buscarPorId(id, req.user);
  }

  @Patch(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  atualizar(
    @Param('id') id: string,
    @Body() body: Partial<CriarUnidadeMedidaDto>,
    @Req() req: any,
  ) {
    return this.unidadesMedidaService.atualizar(id, body, req.user);
  }

  @Patch(':id/ativar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  ativar(@Param('id') id: string, @Req() req: any) {
    return this.unidadesMedidaService.ativar(id, req.user);
  }

  @Patch(':id/desativar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  desativar(@Param('id') id: string, @Req() req: any) {
    return this.unidadesMedidaService.desativar(id, req.user);
  }
}
