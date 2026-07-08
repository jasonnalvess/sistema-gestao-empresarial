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
import { UsuariosService } from './usuarios.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CriarUsuarioDto } from './dto/criar-usuario.dto';
import { PaginacaoDto } from '../common/dto/paginacao.dto';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  criar(@Body() body: CriarUsuarioDto, @Req() req: any) {
  return this.usuariosService.criar(body, req.user);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  listar(@Req() req: any, @Query() paginacao: PaginacaoDto) {
    return this.usuariosService.listar(req.user, paginacao);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  buscarPorId(@Param('id') id: string, @Req() req: any) {
    return this.usuariosService.buscarPorId(id, req.user);
  }

@Patch(':id')
@Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
atualizar(
  @Param('id') id: string,
  @Body() body: any,
  @Req() req: any,
) {
  return this.usuariosService.atualizar(id, body, req.user);
}

  @Patch(':id/ativar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  ativar(@Param('id') id: string, @Req() req: any) {
    return this.usuariosService.ativar(id, req.user);
  }

  @Patch(':id/desativar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  desativar(@Param('id') id: string, @Req() req: any) {
    return this.usuariosService.desativar(id, req.user);
  }
}
