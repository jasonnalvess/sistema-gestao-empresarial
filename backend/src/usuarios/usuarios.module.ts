import { Module } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RecoveryModule } from '../auth/recovery.module';

@Module({
  imports: [PrismaModule, RecoveryModule],
  controllers: [UsuariosController],
  providers: [UsuariosService, PermissionsGuard],
  exports: [UsuariosService],
})
export class UsuariosModule {}
