import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AgendaService, UsuarioAgendaAutenticado } from './agenda.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CriarAgendaEventoDto } from './dto/criar-agenda-evento.dto';
import { CriarAgendaHistoricoDto } from './dto/criar-agenda-historico.dto';
import { AtualizarAgendaEventoDto } from './dto/atualizar-agenda-evento.dto';

@Controller('agenda')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  criar(
    @Body() body: CriarAgendaEventoDto,
    @Req() req: { user: UsuarioAgendaAutenticado },
  ) {
    return this.agendaService.criar(body, req.user);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(@Req() req: { user: UsuarioAgendaAutenticado }) {
    return this.agendaService.listar(req.user);
  }

  @Patch(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarAgendaEventoDto,
    @Req() req: { user: UsuarioAgendaAutenticado },
  ) {
    return this.agendaService.atualizar(id, body, req.user);
  }

  @Post(':id/historico')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  adicionarHistorico(
    @Param('id') id: string,
    @Body() body: CriarAgendaHistoricoDto,
    @Req() req: { user: UsuarioAgendaAutenticado },
  ) {
    return this.agendaService.adicionarHistorico(id, body, req.user);
  }

  @Get(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listarHistorico(
    @Param('id') id: string,
    @Req() req: { user: UsuarioAgendaAutenticado },
  ) {
    return this.agendaService.listarHistorico(id, req.user);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  buscarPorId(
    @Param('id') id: string,
    @Req() req: { user: UsuarioAgendaAutenticado },
  ) {
    return this.agendaService.buscarPorId(id, req.user);
  }
}
