import { Prisma } from '@prisma/client';

export const camposPessoais = [
  'cpf',
  'emailPessoal',
  'telefonePessoal',
  'cep',
  'logradouro',
  'numero',
  'complemento',
  'bairro',
  'cidade',
  'uf',
] as const;
export const camposOperacionais = [
  'nome',
  'nomePreferido',
  'matricula',
  'dataAdmissao',
  'tipoVinculo',
  'cargoId',
  'departamentoId',
  'gestorId',
  'emailCorporativo',
  'telefoneCorporativo',
] as const;
export const pessoalSelect = {
  id: true,
  cpf: true,
  emailPessoal: true,
  telefonePessoal: true,
  cep: true,
  logradouro: true,
  numero: true,
  complemento: true,
  bairro: true,
  cidade: true,
  uf: true,
} satisfies Prisma.FuncionarioSelect;
export const operacionalSelect = {
  id: true,
  nome: true,
  nomePreferido: true,
  matricula: true,
  dataAdmissao: true,
  tipoVinculo: true,
  status: true,
  emailCorporativo: true,
  telefoneCorporativo: true,
  versaoRegistro: true,
  createdAt: true,
  updatedAt: true,
  cargoId: true,
  departamentoId: true,
  gestorId: true,
  cargo: { select: { id: true, nome: true, ativo: true } },
  departamento: { select: { id: true, nome: true, ativo: true } },
  gestor: {
    select: {
      id: true,
      nome: true,
      nomePreferido: true,
      matricula: true,
      status: true,
    },
  },
  usuarioId: true,
  usuario: { select: { ativo: true } },
} satisfies Prisma.FuncionarioSelect;

export type FuncionarioOperacional = Prisma.FuncionarioGetPayload<{
  select: typeof operacionalSelect;
}>;
export function apresentarFuncionario(registro: FuncionarioOperacional) {
  const { usuarioId, usuario, ...dados } = registro;
  return {
    ...dados,
    estadoAcesso: !usuarioId
      ? 'SEM_USUARIO'
      : usuario?.ativo
        ? 'USUARIO_ATIVO'
        : 'USUARIO_INATIVO',
  };
}
