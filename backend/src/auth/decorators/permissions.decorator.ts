import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export const Permissoes = (...permissoes: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissoes);
