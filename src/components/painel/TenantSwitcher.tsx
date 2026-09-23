import { Building2, Check, ChevronDown, ExternalLink, Globe, Settings2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useTenant } from "@/context/TenantContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function TenantSwitcher() {
  const { clinics, isGlobalAdmin, activeClinicId, activeClinic, activeSlug, setActiveClinicId } =
    useTenant();

  // Se o usuário só tem 1 clínica e não é admin global, exibe apenas o nome fixo
  if (!isGlobalAdmin && clinics.length <= 1) {
    const single = clinics[0];
    return (
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Building2 className="h-4 w-4" />
        </div>
        <span className="font-serif text-sm font-semibold truncate max-w-[200px]">
          {single?.name ?? "Consultório"}
        </span>
      </div>
    );
  }

  const currentLabel =
    activeClinicId === "todas"
      ? "Todas as Clínicas (Consolidado)"
      : (activeClinic?.name ?? "Selecionar Consultório");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 border-border/80 bg-background/60 hover:bg-muted/60 px-2.5 text-xs font-medium"
        >
          {activeClinicId === "todas" ? (
            <Globe className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Building2 className="h-3.5 w-3.5 text-primary" />
          )}
          <span className="max-w-[150px] sm:max-w-[220px] truncate text-foreground font-semibold">
            {currentLabel}
          </span>
          {isGlobalAdmin && (
            <Badge
              variant="secondary"
              className="hidden sm:inline-flex px-1.5 py-0 text-[10px] font-normal uppercase tracking-wider bg-primary/10 text-primary border-0"
            >
              Admin Geral
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-1.5 shadow-lg">
        <DropdownMenuLabel className="px-2 py-1.5 text-xs text-muted-foreground font-normal">
          Alternar Consultório Ativo
        </DropdownMenuLabel>

        {isGlobalAdmin && (
          <>
            <DropdownMenuItem
              className="cursor-pointer gap-2 py-2 px-2.5 rounded-lg font-medium text-xs flex items-center justify-between"
              onClick={() => setActiveClinicId("todas")}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="h-4 w-4 text-primary shrink-0" />
                <div className="truncate">
                  <div className="font-semibold text-foreground">Visão Global</div>
                  <div className="text-[11px] text-muted-foreground">
                    Ver dados consolidados de todas as clínicas
                  </div>
                </div>
              </div>
              {activeClinicId === "todas" && <Check className="h-4 w-4 text-primary shrink-0" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <div className="max-h-60 overflow-y-auto space-y-0.5">
          {clinics.map((c) => {
            const isSelected = activeClinicId === c.id;
            return (
              <DropdownMenuItem
                key={c.id}
                className="cursor-pointer gap-2 py-2 px-2.5 rounded-lg font-medium text-xs flex items-center justify-between"
                onClick={() => setActiveClinicId(c.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Building2
                    className={`h-4 w-4 shrink-0 ${
                      isSelected ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <div className="truncate">
                    <div className="truncate text-foreground font-medium">{c.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">/{c.slug}</div>
                  </div>
                </div>
                {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator />

        {isGlobalAdmin && (
          <DropdownMenuItem asChild className="cursor-pointer gap-2 py-1.5 px-2.5 text-xs">
            <Link to="/admin" className="flex items-center gap-2 text-primary font-medium">
              <Settings2 className="h-3.5 w-3.5" />
              <span>Gerenciar Consultórios & Equipe</span>
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem asChild className="cursor-pointer gap-2 py-1.5 px-2.5 text-xs">
          <a
            href={`/${activeSlug}/triagem`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Abrir Triagem Pública (/{activeSlug})</span>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
