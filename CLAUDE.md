# TriagemPsi (triagem-medica)

Plataforma clínica multi-tenant de pré-triagem psiquiátrica (Saraiva Clínica de Psiquiatria + Instituto Lumina). Stack: TypeScript/React 19/TanStack Start, Supabase/Postgres com RLS, Cloudflare Workers via Nitro, gerenciado com `bun`.

**Fonte de verdade da governança do projeto:** [documentação viva/](documentação%20viva/README.md) — leia antes de qualquer mudança estrutural. Em especial:

- [07_SKILLS_E_RULES_AGENTICAS.md](documentação%20viva/07_SKILLS_E_RULES_AGENTICAS.md) — regras de ouro, tom de voz clínico, protocolo de crise (CVV 188/SAMU 192 sempre que PHQ-9 item 9 ≥ 1 ou C-SSRS positivo), padrões de segredo/RLS, e os 3 portões de qualidade obrigatórios antes de qualquer commit:
  ```bash
  bun x tsc --noEmit   # 0 erros
  bun run test         # meta: 204 testes
  bun run build        # Nitro + Vite
  ```
  <!-- adicionado por onboarding em 2026-09-24: rodei `bun run test` e hoje passam 234 testes (21 arquivos) — a meta de "204" acima está desatualizada (mesmo número desatualizado aparece em README.md); mantive o texto original e só registrei o número real aqui para não fazer suposição no meio da regra. -->
- [02_BANCO_DE_DADOS_E_MIGRACOES.md](documentação%20viva/02_BANCO_DE_DADOS_E_MIGRACOES.md) — schema, RLS obrigatório em toda tabela nova (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`), convenções de migração.
- [06_RUNBOOK_REPRODUCAO_DO_ZERO.md](documentação%20viva/06_RUNBOOK_REPRODUCAO_DO_ZERO.md) — como reconstruir o ambiente do zero.
- [10_ANTI_FREEZE_E_MEMORIA_OPERACIONAL.md](documentação%20viva/10_ANTI_FREEZE_E_MEMORIA_OPERACIONAL.md) — regra de persistência frequente (commits atômicos, nunca acumular trabalho não salvo) e diagnóstico de instabilidade de hardware desta máquina.

Regras que não estão em `documentação viva/` mas valem sempre nesta sessão:
- Links de arquivo sempre no formato `[Nome](file:///caminho/absoluto)`.
- Nunca gravar `SUPABASE_SERVICE_ROLE_KEY` (ou qualquer chave secreta) em arquivo rastreado pelo Git — só via secret manager (GitHub Actions secrets, `wrangler secret put`).
- Nunca editar uma migração em `supabase/migrations/` que já foi aplicada em produção — sempre migração nova por cima.
