import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { AUDITORIA_KEY, AuditarOptions } from '../decorators/auditar.decorator';

@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  constructor(
    private readonly auditoriaService: AuditoriaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditoria = this.reflector.getAllAndOverride<AuditarOptions>(
      AUDITORIA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!auditoria) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const usuario = request.user;
    const params = request.params;
    const body = request.body;
    const ip = request.ip;

    return next.handle().pipe(
      tap(async (response) => {
        await this.auditoriaService.registrar({
          acao: auditoria.acao,
          entidade: auditoria.entidade,
          entidadeId: params?.id || response?.id,
          dadosNovos: body,
          empresaId: usuario?.empresaId,
          usuarioId: usuario?.id,
          ip,
        });
      }),
    );
  }
}
