"use client";

import { Check, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Permissao } from "@/services/perfis.service";

type Props = {
  permissoes: Permissao[];
  selecionadas: Set<string>;
  onChange: (selecionadas: Set<string>) => void;
  disabled?: boolean;
};

function normalizar(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function SeletorPermissoes({
  permissoes,
  selecionadas,
  onChange,
  disabled = false,
}: Props) {
  const [busca, setBusca] = useState("");

  const permissoesFiltradas = useMemo(() => {
    const termo = normalizar(busca.trim());

    if (!termo) {
      return permissoes;
    }

    return permissoes.filter((permissao) =>
      normalizar(
        `${permissao.nome} ${permissao.chave} ${permissao.modulo}`,
      ).includes(termo),
    );
  }, [busca, permissoes]);

  const grupos = useMemo(() => {
    const resultado = new Map<string, Permissao[]>();

    for (const permissao of permissoesFiltradas) {
      const grupo = resultado.get(permissao.modulo) ?? [];
      grupo.push(permissao);
      resultado.set(permissao.modulo, grupo);
    }

    return [...resultado.entries()].sort(([a], [b]) =>
      a.localeCompare(b, "pt-BR"),
    );
  }, [permissoesFiltradas]);

  function alternar(permissaoId: string) {
    if (disabled) {
      return;
    }

    const proxima = new Set(selecionadas);

    if (proxima.has(permissaoId)) {
      proxima.delete(permissaoId);
    } else {
      proxima.add(permissaoId);
    }

    onChange(proxima);
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
        />

        <Input
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar permissão..."
          className="pl-9"
          aria-label="Buscar permissão"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-slate-500">
          {selecionadas.size} permissão(ões) selecionada(s)
        </span>

        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(new Set())}
            disabled={selecionadas.size === 0}
          >
            Limpar seleção
          </Button>
        )}
      </div>

      <ScrollArea className="h-[420px] rounded-md border">
        <div className="space-y-6 p-4">
          {grupos.map(([modulo, itens]) => (
            <section key={modulo} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold capitalize">
                  {modulo.replaceAll("_", " ")}
                </h3>

                <span className="text-xs text-slate-500">
                  {
                    itens.filter((item) =>
                      selecionadas.has(item.id),
                    ).length
                  }
                  /{itens.length}
                </span>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                {itens.map((permissao) => {
                  const selecionada = selecionadas.has(permissao.id);

                  return (
                    <Button
                      key={permissao.id}
                      type="button"
                      variant={selecionada ? "secondary" : "outline"}
                      className="h-auto min-h-16 justify-start whitespace-normal p-3 text-left"
                      aria-pressed={selecionada}
                      disabled={disabled}
                      onClick={() => alternar(permissao.id)}
                    >
                      <span className="flex w-full items-start gap-3">
                        <span
                          className={[
                            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border",
                            selecionada
                              ? "bg-primary text-primary-foreground"
                              : "bg-background",
                          ].join(" ")}
                          aria-hidden="true"
                        >
                          {selecionada && <Check className="size-3.5" />}
                        </span>

                        <span className="min-w-0">
                          <span className="block text-sm font-medium">
                            {permissao.nome}
                          </span>

                          <span className="mt-1 block break-all text-xs font-normal text-slate-500">
                            {permissao.chave}
                          </span>
                        </span>
                      </span>
                    </Button>
                  );
                })}
              </div>
            </section>
          ))}

          {grupos.length === 0 && (
            <div className="py-10 text-center text-sm text-slate-500">
              Nenhuma permissão encontrada.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
