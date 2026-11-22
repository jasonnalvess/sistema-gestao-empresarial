import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RateLimitService } from '../common/services/rate-limit.service';
import { IpUtil } from '../common/utils/ip.util';
import {
  CadastroPublicoService,
  ENDPOINT_RATE_LIMIT_CADASTRO,
  ENDPOINT_RATE_LIMIT_CONCLUSAO_CADASTRO,
  LIMITE_CONCLUSAO_CADASTRO,
  LIMITE_SOLICITACOES_CADASTRO,
} from './cadastro-publico.service';
import { ConcluirCadastroDto } from './dto/concluir-cadastro.dto';
import { CriarSolicitacaoCadastroDto } from './dto/criar-solicitacao-cadastro.dto';
import { ReenviarSolicitacaoCadastroDto } from './dto/reenviar-solicitacao-cadastro.dto';

/**
 * Endpoints públicos do cadastro (V3.6.5).
 *
 * Fase A: solicitação e reenvio de verificação, com resposta genérica e rate
 * limit compartilhado de 5 operações por 15 minutos.
 * Fase B: conclusão do cadastro após o clique no link do e-mail. A chamada é
 * autenticada pelo token de uso único (hash SHA-256, validade de 24 horas) e
 * tem quota própria de 5 operações por 15 minutos.
 */
@Controller('cadastro-publico')
export class CadastroPublicoController {
  constructor(
    private readonly cadastroPublicoService: CadastroPublicoService,
    private readonly rateLimitService: RateLimitService,
    private readonly ipUtil: IpUtil,
  ) {}

  @Post('solicitacoes')
  async solicitar(
    @Body() body: CriarSolicitacaoCadastroDto,
    @Req() req: Request,
  ) {
    await this.rateLimitService.checkLimit(
      req,
      ENDPOINT_RATE_LIMIT_CADASTRO,
      LIMITE_SOLICITACOES_CADASTRO,
    );

    return this.cadastroPublicoService.solicitar(
      body,
      this.ipUtil.getRealIp(req),
    );
  }

  @Post('solicitacoes/conclusao')
  async concluir(@Body() body: ConcluirCadastroDto, @Req() req: Request) {
    await this.rateLimitService.checkLimit(
      req,
      ENDPOINT_RATE_LIMIT_CONCLUSAO_CADASTRO,
      LIMITE_CONCLUSAO_CADASTRO,
    );

    return this.cadastroPublicoService.concluir(
      body,
      this.ipUtil.getRealIp(req),
    );
  }

  @Post('solicitacoes/reenvio')
  async reenviar(
    @Body() body: ReenviarSolicitacaoCadastroDto,
    @Req() req: Request,
  ) {
    await this.rateLimitService.checkLimit(
      req,
      ENDPOINT_RATE_LIMIT_CADASTRO,
      LIMITE_SOLICITACOES_CADASTRO,
    );

    return this.cadastroPublicoService.reenviar(
      body.email,
      this.ipUtil.getRealIp(req),
    );
  }
}
