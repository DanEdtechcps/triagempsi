import { createFileRoute } from "@tanstack/react-router";
import { PainelShell } from "@/components/painel/PainelShell";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/materiais")({
  head: () => ({
    meta: [
      { title: "Materiais — Painel do profissional" },
      {
        name: "description",
        content:
          "Psicoeducação para pacientes e materiais de apoio para a equipe clínica.",
      },
      { property: "og:title", content: "Materiais" },
      { property: "og:description", content: "Materiais de apoio clínico." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Materiais,
});

const SECOES = [
  {
    titulo: "Psicoeducação para pacientes",
    descricao: "Conteúdo para compartilhar com quem responde a triagem.",
    itens: [
      "Como funciona a primeira consulta em psiquiatria",
      "Higiene do sono: guia prático",
      "Entendendo ansiedade: o que é esperado e o que merece atenção",
    ],
  },
  {
    titulo: "Materiais exclusivos para profissionais",
    descricao: "Referências e protocolos de uso interno da equipe.",
    itens: [
      "Protocolo de manejo de risco de suicídio",
      "Pontos de corte e interpretação das escalas",
      "Modelo de registro em prontuário a partir da pré-triagem",
    ],
  },
];

function Materiais() {
  return (
    <PainelShell title="Materiais">
      <p className="mb-5 text-sm text-muted-foreground">
        Estrutura preparada para receber os conteúdos. Os itens abaixo são
        espaços reservados — links e arquivos serão anexados pela equipe clínica.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {SECOES.map((s) => (
          <Card key={s.titulo} className="p-4 sm:p-5">
            <h2 className="font-serif text-lg font-semibold">{s.titulo}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{s.descricao}</p>
            <ul className="mt-4 space-y-2">
              {s.itens.map((i) => (
                <li
                  key={i}
                  className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-foreground/80"
                >
                  {i}
                  <span className="ml-2 text-xs text-muted-foreground">
                    (em breve)
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </PainelShell>
  );
}
