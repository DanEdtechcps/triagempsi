import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import type { MyAccess } from "@/lib/painel.functions";

export type ClinicOption = {
  id: string;
  name: string;
  slug: string;
};

interface TenantContextType {
  clinics: ClinicOption[];
  isGlobalAdmin: boolean;
  activeClinicId: string; // "todas" or a clinic UUID
  activeClinic: ClinicOption | null; // null when "todas"
  activeSlug: string; // slug of active clinic or first clinic
  setActiveClinicId: (id: string) => void;
}

const TenantContext = createContext<TenantContextType | null>(null);

const STORAGE_KEY = "triagem_active_clinic_id";

export function TenantProvider({
  access,
  children,
}: {
  access: MyAccess | undefined;
  children: React.ReactNode;
}) {
  const clinics = useMemo(() => access?.clinics ?? [], [access?.clinics]);
  const isGlobalAdmin = Boolean(access?.global);

  const [activeClinicId, setActiveClinicIdState] = useState<string>(() => {
    if (typeof window === "undefined") return "todas";
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ?? "todas";
  });

  // Validar se o activeClinicId salvo ainda é válido para este usuário
  useEffect(() => {
    if (clinics.length === 0) return;
    if (activeClinicId !== "todas" && !clinics.some((c) => c.id === activeClinicId)) {
      // Se não for admin global ou o id salvo não existir mais, seleciona o primeiro
      const defaultId = isGlobalAdmin ? "todas" : clinics[0].id;
      setActiveClinicIdState(defaultId);
      localStorage.setItem(STORAGE_KEY, defaultId);
    }
  }, [clinics, isGlobalAdmin, activeClinicId]);

  const setActiveClinicId = (id: string) => {
    setActiveClinicIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, id);
      window.dispatchEvent(new CustomEvent("tenant-changed", { detail: id }));
    }
  };

  const activeClinic = useMemo(() => {
    if (activeClinicId === "todas") return null;
    return clinics.find((c) => c.id === activeClinicId) ?? null;
  }, [clinics, activeClinicId]);

  const activeSlug = useMemo(() => {
    if (activeClinic) return activeClinic.slug;
    return clinics[0]?.slug ?? "saraiva";
  }, [activeClinic, clinics]);

  const value = useMemo(
    () => ({
      clinics,
      isGlobalAdmin,
      activeClinicId,
      activeClinic,
      activeSlug,
      setActiveClinicId,
    }),
    [clinics, isGlobalAdmin, activeClinicId, activeClinic, activeSlug]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error("useTenant deve ser usado dentro de um TenantProvider");
  }
  return ctx;
}
