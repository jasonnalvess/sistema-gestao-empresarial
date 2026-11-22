import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { isIP } from 'node:net';

const VALIDATED_IP_HEADER = 'x-sge-validated-ip';

@Injectable()
export class IpUtil {
  /**
   * Recupera o IP real do cliente considerando a topologia:
   * Internet -> Cloudflare -> Cloudflare Tunnel -> Next.js -> NestJS
   *
   * A confiança está no ingresso do Next.js, que remove qualquer valor enviado
   * pelo cliente e define 'x-sge-validated-ip' a partir do 'cf-connecting-ip'
   * entregue pelo Cloudflare. Headers públicos como 'x-forwarded-for' e
   * 'cf-connecting-ip' não são lidos diretamente aqui.
   */
  getRealIp(req: Request): string {
    // 1. Identificação via cabeçalho interno de confiança.
    const trustedIp = this.getTrustedIp(req);
    if (trustedIp) {
      return trustedIp;
    }

    // 2. Fallback seguro: sem o cabeçalho interno, usamos o IP do socket.
    // Esses headers públicos são ignorados para impedir bypass do rate limit.
    const socketIp = req.socket?.remoteAddress;
    return typeof socketIp === 'string' && socketIp.length > 0
      ? socketIp
      : '0.0.0.0';
  }

  /**
   * Retorna somente o IP entregue pelo ingresso confiável, sem fallback de
   * socket. O cabeçalho só é aceito como string única, sem listas, e com IP
   * válido; caso contrário retorna null.
   */
  getTrustedIp(req: Request): string | null {
    const header = req.headers?.[VALIDATED_IP_HEADER];
    if (typeof header !== 'string') {
      return null;
    }

    const candidato = header.trim();
    return this.isValidIp(candidato) ? candidato : null;
  }

  private isValidIp(ip: string): boolean {
    if (!ip || ip.includes(',')) {
      return false;
    }

    // isIP aceita IPv4, IPv6 completo e IPv6 comprimido.
    return isIP(ip) !== 0;
  }
}
