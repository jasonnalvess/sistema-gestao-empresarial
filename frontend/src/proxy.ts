import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prepararHeadersIngresso } from "@/lib/ip-ingresso.mjs";

// Next.js 16: o antigo middleware foi renomeado para proxy.
// A função roda antes do rewrite /api -> NestJS e pode alterar request headers.
export function proxy(request: NextRequest) {
  return NextResponse.next({
    request: {
      headers: prepararHeadersIngresso(request.headers),
    },
  });
}

export const config = {
  matcher: "/api/:path*",
};
