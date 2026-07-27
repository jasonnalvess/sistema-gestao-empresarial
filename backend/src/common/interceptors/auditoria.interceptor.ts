import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Observable, tap } from 'rxjs';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { AUDITORIA_KEY, AuditarOptions } from '../decorators/auditar.decorator';

@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
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

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const usuario = request.user;
    const params = request.params;
    const body = request.body as unknown;
    const ip = request.ip;

    const parametroId = Array.isArray(params?.id) ? params.id[0] : params?.id;

    const dadosNovos =
      body === undefined
        ? undefined
        : (JSON.parse(JSON.stringify(body)) as Prisma.InputJsonValue);

    return next.handle().pipe(
      tap(async (response: unknown) => {
        const respostaId =
          typeof response === 'object' &&
          response !== null &&
          'id' in response &&
          typeof response.id === 'string'
            ? response.id
            : undefined;

        await this.auditoriaService.registrar({
          acao: auditoria.acao,
          entidade: auditoria.entidade,
          entidadeId: parametroId ?? respostaId,
          dadosNovos,
          empresaId: usuario?.empresaId ?? undefined,
          usuarioId: usuario?.id,
          ip,
        });
      }),
    );
  }
}
