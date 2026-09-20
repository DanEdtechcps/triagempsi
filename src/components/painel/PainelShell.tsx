import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo, type ReactNode } from "react";
import {
  BookOpen,
  Building2,
  Check,
  ChevronDown,
  ClipboardList,
  Copy,
  ExternalLink,
  FolderOpen,
  GitBranch,
  HardHat,
  History,
  KeyRound,
  LifeBuoy,
  Lightbulb,
  LogOut,
  Mail,
  Map,
  Menu as MenuIcon,
  BarChart3,
  ScrollText,
  Sparkles,
  Tags,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BRANDING } from "@/config/branding";
import { GuardAreaProfissional } from "@/components/painel/GuardAreaProfissional";
import { getMyAccess } from "@/lib/painel.functions";

/**
 * Layout do painel profissional (Cockpit Médico).
 * Toda página _authenticated passa por aqui.
 * 
 * Desktop (>= 768px):
 * - 4 abas clínicas diárias no topo (Triagens, Pacientes, Evolução, Indicadores)
 * - Menu suspenso "Diretrizes Clínicas" (Protocolo, Interpretação, Evidências, Materiais, NR-01)
 * - Ações rápidas no topo: Copiar Link da Triagem + Ver Triagem Pública
 * - Menu do Usuário: Consultórios, Senha, Auditoria, Metatags e Logout
 * 
 * Mobile (< 768px):
 * - Barra inferior fixa ergonômica com os fluxos mais usados
 * - Gaveta (Hub) categorizada com touch targets confortáveis (>= 48px)
 */
export function PainelShell(props: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <GuardAreaProfissional>
      <PainelShellContent {...props} />
    </GuardAreaProfissional>
  );
}

type NavLink = {
  to: string;
  label: string;
  description?: string;
  icon: ReactNode;
};

// 4 Pilares de Atendimento Clínico Diário
const CLINICAL_TABS: NavLink[] = [
  {
    to: "/painel",
    label: "Triagens",
    icon: <ClipboardList className="h-4 w-4" />,
  },
  {
    to: "/contatos",
    label: "Pacientes",
    icon: <Users className="h-4 w-4" />,
  },
  {
    to: "/evolucao",
    label: "Evolução",
    icon: <TrendingUp className="h-4 w-4" />,
  },
  {
    to: "/resumo",
    label: "Indicadores",
    icon: <BarChart3 className="h-4 w-4" />,
  },
];

// Diretrizes & Apoio Clínico
const CLINICAL_GUIDELINES: NavLink[] = [
  {
    to: "/protocolo",
    label: "Protocolo de Triagem",
    description: "Árvore de decisão clínica e fluxos",
    icon: <GitBranch className="h-4 w-4 text-emerald-600" />,
  },
  {
    to: "/interpretar",
    label: "Como Interpretar Escalas",
    description: "Pontos de corte e faixas de severidade",
    icon: <Lightbulb className="h-4 w-4 text-amber-600" />,
  },
  {
    to: "/referencias",
    label: "Evidências & Validações",
    description: "Propriedades psicométricas das 28 escalas",
    icon: <BookOpen className="h-4 w-4 text-blue-600" />,
  },
  {
    to: "/materiais",
    label: "Materiais Clínicos",
    description: "Modelos e materiais de apoio impresso",
    icon: <FolderOpen className="h-4 w-4 text-indigo-600" />,
  },
  {
    to: "/ocupacional",
    label: "NR-01 Ocupacional",
    description: "Riscos psicossociais no ambiente de trabalho",
    icon: <HardHat className="h-4 w-4 text-orange-600" />,
  },
];

// Grupos para a Gaveta Mobile (Hub)
const MOBILE_MENU_GROUPS: { title: string; links: NavLink[] }[] = [
  {
    title: "Atendimento Clínico",
    links: CLINICAL_TABS,
  },
  {
    title: "Diretrizes & Escalas",
    links: CLINICAL_GUIDELINES,
  },
  {
    title: "Consultório & Gestão",
    links: [
      {
        to: "/admin",
        label: "Consultórios & Equipe",
        icon: <Building2 className="h-4 w-4 text-primary" />,
      },
      {
        to: "/senha",
        label: "Minha Senha",
        icon: <KeyRound className="h-4 w-4 text-muted-foreground" />,
      },
    ],
  },
  {
    title: "Sistema & Governança",
    links: [
      {
        to: "/auditoria",
        label: "Auditoria & LGPD",
        icon: <ScrollText className="h-4 w-4 text-muted-foreground" />,
      },
      {
        to: "/emails",
        label: "Histórico de E-mails",
        icon: <Mail className="h-4 w-4 text-muted-foreground" />,
      },
      {
        to: "/meta-landing",
        label: "Metatags da Landing",
        icon: <Tags className="h-4 w-4 text-muted-foreground" />,
      },
      {
        to: "/roadmap",
        label: "Roadmap",
        icon: <Map className="h-4 w-4 text-muted-foreground" />,
      },
      {
        to: "/changelog",
        label: "Changelog",
        icon: <History className="h-4 w-4 text-muted-foreground" />,
      },
      {
        to: "/ajuda",
        label: "Ajuda & Suporte",
        icon: <LifeBuoy className="h-4 w-4 text-muted-foreground" />,
      },
    ],
  },
];

function PainelShellContent({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [menuAberto, setMenuAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const fetchAccess = useServerFn(getMyAccess);
  const { data: access } = useQuery({
    queryKey: ["my-access"],
    queryFn: () => fetchAccess({}),
    staleTime: 5 * 60 * 1000,
  });

  const activeClinic = access?.clinics?.[0];
  const activeSlug = activeClinic?.slug ?? "saraiva";
  const clinicDisplayName = activeClinic?.name ?? BRANDING.clinicName;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function handleCopyLink() {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/${activeSlug}/triagem`;
    void navigator.clipboard?.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  const isActive = (to: string) =>
    to === "/painel"
      ? pathname === "/painel" || pathname.startsWith("/painel/")
      : pathname === to || pathname.startsWith(`${to}/`);

  const isGuidelinesActive = CLINICAL_GUIDELINES.some((g) => isActive(g.to));

  const mobileGroups = useMemo(() => {
    return MOBILE_MENU_GROUPS.map((grupo) => ({
      ...grupo,
      links: grupo.links.filter((l) => (l.to === "/admin" ? Boolean(access?.global) : true)),
    })).filter((grupo) => grupo.links.length > 0);
  }, [access?.global]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header Principal */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          {/* Lado Esquerdo: Identidade do Consultório */}
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/painel" className="flex items-center gap-2.5 min-w-0">
              {BRANDING.logoUrl ? (
                <img
                  src={BRANDING.logoUrl}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-md object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate font-serif text-sm font-semibold sm:text-base leading-tight">
                  {clinicDisplayName}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  Cockpit Clínico
                </div>
              </div>
            </Link>
          </div>

          {/* Lado Direito: Ações Rápidas & Menu do Usuário */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Botão Copiar Link da Triagem */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="h-8 gap-1.5 px-2.5 text-xs font-medium"
              title="Copiar link público para envio aos pacientes"
            >
              {copiado ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-700 dark:text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Copiar link</span>
                </>
              )}
            </Button>

            {/* Link para Visualizar como Paciente */}
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="hidden h-8 gap-1.5 px-2 text-xs font-medium md:inline-flex"
            >
              <a
                href={`/${activeSlug}/triagem`}
                target="_blank"
                rel="noreferrer"
                title="Abrir a jornada do paciente em nova aba"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Ver como paciente</span>
              </a>
            </Button>

            {/* Ação contextual da página atual (se houver) */}
            {action}

            {/* Menu do Usuário / Configurações (Desktop) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden h-8 gap-1.5 px-2 text-xs font-medium sm:inline-flex"
                >
                  <User className="h-3.5 w-3.5" />
                  <span className="max-w-[120px] truncate">
                    {access?.isAdmin ? "Admin" : "Médico"}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{clinicDisplayName}</p>
                    <p className="text-xs text-muted-foreground leading-none">
                      {access?.global ? "Acesso Global" : "Acesso de Consultório"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {access?.global && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        Consultórios & Equipe
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/senha" className="cursor-pointer gap-2">
                      <KeyRound className="h-4 w-4 text-muted-foreground" />
                      Minha Senha
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Sistema & Governança
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link to="/auditoria" className="cursor-pointer gap-2">
                      <ScrollText className="h-4 w-4 text-muted-foreground" />
                      Auditoria & LGPD
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/emails" className="cursor-pointer gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      E-mails
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/meta-landing" className="cursor-pointer gap-2">
                      <Tags className="h-4 w-4 text-muted-foreground" />
                      Metatags
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/roadmap" className="cursor-pointer gap-2">
                      <Map className="h-4 w-4 text-muted-foreground" />
                      Roadmap
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/changelog" className="cursor-pointer gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      Changelog
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/ajuda" className="cursor-pointer gap-2">
                      <LifeBuoy className="h-4 w-4 text-muted-foreground" />
                      Ajuda
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => void signOut()}
                  className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Sair da conta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Barra de Navegação Desktop (4 Pilares + Diretrizes Clínicas) */}
        <nav className="mx-auto hidden max-w-6xl items-center justify-between border-t border-border/50 px-4 py-1.5 sm:flex sm:px-6">
          <div className="flex items-center gap-1">
            {CLINICAL_TABS.map((tab) => {
              const ativo = isActive(tab.to);
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    ativo
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </Link>
              );
            })}

            {/* Separador vertical sutil */}
            <div className="mx-2 h-4 w-px bg-border/80" />

            {/* Dropdown de Diretrizes Clínicas */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    isGuidelinesActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <GitBranch className="h-3.5 w-3.5 text-primary" />
                  <span>Diretrizes Clínicas</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 p-1.5">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Protocolos & Escalas
                </DropdownMenuLabel>
                {CLINICAL_GUIDELINES.map((guide) => (
                  <DropdownMenuItem key={guide.to} asChild className="p-2 cursor-pointer">
                    <Link to={guide.to} className="flex items-start gap-2.5">
                      <span className="mt-0.5 shrink-0">{guide.icon}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-medium">{guide.label}</div>
                        {guide.description && (
                          <div className="text-[11px] text-muted-foreground leading-tight">
                            {guide.description}
                          </div>
                        )}
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Indicador sutil de página atual */}
          <div className="hidden text-xs text-muted-foreground lg:block">
            {title}
          </div>
        </nav>
      </header>

      {/* Conteúdo da Página */}
      <main className="mx-auto max-w-6xl px-4 pt-4 pb-28 sm:px-6 sm:py-6">
        {children}
      </main>

      {/* Barra Inferior Fixa — Apenas Mobile (< 640px) */}
      <nav
        aria-label="Navegação principal mobile"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur print:hidden sm:hidden"
      >
        <div className="grid grid-cols-5">
          {CLINICAL_TABS.map((tab) => {
            const ativo = isActive(tab.to);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                aria-current={ativo ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors ${
                  ativo ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            className={`flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors ${
              menuAberto ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MenuIcon className="h-4 w-4" />
            Hub
          </button>
        </div>
      </nav>

      {/* Gaveta do Hub Clínico — Mobile */}
      <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
        <SheetContent
          side="bottom"
          className="max-h-[88vh] overflow-y-auto rounded-t-2xl px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="pb-3 text-left border-b border-border">
            <SheetTitle className="font-serif text-lg">Hub do Consultório</SheetTitle>
            <p className="text-xs text-muted-foreground">
              {clinicDisplayName} · Dr. José Ribamar F. Saraiva Jr.
            </p>
          </SheetHeader>

          {/* Ações Rápidas no topo da gaveta */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handleCopyLink();
                setMenuAberto(false);
              }}
              className="min-h-11 justify-center gap-2 text-xs"
            >
              {copiado ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  Link Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar Triagem
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="min-h-11 justify-center gap-2 text-xs"
            >
              <a
                href={`/${activeSlug}/triagem`}
                target="_blank"
                rel="noreferrer"
                onClick={() => setMenuAberto(false)}
              >
                <ExternalLink className="h-4 w-4" />
                Ver Triagem
              </a>
            </Button>
          </div>

          <div className="mt-5 space-y-6">
            {mobileGroups.map((grupo) => (
              <div key={grupo.title}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {grupo.title}
                </p>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {grupo.links.map((l) => {
                    const ativo = isActive(l.to);
                    return (
                      <Link
                        key={l.to}
                        to={l.to}
                        onClick={() => setMenuAberto(false)}
                        className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                          ativo
                            ? "border-primary/40 bg-primary/10 font-semibold text-primary"
                            : "border-border bg-card text-foreground hover:border-primary/40"
                        }`}
                      >
                        <span className={ativo ? "text-primary" : "text-muted-foreground"}>
                          {l.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{l.label}</div>
                          {l.description && (
                            <div className="truncate text-xs text-muted-foreground">
                              {l.description}
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              className="w-full min-h-12 gap-2 text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setMenuAberto(false);
                void signOut();
              }}
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function BandBadge({ level, label }: { level: number; label: string }) {
  const cls =
    level >= 4
      ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
      : level === 3
        ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
        : level === 2
          ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-800 dark:text-yellow-300"
          : "border-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}
