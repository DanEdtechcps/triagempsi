import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isAccessDenied, accessDeniedMessage } from "@/lib/access-error";
import { addStaffAdmin, type AdminClinic } from "@/lib/admin.functions";

type ManagerAccessDialogProps = {
  clinic: AdminClinic;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Cria o login de quem vai gerenciar ESTA clínica — sempre papel 'admin'
 * escopado a `clinic.id` (RLS trata clinic_id preenchido como acesso local,
 * nunca global). Antes, isso só era possível na aba "Equipe médica", numa
 * tela desconectada da criação/edição do consultório e com um rótulo
 * enganoso ("Administrador Geral", que soa como admin da plataforma
 * inteira mesmo quando escopado a uma clínica só).
 */
export function ManagerAccessDialog({ clinic, open, onOpenChange }: ManagerAccessDialogProps) {
  const queryClient = useQueryClient();
  const addStaff = useServerFn(addStaffAdmin);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (saving) return;
    if (next) {
      setEmail("");
      setPassword("");
      setMsg(null);
    }
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await addStaff({
        data: {
          email: email.trim(),
          role: "admin",
          clinic_id: clinic.id,
          password: password || null,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-clinics"] });
      setMsg(
        res.already_linked
          ? "Esse e-mail já é gestor deste consultório."
          : res.created
            ? "Acesso do gestor criado com sucesso."
            : "E-mail já existente vinculado como gestor deste consultório.",
      );
      setTimeout(() => onOpenChange(false), 1200);
    } catch (err) {
      setMsg(
        isAccessDenied(err)
          ? accessDeniedMessage(err)
          : err instanceof Error
            ? err.message
            : "Não foi possível criar o acesso.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar acesso do gestor — {clinic.name}</DialogTitle>
          <DialogDescription>
            Este login entra só neste consultório (<code className="font-mono">/{clinic.slug}</code>
            ), com permissão total sobre ele — cadastrar médicos, ver triagens e editar a landing.
            Não é acesso à plataforma inteira.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="m-email">E-mail do gestor(a) *</Label>
            <Input
              id="m-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="gestor@clinica.com"
              required
              className="h-10 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-pass">Senha provisória (opcional)</Label>
            <Input
              id="m-pass"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres — se vazio, e-mail já existente é só vinculado"
              minLength={8}
              className="h-10 text-sm"
            />
          </div>

          {msg && (
            <p className="text-sm text-muted-foreground" role="status">
              {msg}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Criando…" : "Criar acesso do gestor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
