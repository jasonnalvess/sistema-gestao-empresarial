-- CreateEnum
CREATE TYPE "PerfilEscopo" AS ENUM ('SISTEMA', 'EMPRESA');

-- AlterTable
ALTER TABLE "Perfil" ADD COLUMN     "escopo" "PerfilEscopo" NOT NULL DEFAULT 'EMPRESA';
