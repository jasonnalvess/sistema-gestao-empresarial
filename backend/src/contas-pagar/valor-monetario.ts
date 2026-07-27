import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IsNumber, ValidationOptions } from 'class-validator';

export function IsValorMonetario(validationOptions?: ValidationOptions) {
  return IsNumber(
    {
      allowInfinity: false,
      allowNaN: false,
      maxDecimalPlaces: 2,
    },
    validationOptions,
  );
}

export function paraDecimalMonetario(
  valor: Prisma.Decimal.Value,
  campo: string,
): Prisma.Decimal {
  let decimal: Prisma.Decimal;

  try {
    decimal = new Prisma.Decimal(valor);
  } catch {
    throw new BadRequestException(`${campo} possui valor monetário inválido`);
  }

  if (!decimal.isFinite() || decimal.decimalPlaces() > 2) {
    throw new BadRequestException(
      `${campo} deve possuir no máximo duas casas decimais`,
    );
  }

  return decimal;
}
