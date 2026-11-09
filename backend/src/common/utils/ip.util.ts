import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class IpUtil {
  /**
   * Recupera o IP real do cliente considerando a topologia:
   * Internet -> Cloudflare -> Cloudflare Tunnel -> Next.js -> NestJS
   *
   * O Cloudflare envia o IP real no cabeçalho 'cf-connecting-ip'.
   * O cabeçalho 'x-forwarded-for' pode conter múltiplos saltos.
   */
  getRealIp(req: Request): string {
    // 1. Identificação via cabeçalho interno de confiança.
    // De acordo com a topologia: Internet -> Cloudflare -> Tunnel -> Next.js -> NestJS,
    // o Next.js deve validar o IP e encaminhá-lo em um cabeçalho interno exclusivo.
    const internalIp = req.headers['x-sge-validated-ip'] as string;
    if (internalIp && this.isValidIp(internalIp)) {
      return internalIp;
    }

    // 2. Fallback seguro: se não houver cabeçalho interno, usamos o IP do socket.
    // Isso impede que clientes externos enviem cf-connecting-ip ou x-forwarded-for
    // para burlar o rate limit, pois esses headers serão ignorados.
    return req.socket.remoteAddress || '0.0.0.0';
  }

  private isValidIp(ip: string): boolean {
    if (!ip) return false;
    // Regex simplificada para validar IPv4 e IPv6
    const ipv4Regex =
      /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }
}
