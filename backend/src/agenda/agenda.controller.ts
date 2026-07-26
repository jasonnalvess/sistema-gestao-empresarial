import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

import { AgendaService } from './agenda.service';
import type { UsuarioAgendaAutenticado } from './agenda.service';
import { AtualizarAgendaEventoDto } from './dto/atualizar-agenda-evento.dto';
import { CriarAgendaEventoDto } from './dto/criar-agenda-evento.dto';
import { CriarAgendaHistoricoDto } from './dto/criar-agenda-historico.dto';

@Controller('agenda')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  private adaptarUsuario(usuario: AuthenticatedUser): UsuarioAgendaAutenticado {
    return {
      id: usuario.id,
      empresaId: usuario.empresaId ?? undefined,
      tipo: usuario.tipo,
    };
  }

  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  criar(
    @Body() body: CriarAgendaEventoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.agendaService.criar(body, this.adaptarUsuario(usuario));
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(@CurrentUser() usuario: AuthenticatedUser) {
    return this.agendaService.listar(this.adaptarUsuario(usuario));
  }

  @Patch(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarAgendaEventoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.agendaService.atualizar(id, body, this.adaptarUsuario(usuario));
  }

  @Post(':id/historico')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  adicionarHistorico(
    @Param('id') id: string,
    @Body() body: CriarAgendaHistoricoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.agendaService.adicionarHistorico(
      id,
      body,
      this.adaptarUsuario(usuario),
    );
  }

  @Get(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listarHistorico(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.agendaService.listarHistorico(id, this.adaptarUsuario(usuario));
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  buscarPorId(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.agendaService.buscarPorId(id, this.adaptarUsuario(usuario));
  }
}
