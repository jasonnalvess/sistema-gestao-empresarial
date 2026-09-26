import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { catchError, from, map, mergeMap, Observable, of, timeout } from 'rxjs';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { prepararJsonAuditoria } from '../../auditoria/auditoria-sanitizer';
import { AUDITORIA_KEY, AuditarOptions } from '../decorators/auditar.decorator';
import type { EmpresaContexto } from '../types/empresa-contexto.type';

type AuditoriaRequest = Request & {
  user?: AuthenticatedUser;
  empresaContexto?: EmpresaContexto;
};

type ObjetoDesconhecido = Record<string, unknown>;

const TEMPO_LIMITE_AUDITORIA_MS = 5000;

@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditoriaInterceptor.name);

  constructor(
    private readonly auditoriaService: AuditoriaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const auditoria = this.reflector.getAllAndOverride<AuditarOptions>(
      AUDITORIA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!auditoria) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuditoriaRequest>();
    const usuario = request.user;
    const params = request.params;
    const body = request.body as unknown;
    const ip = request.ip;

    const parametroId = Array.isArray(params?.id) ? params.id[0] : params?.id;

    return next.handle().pipe(
      mergeMap((response: unknown) => {
        const dadosNovos = prepararJsonAuditoria(
          body === undefined ? obterRecursoResposta(response) : body,
        );

        return from(
          this.auditoriaService.registrar({
            acao: auditoria.acao,
            entidade: auditoria.entidade,
            entidadeId: obterEntidadeId(response, parametroId),
            dadosNovos,
            empresaId:
              request.empresaContexto?.empresaId ??
              usuario?.empresaId ??
              undefined,
            usuarioId: usuario?.id,
            ip,
          }),
        ).pipe(
          timeout(TEMPO_LIMITE_AUDITORIA_MS),
          map(() => response),
          catchError(() => {
            this.logger.error(
              `Falha ao registrar auditoria para ${auditoria.entidade}/${auditoria.acao}.`,
            );
            return of(response);
          }),
        );
      }),
    );
  }
}

function objeto(valor: unknown): valor is ObjetoDesconhecido {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function obterRecursoResposta(response: unknown): unknown {
  return objeto(response) && 'data' in response ? response.data : response;
}

function obterEntidadeId(
  response: unknown,
  parametroId: string | undefined,
): string | undefined {
  if (
    objeto(response) &&
    objeto(response.data) &&
    typeof response.data.id === 'string'
  ) {
    return response.data.id;
  }
  if (objeto(response) && typeof response.id === 'string') return response.id;
  return parametroId;
}
