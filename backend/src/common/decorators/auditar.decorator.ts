import { SetMetadata } from '@nestjs/common';
import { AuditoriaAcao, AuditoriaEntidade } from '../enums/auditoria.enum';

export const AUDITORIA_KEY = 'auditoria';

export interface AuditarOptions {
  acao: AuditoriaAcao;
  entidade: AuditoriaEntidade;
}

export const Auditar = (options: AuditarOptions) =>
  SetMetadata(AUDITORIA_KEY, options);
