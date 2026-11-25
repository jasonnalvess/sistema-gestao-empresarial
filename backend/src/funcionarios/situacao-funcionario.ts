import { BadRequestException } from '@nestjs/common';
import { EstadoAcessoFuncionario, StatusFuncionario } from '@prisma/client';
import {
  AcaoAcessoFuncionario,
  AlterarSituacaoFuncionarioDto,
} from './dto/alterar-situacao.dto';

const transicoes: Record<StatusFuncionario, readonly StatusFuncionario[]> = {
  ATIVO: ['FERIAS', 'AFASTADO', 'LICENCA', 'INATIVO', 'DESLIGADO'],
  FERIAS: ['ATIVO', 'DESLIGADO'],
  AFASTADO: ['ATIVO', 'DESLIGADO'],
  LICENCA: ['ATIVO', 'DESLIGADO'],
  INATIVO: ['ATIVO', 'DESLIGADO'],
  DESLIGADO: [],
};
export function estadoAcesso(
  ativo: boolean | undefined,
): EstadoAcessoFuncionario {
  return ativo === undefined
    ? 'SEM_USUARIO'
    : ativo
      ? 'USUARIO_ATIVO'
      : 'USUARIO_INATIVO';
}
export function planejarSituacao(
  atual: StatusFuncionario,
  admissao: Date,
  ativo: boolean | undefined,
  dados: AlterarSituacaoFuncionarioDto,
  agora: Date,
) {
  if (!transicoes[atual].includes(dados.status))
    throw new BadRequestException(
      `Transição de ${atual} para ${dados.status} não permitida.`,
    );
  let dataDesligamento: Date | null = null;
  if (dados.status === 'DESLIGADO') {
    if (!dados.dataDesligamento)
      throw new BadRequestException('Informe a data de desligamento.');
    dataDesligamento = new Date(dados.dataDesligamento);
    if (Number.isNaN(dataDesligamento.getTime()))
      throw new BadRequestException('Data de desligamento inválida.');
    if (dataDesligamento < admissao)
      throw new BadRequestException(
        'Data de desligamento anterior à admissão.',
      );
    // Datas funcionais são comparadas por dia civil em UTC, inclusive quando
    // recebidas como ISO com offset. O horário de hoje não representa agendamento.
    if (
      dataDesligamento.toISOString().slice(0, 10) >
      agora.toISOString().slice(0, 10)
    )
      throw new BadRequestException(
        'Data de desligamento não pode ser futura.',
      );
  } else if (dados.dataDesligamento !== undefined) {
    throw new BadRequestException(
      'Data de desligamento só é permitida no desligamento.',
    );
  }
  const obrigatoria =
    dados.status === 'INATIVO' || dados.status === 'DESLIGADO';
  if (
    dados.status === 'ATIVO' &&
    dados.acaoAcesso === AcaoAcessoFuncionario.SUSPENDER
  )
    throw new BadRequestException(
      'O retorno para ATIVO preserva o acesso atual.',
    );
  if (
    ativo === undefined &&
    dados.acaoAcesso === AcaoAcessoFuncionario.SUSPENDER
  )
    throw new BadRequestException(
      'Funcionário não possui usuário para suspender.',
    );
  if (
    obrigatoria &&
    ativo === true &&
    dados.acaoAcesso === AcaoAcessoFuncionario.PRESERVAR
  )
    throw new BadRequestException('Esta situação exige suspensão do acesso.');
  if (
    !obrigatoria &&
    dados.status !== 'ATIVO' &&
    ativo === true &&
    dados.acaoAcesso === undefined
  )
    throw new BadRequestException(
      'Escolha PRESERVAR ou SUSPENDER para o acesso ativo.',
    );
  const suspender =
    ativo === true &&
    (obrigatoria || dados.acaoAcesso === AcaoAcessoFuncionario.SUSPENDER);
  return {
    dataDesligamento,
    suspender,
    acessoAnterior: estadoAcesso(ativo),
    acessoNovo: estadoAcesso(suspender ? false : ativo),
  };
}
