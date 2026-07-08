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

import { ClientesService } from './clientes.service';
import { CriarClienteDto } from './dto/criar-cliente.dto';
import { FiltroClientesDto } from './dto/filtro-clientes.dto';
import { CriarClienteHistoricoDto } from './dto/criar-cliente-historico.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('clientes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  criar(@Body() body: CriarClienteDto, @Req() req: any) {
    return this.clientesService.criar(body, req.user);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(@Req() req: any, @Query() paginacao: FiltroClientesDto) {
    return this.clientesService.listar(req.user, paginacao);
  }

  @Post(':id/historico')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  adicionarHistorico(
    @Param('id') id: string,
    @Body() body: CriarClienteHistoricoDto,
    @Req() req: any,
  ) {
    return this.clientesService.adicionarHistorico(id, body, req.user);
  }

  @Get(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listarHistorico(@Param('id') id: string, @Req() req: any) {
    return this.clientesService.listarHistorico(id, req.user);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  buscarPorId(@Param('id') id: string, @Req() req: any) {
    return this.clientesService.buscarPorId(id, req.user);
  }

  @Patch(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  atualizar(
    @Param('id') id: string,
    @Body() body: Partial<CriarClienteDto>,
    @Req() req: any,
  ) {
    return this.clientesService.atualizar(id, body, req.user);
  }

  @Patch(':id/ativar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  ativar(@Param('id') id: string, @Req() req: any) {
    return this.clientesService.ativar(id, req.user);
  }

  @Patch(':id/desativar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  desativar(@Param('id') id: string, @Req() req: any) {
    return this.clientesService.desativar(id, req.user);
  }
}
