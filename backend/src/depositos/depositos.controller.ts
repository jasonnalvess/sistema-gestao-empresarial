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

import { DepositosService } from './depositos.service';
import { CriarDepositoDto } from './dto/criar-deposito.dto';
import { AtualizarDepositoDto } from './dto/atualizar-deposito.dto';
import { FiltroDepositoDto } from './dto/filtro-deposito.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('depositos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepositosController {
  constructor(private readonly depositosService: DepositosService) {}

  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  criar(@Body() body: CriarDepositoDto, @Req() req: any) {
    return this.depositosService.criar(body, req.user);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(@Query() filtros: FiltroDepositoDto, @Req() req: any) {
    return this.depositosService.listar(req.user, filtros);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  buscarPorId(@Param('id') id: string, @Req() req: any) {
    return this.depositosService.buscarPorId(id, req.user);
  }

  @Patch(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarDepositoDto,
    @Req() req: any,
  ) {
    return this.depositosService.atualizar(id, body, req.user);
  }

  @Patch(':id/ativar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  ativar(@Param('id') id: string, @Req() req: any) {
    return this.depositosService.ativar(id, req.user);
  }

  @Patch(':id/desativar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  desativar(@Param('id') id: string, @Req() req: any) {
    return this.depositosService.desativar(id, req.user);
  }
}
