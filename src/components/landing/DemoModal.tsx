import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Check, Copy, Sparkles } from "lucide-react";
import { maskPhoneBR } from "@/lib/masks";
import { waLink } from "@/lib/phone";

export function DemoModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [clinic, setClinic] = useState("");
  const [copied, setCopied] = useState(false);

  // Número comercial de WhatsApp (configurável via env ou fallback direto)
  const commercialPhone =
    (typeof import.meta !== "undefined" &&
      (import.meta as unknown as { env: Record<string, string> }).env?.VITE_COMMERCIAL_WHATSAPP) ||
    "5519997116568";
  const contactEmail = "contato@triagempsi.com.br";

  function handleDirectWhatsApp() {
    const message =
      "Olá! Gostaria de agendar uma demonstração da plataforma TriagemPsi para o meu consultório.";
    window.open(waLink(commercialPhone, message), "_blank", "noopener,noreferrer");
    onOpenChange(false);
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const details = [
      "Olá! Gostaria de agendar uma demonstração prática do TriagemPsi.",
      name.trim() ? `• Nome: ${name.trim()}` : "",
      clinic.trim() ? `• Clínica/Consultório: ${clinic.trim()}` : "",
      phone.trim() ? `• WhatsApp para retorno: ${phone.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    window.open(waLink(commercialPhone, details), "_blank", "noopener,noreferrer");
    onOpenChange(false);
  }

  function handleCopyEmail() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(contactEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-ivory/15 bg-[#0e1619] text-ivory sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold mb-2">
            <Sparkles className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center font-serif text-2xl font-normal text-ivory">
            Agendar Demonstração
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-ivory/60">
            Conheça o painel com dados clínicos em uma sessão prática de 20 minutos com nossa
            equipe.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          {/* Botão de WhatsApp Direto (Sem atrito e sem erro de mailto) */}
          <button
            type="button"
            onClick={handleDirectWhatsApp}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-emerald-500 active:scale-[0.98]"
          >
            <MessageCircle className="h-5 w-5" />
            <span>Falar agora no WhatsApp</span>
          </button>

          <div className="relative flex items-center justify-center text-xs text-ivory/40">
            <span className="w-full border-t border-ivory/10" />
            <span className="bg-[#0e1619] px-3 uppercase tracking-wider text-[0.65rem]">
              Ou informe seus dados
            </span>
            <span className="w-full border-t border-ivory/10" />
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-3">
            <div>
              <Label htmlFor="demo-name" className="text-xs text-ivory/70">
                Seu nome / CRM
              </Label>
              <Input
                id="demo-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Dr. Roberto Silva"
                className="mt-1 h-10 border-ivory/15 bg-ivory/5 text-sm text-ivory placeholder:text-ivory/30 focus-visible:border-gold"
              />
            </div>

            <div>
              <Label htmlFor="demo-clinic" className="text-xs text-ivory/70">
                Nome da clínica / consultório
              </Label>
              <Input
                id="demo-clinic"
                value={clinic}
                onChange={(e) => setClinic(e.target.value)}
                placeholder="Ex.: Saraiva Psiquiatria"
                className="mt-1 h-10 border-ivory/15 bg-ivory/5 text-sm text-ivory placeholder:text-ivory/30 focus-visible:border-gold"
              />
            </div>

            <div>
              <Label htmlFor="demo-phone" className="text-xs text-ivory/70">
                WhatsApp de contato
              </Label>
              <Input
                id="demo-phone"
                value={phone}
                onChange={(e) => setPhone(maskPhoneBR(e.target.value))}
                placeholder="(DD) 99999-9999"
                className="mt-1 h-10 border-ivory/15 bg-ivory/5 text-sm text-ivory placeholder:text-ivory/30 focus-visible:border-gold"
              />
            </div>

            <Button
              type="submit"
              className="w-full rounded-xl border border-gold/40 bg-gold/15 py-3 text-sm font-medium text-gold hover:bg-gold/25"
            >
              Iniciar agendamento
            </Button>
          </form>

          {/* Fallback de E-mail sem mailto quebrado */}
          <div className="pt-2 text-center text-xs text-ivory/40">
            <span>Prefere contato por e-mail? </span>
            <button
              type="button"
              onClick={handleCopyEmail}
              className="inline-flex items-center gap-1 font-medium text-ivory/70 underline underline-offset-2 hover:text-gold"
              title="Copiar e-mail"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">E-mail copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>{contactEmail}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
