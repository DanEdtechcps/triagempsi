import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  consensusOf,
  buildExport,
  decisionProblem,
  publishableByDecision,
  visibleResponses,
  responseProblem,
  summarize,
  type ReviewDecision,
  type ReviewFinalDecision,
  type ReviewItem,
  type ReviewResponse,
} from "./review-studio";

function resp(
  reviewer: string,
  decision: ReviewDecision,
  choice: string | null = null,
  item = "i1",
): ReviewResponse {
  return {
    item_id: item,
    reviewer_id: reviewer,
    reviewer_name: reviewer,
    decision,
    choice,
    comment: null,
    revision: 1,
    updated_at: "2026-10-08T12:00:00Z",
  };
}

function item(id: string, kind: ReviewItem["kind"] = "video"): ReviewItem {
  return {
    id,
    kind,
    ref: id,
    title: id,
    project: null,
    section: null,
    version: "v2",
    body: {},
    media_url: null,
    sort_order: 0,
  };
}

describe("consensusOf", () => {
  it("sem respostas", () => {
    expect(consensusOf([]).status).toBe("sem_respostas");
  });

  it("'sem opinião' não conta como voto", () => {
    const c = consensusOf([resp("a", "sem_opiniao")]);
    expect(c.status).toBe("sem_respostas");
    expect(c.reviewers).toBe(0);
  });

  it("todos aprovam → aprovado", () => {
    expect(consensusOf([resp("a", "aprovo"), resp("b", "aprovo")]).status).toBe("aprovado");
  });

  it("todos recusam → rejeitado", () => {
    expect(consensusOf([resp("a", "nao_uso"), resp("b", "nao_uso")]).status).toBe("rejeitado");
  });

  it("aprovo + ajusto → aprovado com ajustes", () => {
    expect(consensusOf([resp("a", "aprovo"), resp("b", "ajusto")]).status).toBe("ajustes");
  });

  it("aprovo + não uso → divergência", () => {
    expect(consensusOf([resp("a", "aprovo"), resp("b", "nao_uso")]).status).toBe("divergencia");
  });

  it("ajusto + não uso → rejeitado (a recusa vence o ajuste)", () => {
    expect(consensusOf([resp("a", "ajusto"), resp("b", "nao_uso")]).status).toBe("rejeitado");
  });

  it("todos preferem a mesma opção → escolhido", () => {
    const c = consensusOf([resp("a", "prefiro", "B"), resp("b", "prefiro", "B")]);
    expect(c.status).toBe("escolhido");
    expect(c.choice).toBe("B");
  });

  it("preferem opções diferentes → divergência", () => {
    expect(consensusOf([resp("a", "prefiro", "A"), resp("b", "prefiro", "B")]).status).toBe(
      "divergencia",
    );
  });

  it("prefiro misturado com aprovo → divergência (não é a mesma pergunta)", () => {
    expect(consensusOf([resp("a", "prefiro", "A"), resp("b", "aprovo")]).status).toBe(
      "divergencia",
    );
  });
});

describe("summarize", () => {
  it("conta por tipo, separa pendentes e divergentes", () => {
    const items = [item("v1"), item("v2"), item("f1", "frase")];
    const responses = [
      resp("a", "aprovo", null, "v1"),
      resp("b", "nao_uso", null, "v1"),
      resp("a", "aprovo", null, "f1"),
    ];
    const s = summarize(items, responses);
    expect(s.totalItens).toBe(3);
    expect(s.totalRespondidos).toBe(2);
    expect(s.divergentes.map((i) => i.id)).toEqual(["v1"]);
    expect(s.pendentes.map((i) => i.id)).toEqual(["v2"]);
    const video = s.byKind.find((k) => k.kind === "video");
    expect(video?.total).toBe(2);
    expect(video?.semRespostas).toBe(1);
    expect(video?.porStatus.divergencia).toBe(1);
    expect(s.byKind.find((k) => k.kind === "frase")?.porStatus.aprovado).toBe(1);
  });
});

describe("visibleResponses (cego até responder)", () => {
  const all = [
    resp("saraiva", "aprovo", null, "v1"),
    resp("socio", "nao_uso", null, "v1"),
    resp("socio", "aprovo", null, "v2"),
  ];

  it("quem ainda não respondeu o item não vê a opinião dos outros", () => {
    const vistas = visibleResponses(all, "saraiva");
    expect(vistas.filter((r) => r.item_id === "v2")).toHaveLength(0);
  });

  it("depois de responder, vê as opiniões dos outros naquele item", () => {
    const vistas = visibleResponses(all, "saraiva").filter((r) => r.item_id === "v1");
    expect(vistas.map((r) => r.reviewer_id).sort()).toEqual(["saraiva", "socio"]);
  });

  it("sempre vê as próprias respostas (e as dos outros nos itens que respondeu)", () => {
    const vistas = visibleResponses(all, "socio");
    expect(vistas.filter((r) => r.reviewer_id === "socio")).toHaveLength(2);
    // Respondeu v1 e v2, então também enxerga o voto de "saraiva" em v1.
    expect(vistas).toHaveLength(3);
  });

  it("quem nunca respondeu nada não vê nada", () => {
    expect(visibleResponses(all, "novo")).toHaveLength(0);
  });
});

function decisao(decision: ReviewFinalDecision["decision"]): ReviewFinalDecision {
  return {
    item_id: "i1",
    decision,
    choice: null,
    rationale: "ok",
    decided_by_name: "Dr. Saraiva",
    decided_at: "2026-10-08T12:00:00Z",
    votes_snapshot: [],
  };
}

describe("publishableByDecision (decisão final do decisor)", () => {
  it("sem decisão, não publica", () => {
    expect(publishableByDecision(null)).toBe(false);
    expect(publishableByDecision(undefined)).toBe(false);
  });
  it("aprovado e escolhido publicam", () => {
    expect(publishableByDecision(decisao("aprovado"))).toBe(true);
    expect(publishableByDecision(decisao("escolhido"))).toBe(true);
  });
  it("ajustar e descartado não publicam", () => {
    expect(publishableByDecision(decisao("ajustar"))).toBe(false);
    expect(publishableByDecision(decisao("descartado"))).toBe(false);
  });
});

describe("decisionProblem", () => {
  it("exige justificativa", () => {
    expect(decisionProblem("aprovado", null, "")).not.toBeNull();
    expect(decisionProblem("aprovado", null, "bom")).toBeNull();
  });
  it("escolhido exige a opção", () => {
    expect(decisionProblem("escolhido", "", "prefiro a B")).not.toBeNull();
    expect(decisionProblem("escolhido", "B", "prefiro a B")).toBeNull();
  });
});

describe("buildExport", () => {
  const items = [item("v1"), item("v2"), item("f1", "frase")];
  const responses = [
    { ...resp("saraiva", "aprovo", null, "v1"), reviewer_name: "Dr. Saraiva" },
    {
      ...resp("socio", "nao_uso", null, "v1"),
      reviewer_name: "Sócio",
      comment: 'fala "rápida" demais',
    },
    { ...resp("socio", "aprovo", null, "f1"), reviewer_name: "Sócio" },
  ];
  const dec: ReviewFinalDecision = {
    ...decisao("ajustar"),
    item_id: "v1",
    rationale: "Reduzir a velocidade da fala",
  };
  const out = buildExport(items, responses, [dec], "2026-10-08");

  it("o CSV tem cabeçalho e uma linha por item, com aspas escapadas", () => {
    const linhas = out.csv.split("\n");
    expect(linhas[0]).toContain("decisao_final");
    expect(linhas).toHaveLength(1 + items.length);
    expect(linhas[1]).toContain("Ajustar");
    expect(linhas[1]).toContain("Reduzir a velocidade da fala");
  });

  it("a ata lista decisões, o que falta decidir e o que ninguém respondeu", () => {
    expect(out.ata).toContain("## Decisões finais");
    expect(out.ata).toContain("Ajustar");
    expect(out.ata).toContain('fala "rápida" demais');
    expect(out.ata).toContain("**decididos:** 1");
    expect(out.ata).toContain("**com votos e sem decisão:** 1");
    expect(out.ata).toContain("**sem nenhuma resposta:** 1");
  });

  it("sem decisões, a ata diz isso", () => {
    expect(buildExport(items, [], [], "x").ata).toContain("Nenhuma decisão registrada ainda.");
  });
});

describe("responseProblem", () => {
  it("ajusto exige comentário", () => {
    expect(responseProblem("ajusto", null, "")).not.toBeNull();
    expect(responseProblem("ajusto", null, "trocar a palavra")).toBeNull();
  });
  it("prefiro exige a opção", () => {
    expect(responseProblem("prefiro", "", null)).not.toBeNull();
    expect(responseProblem("prefiro", "B", null)).toBeNull();
  });
  it("aprovo e não uso não exigem nada", () => {
    expect(responseProblem("aprovo", null, null)).toBeNull();
    expect(responseProblem("nao_uso", null, null)).toBeNull();
  });
});

// Teste estático da migração: Docker não está disponível em todo ambiente, então
// garantimos o essencial lendo o SQL. O isolamento vem de "nada concedido".
describe("migração 20261008100000_review_studio.sql", () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(
    join(dir, "..", "..", "supabase", "migrations", "20261008100000_review_studio.sql"),
    "utf8",
  );
  const tabelas = [
    "review_reviewers",
    "review_items",
    "review_responses",
    "review_response_events",
    "review_decisions",
  ];

  it("liga RLS nas cinco tabelas", () => {
    for (const t of tabelas) {
      expect(sql).toContain(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY`);
    }
  });

  it("revoga tudo de anon e authenticated em cada tabela", () => {
    for (const t of tabelas) {
      expect(sql).toContain(`REVOKE ALL ON public.${t} FROM PUBLIC, anon, authenticated`);
    }
  });

  it("não concede nada a anon nem a authenticated", () => {
    const grants = sql.split("\n").filter((l) => l.trim().toUpperCase().startsWith("GRANT"));
    expect(grants.length).toBeGreaterThan(0);
    for (const g of grants) {
      expect(g.toLowerCase()).not.toContain("anon");
      expect(g.toLowerCase()).not.toContain("authenticated");
      expect(g).toContain("service_role");
    }
  });

  it("não usa user_roles: avaliador não é equipe clínica", () => {
    expect(sql.replace(/--.*$/gm, "")).not.toContain("user_roles");
  });

  it("só guarda o hash do token, nunca o token", () => {
    expect(sql).toContain("token_hash");
    expect(sql).toMatch(/token_hash\s+text NOT NULL UNIQUE/);
    expect(sql).not.toMatch(/\btoken\s+text/);
  });

  it("garante UMA decisão atual por item", () => {
    expect(sql).toContain("review_decisions_current_per_item");
    expect(sql).toContain("WHERE superseded_at IS NULL");
  });

  it("a função de decisão atômica só roda para o service_role e exige decisor ativo", () => {
    expect(sql).toContain("FUNCTION public.review_record_decision");
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION public.review_record_decision(uuid, uuid, text, text, text, jsonb) FROM PUBLIC, anon, authenticated",
    );
    expect(sql).toContain("role = 'decisor' AND is_active AND revoked_at IS NULL");
  });
});
