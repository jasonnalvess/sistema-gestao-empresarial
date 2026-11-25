import Link from "next/link";
import {
  Boxes,
  Building2,
  CalendarDays,
  LayoutGrid,
  ShieldCheck,
  Wallet,
} from "lucide-react";

const funcionalidades = [
  {
    icone: Building2,
    titulo: "Gestão multiempresa",
    descricao:
      "Cada empresa com seus próprios dados, usuários e permissões, isolados por design.",
  },
  {
    icone: LayoutGrid,
    titulo: "Módulos por empresa",
    descricao:
      "Habilitação de módulos sob demanda, respeitando o perfil de cada empresa.",
  },
  {
    icone: Boxes,
    titulo: "Estoque e vendas",
    descricao:
      "Produtos, marcas, unidades de medida, movimentações, inventários e vendas.",
  },
  {
    icone: Wallet,
    titulo: "Financeiro e caixa",
    descricao:
      "Contas a pagar e a receber, categorias, depósitos e controle de caixa.",
  },
  {
    icone: CalendarDays,
    titulo: "Agenda e RH",
    descricao:
      "Compromissos da equipe e gestão de funcionários no contexto de cada empresa.",
  },
  {
    icone: ShieldCheck,
    titulo: "CRM e auditoria",
    descricao:
      "Clientes, fornecedores e ordens de serviço, com trilha de auditoria das operações.",
  },
];

const modulosRodape = [
  "Estoque",
  "Vendas",
  "Financeiro",
  "Caixa",
  "Agenda",
  "RH",
  "CRM",
  "Auditoria",
];

const itensMenuPainel = [
  "Dashboard",
  "Estoque",
  "Vendas",
  "Financeiro",
  "Agenda",
  "RH",
  "CRM",
];

const alturasGrafico = [10, 16, 8, 20, 14, 24, 12, 18, 9, 22, 15, 11];

const modulosPainel = ["Estoque", "Vendas", "Caixa", "Auditoria"];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-[#F4F7FC]">
      <main>
        <section className="relative overflow-hidden bg-[#101B33]">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
          <div
            aria-hidden="true"
            className="absolute -top-32 right-0 h-72 w-72 rounded-full bg-[#2563EB]/30 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-[#38BDF8]/10 blur-3xl"
          />

          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:py-24 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-1 text-sm font-medium text-sky-300">
                SGE — Sistema de Gestão Empresarial
              </span>

              <h1 className="mt-6 text-4xl font-bold tracking-tight text-white md:text-5xl">
                Gestão empresarial completa, integrada e multiempresa
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
                Plataforma SaaS multiempresa com controle de usuários e módulos,
                estoque e vendas, financeiro e caixa, agenda, recursos humanos,
                CRM e auditoria.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="w-full rounded-lg bg-[#2563EB] px-8 py-3 text-center font-medium text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101B33] sm:w-auto"
                >
                  Acessar sistema
                </Link>

                <a
                  href="#funcionalidades"
                  className="w-full rounded-lg border border-white/20 px-8 py-3 text-center font-medium text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101B33] sm:w-auto"
                >
                  Saiba mais
                </a>
              </div>
            </div>

            <div aria-hidden="true" className="relative min-w-0">
              <div className="absolute -inset-6 rounded-3xl bg-gradient-to-tr from-[#2563EB]/25 via-transparent to-[#38BDF8]/20 blur-2xl" />
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0B1526] shadow-2xl shadow-blue-950/40">
                <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                  <span className="ml-3 text-xs font-medium text-slate-400">
                    SGE — Painel da empresa
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[11rem_1fr]">
                  <aside className="hidden space-y-1.5 border-r border-white/10 p-4 sm:block">
                    <div className="rounded-lg border border-sky-400/30 bg-[#2563EB]/20 px-3 py-2 text-[11px] font-medium text-sky-300">
                      Empresa selecionada
                    </div>
                    {itensMenuPainel.map((item, indice) => (
                      <div
                        key={item}
                        className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[11px] ${
                          indice === 0
                            ? "bg-white/10 text-white"
                            : "text-slate-400"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                        {item}
                      </div>
                    ))}
                  </aside>

                  <div className="space-y-3 p-4">
                    <div className="grid grid-cols-3 gap-3">
                      {[0, 1, 2].map((posicao) => (
                        <div
                          key={posicao}
                          className="rounded-lg border border-white/10 bg-white/5 p-3"
                        >
                          <div className="h-1.5 w-10 rounded-full bg-white/20" />
                          <div className="mt-2 h-2 w-14 rounded-full bg-gradient-to-r from-[#38BDF8]/70 to-[#2563EB]/70" />
                        </div>
                      ))}
                    </div>

                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="h-1.5 w-16 rounded-full bg-white/20" />
                      <div className="mt-3 flex items-end gap-1.5">
                        {alturasGrafico.map((altura, indice) => (
                          <span
                            key={indice}
                            className="w-full rounded-t bg-gradient-to-t from-[#2563EB]/40 to-[#38BDF8]/60"
                            style={{ height: `${altura * 3}px` }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {modulosPainel.map((modulo) => (
                        <div
                          key={modulo}
                          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-300"
                        >
                          <span className="h-2 w-2 rounded bg-[#38BDF8]/70" />
                          {modulo}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="funcionalidades"
          className="scroll-mt-8 bg-[#F4F7FC] py-16 md:py-24"
        >
          <div className="mx-auto max-w-6xl px-6">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2563EB]">
              Funcionalidades
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#172033] md:text-4xl">
              O que o SGE entrega hoje
            </h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Módulos e recursos já implementados no sistema, organizados no
              contexto de cada empresa.
            </p>

            <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
              {funcionalidades.map((funcionalidade, indice) => {
                const largo = indice === 0 || indice === 3 || indice === 5;

                return (
                  <article
                    key={funcionalidade.titulo}
                    className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/50 md:p-7 ${
                      largo ? "md:col-span-2" : ""
                    }`}
                  >
                    <div
                      className={`flex gap-5 ${
                        largo ? "md:items-center" : "flex-col"
                      }`}
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1E40AF] text-white shadow-md shadow-blue-500/25">
                        <funcionalidade.icone
                          className="h-5 w-5"
                          aria-hidden="true"
                        />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[#172033]">
                          {funcionalidade.titulo}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                          {funcionalidade.descricao}
                        </p>
                      </div>
                    </div>
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-[#2563EB] to-[#38BDF8] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    />
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#101B33]">
          <div
            aria-hidden="true"
            className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#38BDF8]/10 blur-3xl"
          />
          <div className="relative mx-auto max-w-4xl px-6 py-20 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              Pronto para organizar a gestão da sua empresa?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-300">
              Acesse com suas credenciais e gerencie usuários, módulos, estoque,
              vendas, financeiro, caixa, agenda, RH, CRM e auditoria em um só
              lugar.
            </p>
            <div className="mt-8">
              <Link
                href="/login"
                className="inline-block rounded-lg bg-white px-8 py-3 font-medium text-[#172033] transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101B33]"
              >
                Acessar sistema
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#0B1526]">
        <div className="mx-auto max-w-6xl px-6 py-12 md:py-14">
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
            <div className="max-w-md">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2563EB] shadow-md shadow-blue-500/25"
                  aria-hidden="true"
                >
                  <span className="grid grid-cols-2 gap-[3px]">
                    <span className="h-1.5 w-1.5 rounded-[1px] bg-white" />
                    <span className="h-1.5 w-1.5 rounded-[1px] bg-white/70" />
                    <span className="h-1.5 w-1.5 rounded-[1px] bg-white/70" />
                    <span className="h-1.5 w-1.5 rounded-[1px] bg-white" />
                  </span>
                </span>
                <div>
                  <p className="font-semibold text-white">SGE</p>
                  <p className="text-xs text-slate-400">
                    Sistema de Gestão Empresarial
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                Plataforma SaaS multiempresa com controle de usuários e módulos,
                estoque e vendas, financeiro e caixa, agenda, recursos humanos,
                CRM e auditoria.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Módulos
              </p>
              <ul className="mt-4 grid grid-cols-2 gap-x-12 gap-y-2.5 text-sm text-slate-400">
                {modulosRodape.map((modulo) => (
                  <li key={modulo} className="flex items-center gap-2.5">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-[#38BDF8]/60"
                      aria-hidden="true"
                    />
                    {modulo}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6">
            <p className="text-xs text-slate-500">
              SGE — Sistema de Gestão Empresarial
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
