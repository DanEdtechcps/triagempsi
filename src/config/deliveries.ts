import raw from "./deliveries.json";

export type DeliveryLink = { label: string; url: string };
export type DeliveryImage = { url: string; caption?: string };

/** Situação da entrega no fluxo de revisão. */
export type DeliveryStatus = "pendente" | "aprovada";

export type Delivery = {
  /** Data no formato ISO (AAAA-MM-DD). */
  date: string;
  title: string;
  detail: string;
  /** Área do produto: Painel, Triagem, Segurança, Comunicação, Roadmap... */
  area?: string;
  /** Versão em que a entrega foi liberada, ex.: "1.4.0". */
  version?: string;
  /** Impacto prático para o consultório. */
  impact?: string;
  /** Links úteis (rota do sistema, documento, referência). */
  links?: DeliveryLink[];
  /** Prints/imagens de apoio. */
  images?: DeliveryImage[];
  /**
   * "pendente" = aguardando sua revisão (não entra no roadmap nem no changelog).
   * Ausente = entrega antiga, considerada aprovada.
   */
  status?: DeliveryStatus;
  /** Quem aprovou e quando (preenchido pelo comando de revisão). */
  approved_at?: string;
  approved_by?: string;
  /** Observação registrada na revisão (ex.: pedido de ajuste). */
  review_note?: string;
};

const ALL: Delivery[] = [...(raw as Delivery[])].sort((a, b) => b.date.localeCompare(a.date));

export function deliveryStatus(d: Delivery): DeliveryStatus {
  return d.status === "pendente" ? "pendente" : "aprovada";
}

/** Entregas aguardando sua revisão/aprovação. */
export const PENDING_DELIVERIES: Delivery[] = ALL.filter((d) => deliveryStatus(d) === "pendente");

/**
 * Histórico de entregas aprovadas. O arquivo `deliveries.json` é alimentado
 * automaticamente pelo comando `node scripts/roadmap-add.mjs` — não edite à mão.
 * A aprovação é feita por `node scripts/roadmap-review.mjs`.
 */
export const DELIVERIES: Delivery[] = ALL.filter((d) => deliveryStatus(d) === "aprovada");

/** Todas as entregas, aprovadas e pendentes. */
export const ALL_DELIVERIES: Delivery[] = ALL;

export function formatDeliveryDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

export const LAST_DELIVERY_DATE = DELIVERIES[0]?.date ?? null;

export const UNVERSIONED = "Sem versão";

export type ChangelogVersion = {
  version: string;
  /** Data da entrega mais recente da versão. */
  date: string;
  items: Delivery[];
  areas: string[];
};

function compareVersionDesc(a: ChangelogVersion, b: ChangelogVersion) {
  if (a.version === UNVERSIONED) return 1;
  if (b.version === UNVERSIONED) return -1;
  const pa = a.version.split(".").map((n) => Number(n) || 0);
  const pb = b.version.split(".").map((n) => Number(n) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return b.date.localeCompare(a.date);
}

/** Agrupa as entregas do roadmap por versão, da mais recente para a mais antiga. */
export function changelogByVersion(deliveries: Delivery[] = DELIVERIES): ChangelogVersion[] {
  const map = new Map<string, Delivery[]>();
  for (const d of deliveries) {
    const key = d.version ?? UNVERSIONED;
    const list = map.get(key);
    if (list) list.push(d);
    else map.set(key, [d]);
  }
  return [...map.entries()]
    .map(([version, items]) => {
      const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));
      return {
        version,
        date: sorted[0]?.date ?? "",
        items: sorted,
        areas: [...new Set(sorted.map((i) => i.area).filter(Boolean))] as string[],
      };
    })
    .sort(compareVersionDesc);
}

export const CHANGELOG = changelogByVersion();
export const CURRENT_VERSION = CHANGELOG[0]?.version ?? UNVERSIONED;
