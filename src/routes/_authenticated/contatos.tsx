import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PainelShell } from "@/components/painel/PainelShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMyAccess } from "@/lib/painel.functions";
import {
  createContact,
  createWhatsappInvite,
  listContacts,
  logWhatsappSend,
} from "@/lib/contacts.functions";
import { toE164BR, waLink } from "@/lib/phone";
import { BRANDING } from "@/config/branding";

export const Route = createFileRoute("/_authenticated/contatos")({
  head: () => ({
    meta: [
      { title: "Contatos e envio por WhatsApp — Pré-triagem" },
      {
        name: "description",
        content:
          "Cadastre pacientes e envie o questionário de pré-triagem por WhatsApp com um link individual.",
      },
      { property: "og:title", content: "Contatos e envio por WhatsApp" },
      {
        property: "og:description",
        content: "Envio do questionário de pré-triagem por WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ContatosPage,
});

function ContatosPage() {
  const queryClient = useQueryClient();
  const fetchAccess = useServerFn(getMyAccess);
  const fetchContacts = useServerFn(listContacts);
  const addContact = useServerFn(createContact);
  const makeInvite = useServerFn(createWhatsappInvite);
  const logSend = useServerFn(logWhatsappSend);

  const access = useQuery({ queryKey: ["my-access"], queryFn: () => fetchAccess({}) });
  const contacts = useQuery({
    queryKey: ["contacts"],
    queryFn: () => fetchContacts({}),
    enabled: !!access.data?.hasAccess,
  });

  const clinics = access.data?.clinics ?? [];
  const [clinicId, setClinicId] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const selectedClinic = useMemo(
    () => clinicId || clinics[0]?.id || "",
    [clinicId, clinics],
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const e164 = toE164BR(phone);
    if (!e164) {
      setMsg("Telefone inválido. Use DDD + número, ex.: (11) 99999-8888.");
      return;
    }
    if (!selectedClinic) {
      setMsg("Selecione a clínica.");
      return;
    }
    setSaving(true);
    try {
      await addContact({
        data: {
          clinic_id: selectedClinic,
          name,
          phone_e164: e164,
          email: email || null,
        },
      });
      setName("");
      setPhone("");
      setEmail("");
      await queryClient.invalidateQueries({ queryKey: ["contacts"] });
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSend(contactId: string) {
    setMsg(null);
    setSendingId(contactId);
    try {
      const inv = await makeInvite({ data: { contact_id: contactId } });
      const url = `${window.location.origin}/${inv.clinic_slug}/triagem?t=${inv.token}`;
      const body =
        `Olá, ${inv.contact_name}! Aqui é da ${inv.clinic_name ?? BRANDING.clinicName}. ` +
        `Antes da sua consulta, responda este questionário rápido de pré-avaliação (leva poucos minutos): ${url}\n\n` +
        `É confidencial e ajuda o médico a aproveitar melhor o tempo da consulta.`;
      window.open(waLink(inv.phone_e164, body), "_blank", "noopener");
      await logSend({
        data: {
          contact_id: contactId,
          invitation_id: inv.invitation_id,
          to_phone: inv.phone_e164,
          body,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["contacts"] });
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Não foi possível gerar o convite.");
    } finally {
      setSendingId(null);
    }
  }

  if (access.isLoading) {
    return (
      <PainelShell title="Contatos">
        <p className="text-sm text-muted-foreground">Verificando acesso…</p>
      </PainelShell>
    );
  }

  if (!access.data?.hasAccess) {
    return (
      <PainelShell title="Contatos">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">
            Acesso ainda não liberado. Peça a um administrador para vincular seu
            usuário a uma clínica.
          </p>
        </Card>
      </PainelShell>
    );
  }

  return (
    <PainelShell title="Contatos e envio por WhatsApp">
      <Card className="p-4 sm:p-6">
        <h2 className="font-serif text-lg font-semibold">Novo contato</h2>
        <form onSubmit={handleAdd} className="mt-4 grid gap-4 sm:grid-cols-2">
          {clinics.length > 1 && (
            <div className="sm:col-span-2">
              <Label htmlFor="clinica">Clínica</Label>
              <select
                id="clinica"
                value={selectedClinic}
                onChange={(e) => setClinicId(e.target.value)}
                className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-base"
              >
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-base"
            />
          </div>
          <div>
            <Label htmlFor="tel">WhatsApp</Label>
            <Input
              id="tel"
              required
              inputMode="tel"
              placeholder="(11) 99999-8888"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="text-base"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="mail">E-mail (opcional)</Label>
            <Input
              id="mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-base"
            />
          </div>
          {msg && <p className="sm:col-span-2 text-sm text-destructive">{msg}</p>}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando…" : "Adicionar contato"}
            </Button>
          </div>
        </form>
      </Card>

      <section className="mt-8">
        <h2 className="font-serif text-lg font-semibold">Meus contatos</h2>
        {contacts.isLoading && (
          <p className="mt-3 text-sm text-muted-foreground">Carregando…</p>
        )}
        {contacts.data?.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhum contato cadastrado ainda.
          </p>
        )}
        <ul className="mt-3 space-y-3">
          {(contacts.data ?? []).map((c) => (
            <li key={c.id}>
              <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="truncate font-medium">{c.name}</div>
                  <div className="truncate text-sm text-muted-foreground">
                    {c.phone_e164}
                    {c.email ? ` · ${c.email}` : ""}
                  </div>
                  {c.last_invite_at && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Último convite:{" "}
                      {new Date(c.last_invite_at).toLocaleString("pt-BR")}
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => handleSend(c.id)}
                  disabled={sendingId === c.id || !c.phone_e164}
                  className="shrink-0"
                >
                  {sendingId === c.id ? "Gerando…" : "Enviar por WhatsApp"}
                </Button>
              </Card>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          O botão gera um link de triagem individual (válido por 30 dias) e abre o
          WhatsApp com a mensagem pronta para enviar ao paciente. O envio fica
          registrado no histórico da clínica.
        </p>
      </section>
    </PainelShell>
  );
}
