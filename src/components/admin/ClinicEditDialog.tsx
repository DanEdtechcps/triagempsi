import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ColorField } from "@/components/admin/ColorField";
import { FontPresetPicker } from "@/components/admin/FontPresetPicker";
import { maskPhoneBR } from "@/lib/masks";
import { fileToBase64 } from "@/lib/file-to-base64";
import { GENERIC_BRANDING, resolveBranding } from "@/config/branding";
import type { FontPresetKey } from "@/config/font-presets";
import { updateClinicAdmin, uploadClinicAsset, type AdminClinic } from "@/lib/admin.functions";

type FeatureCardDraft = { title: string; description: string };

type FormState = {
  name: string;
  tagline: string;
  short_tagline: string;
  doctor_name: string;
  doctor_credentials: string;
  city: string;
  contact_email: string;
  contact_phone: string;
  website_url: string;
  primary_color: string;
  accent_color: string;
  logo_url: string;
  about: string;
  intro_copy: string;
  done_copy: string;
  disclaimer: string;
  landing_headline: string;
  landing_font_preset: FontPresetKey;
  landing_feature_cards: FeatureCardDraft[];
  landing_hero_image_url: string;
};

function toFormState(clinic: AdminClinic): FormState {
  // resolveBranding() já resolve headline/cards/fonte/hero com o mesmo
  // fallback genérico usado na landing pública — reaproveita a mesma fonte
  // de verdade em vez de duplicar os defaults aqui.
  const branding = resolveBranding(clinic);
  return {
    name: clinic.name,
    tagline: clinic.tagline ?? "",
    short_tagline: clinic.short_tagline ?? "",
    doctor_name: clinic.doctor_name ?? "",
    doctor_credentials: clinic.doctor_credentials ?? "",
    city: clinic.city ?? "",
    contact_email: clinic.contact_email ?? "",
    contact_phone: clinic.contact_phone ?? "",
    website_url: clinic.website_url ?? "",
    primary_color: clinic.primary_color ?? branding.primaryColor,
    accent_color: clinic.accent_color ?? branding.accentColor,
    logo_url: clinic.logo_url ?? "",
    about: clinic.about ?? "",
    intro_copy: clinic.intro_copy ?? "",
    done_copy: clinic.done_copy ?? "",
    disclaimer: clinic.disclaimer ?? "",
    landing_headline: clinic.landing_headline ?? "",
    landing_font_preset: branding.landingFontPreset,
    landing_feature_cards: branding.featureCards.map((c) => ({ ...c })),
    landing_hero_image_url: clinic.landing_hero_image_url ?? "",
  };
}

type ClinicEditDialogProps = {
  clinic: AdminClinic;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ClinicEditDialog({ clinic, open, onOpenChange }: ClinicEditDialogProps) {
  const queryClient = useQueryClient();
  const save = useServerFn(updateClinicAdmin);
  const upload = useServerFn(uploadClinicAsset);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(() => toFormState(clinic));
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (saving) return;
    if (next) setForm(toFormState(clinic));
    setMsg(null);
    onOpenChange(next);
  }

  const set =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) =>
      setForm((f) => ({ ...f, [key]: value }));

  function updateCard(index: number, patch: Partial<FeatureCardDraft>) {
    setForm((f) => ({
      ...f,
      landing_feature_cards: f.landing_feature_cards.map((c, i) =>
        i === index ? { ...c, ...patch } : c,
      ),
    }));
  }

  function addCard() {
    if (form.landing_feature_cards.length >= 5) return;
    setForm((f) => ({
      ...f,
      landing_feature_cards: [...f.landing_feature_cards, { title: "", description: "" }],
    }));
  }

  function removeCard(index: number) {
    if (form.landing_feature_cards.length <= 2) return;
    setForm((f) => ({
      ...f,
      landing_feature_cards: f.landing_feature_cards.filter((_, i) => i !== index),
    }));
  }

  async function handleUpload(file: File, kind: "logos" | "hero") {
    const setUploading = kind === "logos" ? setUploadingLogo : setUploadingHero;
    const field = kind === "logos" ? "logo_url" : "landing_hero_image_url";
    const inputRef = kind === "logos" ? logoInputRef : heroInputRef;
    setUploading(true);
    setMsg(null);
    try {
      const base64 = await fileToBase64(file);
      const { url } = await upload({
        data: {
          clinic_id: clinic.id,
          kind,
          fileName: file.name,
          contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
          base64,
        },
      });
      set(field)(url);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Não foi possível enviar a imagem.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await save({
        data: {
          id: clinic.id,
          name: form.name.trim(),
          tagline: form.tagline.trim() || null,
          short_tagline: form.short_tagline.trim() || null,
          doctor_name: form.doctor_name.trim() || null,
          doctor_credentials: form.doctor_credentials.trim() || null,
          city: form.city.trim() || null,
          contact_email: form.contact_email.trim() || "",
          contact_phone: form.contact_phone.trim() || null,
          website_url: form.website_url.trim() || "",
          primary_color: form.primary_color || null,
          accent_color: form.accent_color || null,
          logo_url: form.logo_url.trim() || "",
          about: form.about.trim() || null,
          intro_copy: form.intro_copy.trim() || null,
          done_copy: form.done_copy.trim() || null,
          // disclaimer é NOT NULL no banco — nunca envia vazio.
          disclaimer: form.disclaimer.trim() || GENERIC_BRANDING.disclaimer,
          landing_headline: form.landing_headline.trim() || null,
          landing_font_preset: form.landing_font_preset,
          landing_feature_cards: form.landing_feature_cards.map((c) => ({
            title: c.title.trim(),
            description: c.description.trim(),
          })),
          landing_hero_image_url: form.landing_hero_image_url.trim() || "",
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-clinics"] });
      setMsg("Consultório atualizado.");
      onOpenChange(false);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar {clinic.name}</DialogTitle>
          <DialogDescription>
            Endereço público <code className="font-mono">/{clinic.slug}</code> — o slug não pode ser
            alterado aqui para não quebrar links já distribuídos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Identidade</h3>
            <div className="space-y-1.5">
              <Label htmlFor="e-name">Nome</Label>
              <Input
                id="e-name"
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                required
                maxLength={120}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="e-tagline">Frase de apresentação</Label>
                <Input
                  id="e-tagline"
                  value={form.tagline}
                  onChange={(e) => set("tagline")(e.target.value)}
                  maxLength={160}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-short-tagline">Frase curta</Label>
                <Input
                  id="e-short-tagline"
                  value={form.short_tagline}
                  onChange={(e) => set("short_tagline")(e.target.value)}
                  maxLength={120}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="e-doctor">Médico responsável</Label>
                <Input
                  id="e-doctor"
                  value={form.doctor_name}
                  onChange={(e) => set("doctor_name")(e.target.value)}
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-crm">CRM / credenciais</Label>
                <Input
                  id="e-crm"
                  value={form.doctor_credentials}
                  onChange={(e) => set("doctor_credentials")(e.target.value)}
                  maxLength={160}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="e-city">Cidade</Label>
                <Input
                  id="e-city"
                  value={form.city}
                  onChange={(e) => set("city")(e.target.value)}
                  maxLength={80}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-website">Site</Label>
                <Input
                  id="e-website"
                  type="url"
                  value={form.website_url}
                  onChange={(e) => set("website_url")(e.target.value)}
                  placeholder="https://…"
                  maxLength={300}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="e-email">E-mail de contato</Label>
                <Input
                  id="e-email"
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => set("contact_email")(e.target.value)}
                  maxLength={200}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-phone">Telefone / WhatsApp</Label>
                <Input
                  id="e-phone"
                  type="tel"
                  inputMode="tel"
                  value={form.contact_phone}
                  onChange={(e) => set("contact_phone")(maskPhoneBR(e.target.value))}
                  maxLength={16}
                />
              </div>
            </div>
          </section>

          <section className="space-y-3 border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground">Cores &amp; fonte</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <ColorField
                id="e-primary"
                label="Cor principal"
                value={form.primary_color}
                onChange={set("primary_color")}
              />
              <ColorField
                id="e-accent"
                label="Cor de apoio"
                value={form.accent_color}
                onChange={set("accent_color")}
              />
            </div>
            <FontPresetPicker
              value={form.landing_font_preset}
              onChange={set("landing_font_preset")}
            />
          </section>

          <section className="space-y-3 border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground">Logo</h3>
            <div className="flex items-center gap-3">
              {form.logo_url ? (
                <img
                  src={form.logo_url}
                  alt="Logo atual"
                  className="h-12 w-12 rounded-md border border-border object-cover"
                />
              ) : null}
              <Input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploadingLogo}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file, "logos");
                }}
              />
            </div>
            {uploadingLogo && <p className="text-xs text-muted-foreground">Enviando logo…</p>}
          </section>

          <section className="space-y-3 border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground">Textos da jornada</h3>
            <div className="space-y-1.5">
              <Label htmlFor="e-about">Sobre a clínica</Label>
              <Textarea
                id="e-about"
                rows={3}
                value={form.about}
                onChange={(e) => set("about")(e.target.value)}
                maxLength={2000}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-intro">Boas-vindas no início da triagem</Label>
              <Textarea
                id="e-intro"
                rows={3}
                value={form.intro_copy}
                onChange={(e) => set("intro_copy")(e.target.value)}
                maxLength={2000}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-done">Mensagem final ao paciente</Label>
              <Textarea
                id="e-done"
                rows={3}
                value={form.done_copy}
                onChange={(e) => set("done_copy")(e.target.value)}
                maxLength={2000}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-disclaimer">Aviso legal (disclaimer)</Label>
              <Textarea
                id="e-disclaimer"
                rows={2}
                value={form.disclaimer}
                onChange={(e) => set("disclaimer")(e.target.value)}
                maxLength={2000}
              />
            </div>
          </section>

          <section className="space-y-3 border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground">Landing pública</h3>
            <div className="space-y-1.5">
              <Label htmlFor="e-headline">Título principal (H1)</Label>
              <Input
                id="e-headline"
                value={form.landing_headline}
                onChange={(e) => set("landing_headline")(e.target.value)}
                maxLength={160}
              />
            </div>

            <div className="flex items-center gap-3">
              {form.landing_hero_image_url ? (
                <img
                  src={form.landing_hero_image_url}
                  alt="Imagem de hero atual"
                  className="h-16 w-16 rounded-md border border-border object-cover"
                />
              ) : null}
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="e-hero">Imagem de destaque (opcional)</Label>
                <Input
                  id="e-hero"
                  ref={heroInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploadingHero}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload(file, "hero");
                  }}
                />
              </div>
            </div>
            {uploadingHero && <p className="text-xs text-muted-foreground">Enviando imagem…</p>}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Cards de destaque ({form.landing_feature_cards.length}/5)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCard}
                  disabled={form.landing_feature_cards.length >= 5}
                  className="h-7 gap-1 text-xs"
                >
                  <Plus className="h-3 w-3" /> Adicionar
                </Button>
              </div>
              {form.landing_feature_cards.map((card, i) => (
                <div key={i} className="flex gap-2 rounded-lg border border-border p-2.5">
                  <div className="flex-1 space-y-1.5">
                    <Input
                      value={card.title}
                      onChange={(e) => updateCard(i, { title: e.target.value })}
                      placeholder="Título"
                      maxLength={60}
                      className="h-9 text-sm"
                    />
                    <Textarea
                      value={card.description}
                      onChange={(e) => updateCard(i, { description: e.target.value })}
                      placeholder="Descrição"
                      rows={2}
                      maxLength={160}
                      className="text-sm"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCard(i)}
                    disabled={form.landing_feature_cards.length <= 2}
                    className="h-9 self-start text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {msg && (
            <p className="text-sm text-muted-foreground" role="status">
              {msg}
            </p>
          )}

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Salvando…" : "Salvar alterações"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
