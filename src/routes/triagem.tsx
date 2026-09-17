import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({ t: z.string().optional() });

export const Route = createFileRoute("/triagem")({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/$slug/triagem",
      params: { slug: "padrao" },
      search: search.t ? { t: search.t } : {},
    });
  },
});
