import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FadeIn } from "@/components/motion/primitives";
import {
  LANDING_DEFAULTS,
  bumpLandingImageVersion,
  getLandingSettings,
  updateLandingSettings,
  uploadLandingImage,
  type LandingSettings,
} from "@/lib/landing-settings.functions";
import { versionedImageUrl } from "@/lib/landing-meta";

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

export function LandingSettingsForm() {
  const fetchSettings = useServerFn(getLandingSettings);
  const save = useServerFn(updateLandingSettings);
  const upload = useServerFn(uploadLandingImage);
  const bump = useServerFn(bumpLandingImageVersion);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, refetch } = useQuery({
    queryKey: ["landing-settings"],
    queryFn: () => fetchSettings(),
  });

  const [form, setForm] = useState<LandingSettings>(LANDING_DEFAULTS);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bumping, setBumping] = useState(false);

  async function handleBump() {
    setBumping(true);
    setMsg(null);
    try {
      const { version } = await bump({});
      setForm((f) => ({ ...f, share_image_version: version }));
      await refetch();
      setMsg(`Miniatura marcada como v${version}. Republique o site para os crawlers buscarem de novo.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Não foi possível atualizar a versão.");
    } finally {
      setBumping(false);
    }
  }

  useEffect(() => {
    if (data) setForm({ ...LANDING_DEFAULTS, ...data });
  }, [data]);

  const set = (k: keyof LandingSettings) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await save({
        data: {
          eyebrow: form.eyebrow,
          headline_line1: form.headline_line1,
          headline_line2: form.headline_line2,
          subheadline: form.subheadline,
          share_title: form.share_title,
          share_description: form.share_description,
          share_image_url: form.share_image_url || null,
        },
      });
      await refetch();
      setMsg("Alterações publicadas na landing.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setMsg(null);
    try {
      const base64 = await fileToBase64(file);
      const { url } = await upload({
        data: {
          fileName: file.name,
          contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
          base64,
        },
      });
      setForm((f) => ({ ...f, share_image_url: url }));
      await refetch();
      setMsg("Miniatura atualizada. Republique o site para o preview trocar.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Não foi possível enviar a imagem.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <FadeIn>
      <form onSubmit={handleSave} className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4 p-5">
          <div>
            <h2 className="font-serif text-lg font-semibold">Chamada da landing</h2>
            <p className="text-xs text-muted-foreground">
              Textos exibidos no topo da página pública.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="l-eyebrow">Selo (linha pequena)</Label>
            <Input
              id="l-eyebrow"
              value={form.eyebrow}
              maxLength={120}
              onChange={(e) => set("eyebrow")(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="l-h1">Título — 1ª linha</Label>
              <Input
                id="l-h1"
                value={form.headline_line1}
                maxLength={120}
                onChange={(e) => set("headline_line1")(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="l-h2">Título — 2ª linha (destaque)</Label>
              <Input
                id="l-h2"
                value={form.headline_line2}
                maxLength={120}
                onChange={(e) => set("headline_line2")(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="l-sub">Subtítulo</Label>
            <Textarea
              id="l-sub"
              rows={4}
              value={form.subheadline}
              maxLength={600}
              onChange={(e) => set("subheadline")(e.target.value)}
            />
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <div>
            <h2 className="font-serif text-lg font-semibold">
              Miniatura ao compartilhar
            </h2>
            <p className="text-xs text-muted-foreground">
              Título, descrição e imagem usados no WhatsApp, LinkedIn e Google.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="l-stitle">Título do compartilhamento</Label>
            <Input
              id="l-stitle"
              value={form.share_title}
              maxLength={120}
              onChange={(e) => set("share_title")(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="l-sdesc">Descrição do compartilhamento</Label>
            <Textarea
              id="l-sdesc"
              rows={3}
              value={form.share_description}
              maxLength={300}
              onChange={(e) => set("share_description")(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="l-simg">Imagem (URL)</Label>
            <Input
              id="l-simg"
              value={form.share_image_url ?? ""}
              placeholder="https://…/imagem.jpg"
              onChange={(e) => set("share_image_url")(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="l-file">Ou envie um arquivo (JPG, PNG ou WebP · até 5 MB)</Label>
            <Input
              id="l-file"
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
              }}
            />
            {uploading && (
              <p className="text-xs text-muted-foreground">Enviando imagem…</p>
            )}
          </div>

          {form.share_image_url && (
            <div className="overflow-hidden rounded-xl border border-border">
              <img
                src={versionedImageUrl(form.share_image_url, form.share_image_version) ?? ""}
                alt="Prévia da miniatura de compartilhamento da landing"
                className="aspect-[1200/630] w-full object-cover"
              />
            </div>
          )}

          <div className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground">
              Versão atual da miniatura:{" "}
              <span className="font-mono">v{form.share_image_version}</span> — a URL enviada
              aos crawlers termina em <span className="font-mono">?v={form.share_image_version}</span>.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              disabled={bumping}
              onClick={() => void handleBump()}
            >
              {bumping ? "Atualizando…" : "Forçar atualização do preview"}
            </Button>
          </div>

          {msg && (
            <p className="text-sm text-muted-foreground" role="status">
              {msg}
            </p>
          )}
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Salvando…" : "Salvar e publicar textos"}
          </Button>
          <p className="text-xs text-muted-foreground">
            A nova versão só chega ao WhatsApp/LinkedIn depois de republicar o site;
            o número de versão evita que eles reutilizem a imagem antiga em cache.
          </p>
        </Card>
      </form>
    </FadeIn>
  );
}
