# E-mails do Supabase Auth (português, modelo TriagemPsi)

**Não edite os `.html` à mão.** Eles são gerados a partir de `src/lib/supabase-auth-emails.ts`
(textos) e `src/lib/email-layout.ts` (visual, o mesmo dos e-mails do app: recuperação de senha e
alerta de risco).

```bash
bun scripts/supabase-auth-emails.ts write   # regrava estes arquivos
bun scripts/supabase-auth-emails.ts push    # carrega no Supabase (Management API)
```

`push` precisa de `SUPABASE_ACCESS_TOKEN` (token pessoal do Supabase) em `~/.credentials/supabase.env`
e, para ligar o SMTP do Resend, de `RESEND_SMTP_KEY`. Guarda um backup da configuração anterior em
`~/.credentials/` (fora do git). São 13 modelos + 2 avisos de segurança ligados (senha e e-mail alterados).
Campos usados (documentação atual do Supabase): `mailer_subjects_*`, `mailer_templates_*_content`,
`mailer_notifications_*_enabled`, `smtp_*`.
