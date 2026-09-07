import { AlterarSituacaoFuncionarioDto } from './dto/alterar-situacao.dto';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissoes } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import { EmpresaAtual } from '../common/decorators/empresa-atual.decorator';
import type { EmpresaContexto } from '../common/types/empresa-contexto.type';
import { PaginacaoDto } from '../common/dto/paginacao.dto';
import {
  CriarFuncionarioDto,
  EditarFuncionarioDto,
  EditarDadosPessoaisFuncionarioDto,
  FiltroFuncionariosDto,
} from './dto/funcionarios.dto';
import { FuncionariosService } from './funcionarios.service';
@Controller('funcionarios')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, EmpresaContextoGuard)
@Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
export class FuncionariosController {
  constructor(private readonly service: FuncionariosService) {}
  @Get()
  @Permissoes('funcionarios.visualizar')
  listar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Query() filtros: FiltroFuncionariosDto,
  ) {
    return this.service.listar(empresa.empresaId, filtros);
  }
  @Get(':id')
  @Permissoes('funcionarios.visualizar')
  buscar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.buscar(empresa.empresaId, id);
  }
  @Post()
  @Permissoes('funcionarios.criar')
  criar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @CurrentUser() ator: AuthenticatedUser,
    @Body() dados: CriarFuncionarioDto,
  ) {
    return this.service.criar(empresa.empresaId, ator, dados);
  }
  @Patch(':id')
  @Permissoes('funcionarios.editar')
  editar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @CurrentUser() ator: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dados: EditarFuncionarioDto,
  ) {
    return this.service.editar(empresa.empresaId, ator, id, dados);
  }
  @Patch(':id/situacao')
  @Permissoes('funcionarios.situacao.gerenciar')
  alterarSituacao(
    @EmpresaAtual() empresa: EmpresaContexto,
    @CurrentUser() ator: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dados: AlterarSituacaoFuncionarioDto,
  ) {
    return this.service.alterarSituacao(empresa.empresaId, ator, id, dados);
  }
  @Get(':id/dados-pessoais')
  @Permissoes(
    'funcionarios.visualizar',
    'funcionarios.dados_pessoais.visualizar',
  )
  dadosPessoais(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.dadosPessoais(empresa.empresaId, id);
  }
  @Patch(':id/dados-pessoais')
  @Permissoes('funcionarios.dados_pessoais.editar')
  editarDadosPessoais(
    @EmpresaAtual() empresa: EmpresaContexto,
    @CurrentUser() ator: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dados: EditarDadosPessoaisFuncionarioDto,
  ) {
    return this.service.editarDadosPessoais(empresa.empresaId, ator, id, dados);
  }
  @Get(':id/historico')
  @Permissoes('funcionarios.visualizar')
  historico(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() filtros: PaginacaoDto,
  ) {
    return this.service.historico(empresa.empresaId, id, filtros);
  }
}
