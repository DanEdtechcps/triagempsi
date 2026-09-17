import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  BookOpen,
  Building2,
  ClipboardList,
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
  Tags,
  TrendingUp,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BRANDING } from "@/config/branding";
import { GuardAreaProfissional } from "@/components/painel/GuardAreaProfissional";

/**
 * Layout do painel profissional. Toda página _authenticated passa por aqui,
 * então o GuardAreaProfissional protege todas de uma vez: pacientes logados
 * veem uma orientação clara em vez das telas da equipe.
 *
 * Mobile: navegação principal fica em uma barra inferior fixa (5 destinos) e
 * os demais links vivem na gaveta "Menu" — sem rolagem horizontal.
 * Desktop: mantém a faixa de abas no topo.
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

type NavLink = { to: string; label: string; icon?: ReactNode };

const TAB_LINKS: (NavLink & { icon: ReactNode })[] = [
  { to: "/painel", label: "Triagens", icon: <ClipboardList className="h-5 w-5" /> },
  { to: "/contatos", label: "Contatos", icon: <Users className="h-5 w-5" /> },
  { to: "/evolucao", label: "Evolução", icon: <TrendingUp className="h-5 w-5" /> },
  { to: "/resumo", label: "Resumo", icon: <BarChart3 className="h-5 w-5" /> },
];

const MENU_GROUPS: { title: string; links: (NavLink & { icon: ReactNode })[] }[] = [
  {
    title: "Clínica",
    links: [
      { to: "/protocolo", label: "Protocolo", icon: <GitBranch className="h-4 w-4" /> },
      { to: "/ocupacional", label: "NR-01 (ocupacional)", icon: <HardHat className="h-4 w-4" /> },
      { to: "/evolucao", label: "Evolução", icon: <TrendingUp className="h-4 w-4" /> },
    ],
  },
  {
    title: "Referência",
    links: [
      { to: "/referencias", label: "Evidências", icon: <BookOpen className="h-4 w-4" /> },
      { to: "/interpretar", label: "Como interpretar", icon: <Lightbulb className="h-4 w-4" /> },
      { to: "/materiais", label: "Materiais", icon: <FolderOpen className="h-4 w-4" /> },
      { to: "/ajuda", label: "Ajuda", icon: <LifeBuoy className="h-4 w-4" /> },
    ],
  },
  {
    title: "Sistema",
    links: [
      { to: "/auditoria", label: "Auditoria", icon: <ScrollText className="h-4 w-4" /> },
      { to: "/emails", label: "E-mails", icon: <Mail className="h-4 w-4" /> },
      { to: "/roadmap", label: "Roadmap", icon: <Map className="h-4 w-4" /> },
      { to: "/changelog", label: "Changelog", icon: <History className="h-4 w-4" /> },
      { to: "/admin", label: "Consultórios", icon: <Building2 className="h-4 w-4" /> },
      { to: "/meta-landing", label: "Metatags", icon: <Tags className="h-4 w-4" /> },
      { to: "/senha", label: "Minha senha", icon: <KeyRound className="h-4 w-4" /> },
    ],
  },
];

const DESKTOP_LINKS: NavLink[] = [
  { to: "/painel", label: "Triagens" },
  { to: "/protocolo", label: "Protocolo" },
  { to: "/referencias", label: "Evidências" },
  { to: "/evolucao", label: "Evolução" },
  { to: "/ocupacional", label: "NR-01" },
  { to: "/interpretar", label: "Como interpretar" },
  { to: "/auditoria", label: "Auditoria" },
  { to: "/contatos", label: "Contatos" },
  { to: "/emails", label: "E-mails" },
  { to: "/resumo", label: "Resumo" },
  { to: "/materiais", label: "Materiais" },
  { to: "/ajuda", label: "Ajuda" },
  { to: "/roadmap", label: "Roadmap" },
  { to: "/admin", label: "Consultórios" },
  { to: "/meta-landing", label: "Metatags" },
  { to: "/changelog", label: "Changelog" },
  { to: "/senha", label: "Minha senha" },
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const isActive = (to: string) =>
    to === "/painel"
      ? pathname === "/painel" || pathname.startsWith("/painel/")
      : pathname === to || pathname.startsWith(`${to}/`);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card print:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {BRANDING.logoUrl && (
              <img
                src={BRANDING.logoUrl}
                alt=""
                className="h-8 w-8 shrink-0 rounded-md object-cover"
              />
            )}
            <div className="min-w-0">
              <div className="truncate font-serif text-base font-semibold sm:text-lg">
                {title}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {BRANDING.clinicName}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {action}
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="hidden sm:inline-flex"
            >
              Sair
            </Button>
          </div>
        </div>
        {/* Navegação em abas — apenas desktop */}
        <nav className="mx-auto hidden max-w-6xl gap-4 overflow-x-auto px-4 pb-2 text-sm whitespace-nowrap sm:flex sm:px-6">
          {DESKTOP_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeProps={{ className: "text-foreground font-medium" }}
              className="text-muted-foreground hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-6 pb-28 sm:px-6 sm:py-8">
        {children}
      </main>

      {/* Barra inferior — apenas mobile */}
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur print:hidden sm:hidden"
      >
        <div className="grid grid-cols-5">
          {TAB_LINKS.map((l) => {
            const ativo = isActive(l.to);
            return (
              <Link
                key={l.to}
                to={l.to}
                aria-current={ativo ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                  ativo ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {l.icon}
                {l.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
              menuAberto ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <MenuIcon className="h-5 w-5" />
            Menu
          </button>
        </div>
      </nav>

      {/* Gaveta com todos os destinos — mobile */}
      <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="pb-2 text-left">
            <SheetTitle className="font-serif">Menu do consultório</SheetTitle>
          </SheetHeader>
          <div className="space-y-5">
            {MENU_GROUPS.map((grupo) => (
              <div key={grupo.title}>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {grupo.title}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {grupo.links.map((l) => {
                    const ativo = isActive(l.to);
                    return (
                      <Link
                        key={l.to}
                        to={l.to}
                        onClick={() => setMenuAberto(false)}
                        className={`flex min-h-11 items-center gap-2.5 rounded-lg border px-3 py-2 text-sm ${
                          ativo
                            ? "border-primary/40 bg-primary/10 font-medium text-foreground"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span className={ativo ? "text-primary" : ""}>{l.icon}</span>
                        {l.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full min-h-11 gap-2 text-destructive"
              onClick={() => void signOut()}
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
      ? "bg-destructive/12 text-destructive border-destructive/30"
      : level === 3
        ? "bg-warning/15 text-warning-foreground border-warning/30"
        : level === 2
          ? "bg-accent/40 text-accent-foreground border-accent"
          : "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}
