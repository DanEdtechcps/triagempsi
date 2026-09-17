# 📚 Documentação Viva — Triagem Psiquiátrica (TriagemPsi)

Esta documentação foi projetada para ser um repositório central, vivo e autônomo. Qualquer desenvolvedor ou assistente de IA (CLI / Agente Autônomo) pode utilizar este conjunto de documentos para compreender, operar, manter ou reconstruir o sistema do zero absoluto até a produção com 100% de exatidão.

---

## 🗺️ Mapa da Documentação

| Arquivo | Descrição |
|---|---|
| [01_ARQUITETURA_E_VISAO_GERAL.md](file:///mnt/armazenamento/Projetos/triagem-medica-backup%20%282%29/triagem-medica/documentação%20viva/01_ARQUITETURA_E_VISAO_GERAL.md) | Stack tecnológica, visão do produto, fluxo de dados e SSR com TanStack Start + Nitro. |
| [02_BANCO_DE_DADOS_E_MIGRACOES.md](file:///mnt/armazenamento/Projetos/triagem-medica-backup%20%282%29/triagem-medica/documentação%20viva/02_BANCO_DE_DADOS_E_MIGRACOES.md) | Dicionário de dados, todas as tabelas, políticas RLS, triggers, Storage e rotina de Keepalive. |
| [03_MOTOR_CLINICO_E_ESCALAS.md](file:///mnt/armazenamento/Projetos/triagem-medica-backup%20%282%29/triagem-medica/documentação%20viva/03_MOTOR_CLINICO_E_ESCALAS.md) | As 28 escalas psiquiátricas, algoritmo de pontuação, faixas de risco e árvore adaptativa. |
| [04_ROTAS_E_FLUXO_DE_USUARIO.md](file:///mnt/armazenamento/Projetos/triagem-medica-backup%20%282%29/triagem-medica/documentação%20viva/04_ROTAS_E_FLUXO_DE_USUARIO.md) | Mapa de rotas do TanStack Router (Landing, Triagem, Portal do Paciente, Painel Clínico, Admin, Comercial). |
| [05_VARIAVEIS_E_INFRA_CLOUDFLARE.md](file:///mnt/armazenamento/Projetos/triagem-medica-backup%20%282%29/triagem-medica/documentação%20viva/05_VARIAVEIS_E_INFRA_CLOUDFLARE.md) | Gestão de segredos, `.env`, `.env.production`, Cloudflare Workers e configuração do `wrangler.json`. |
| [06_RUNBOOK_REPRODUCAO_DO_ZERO.md](file:///mnt/armazenamento/Projetos/triagem-medica-backup%20%282%29/triagem-medica/documentação%20viva/06_RUNBOOK_REPRODUCAO_DO_ZERO.md) | Passo a passo cirúrgico para subir o projeto do zero em qualquer ambiente em menos de 10 minutos. |
| [07_SKILLS_E_RULES_AGENTICAS.md](file:///mnt/armazenamento/Projetos/triagem-medica-backup%20%282%29/triagem-medica/documentação%20viva/07_SKILLS_E_RULES_AGENTICAS.md) | Governança de agentes, regras Lovable, boas práticas Supabase e diretrizes operacionais. |

---

## 🎯 Endpoints de Produção Ativos
* **Produção (Cloudflare Workers):** `https://triagempsi.pontocomumtus.workers.dev`
* **Triagem do Paciente:** `https://triagempsi.pontocomumtus.workers.dev/padrao/triagem`
* **Acesso do Profissional:** `https://triagempsi.pontocomumtus.workers.dev/auth`
* **Painel Clínico:** `https://triagempsi.pontocomumtus.workers.dev/painel`
* **Repositório GitHub:** `https://github.com/DanEdtechcps/triagempsi`
* **Banco Supabase Cloud:** `https://ffyjjkouscnabyxjxexu.supabase.co`
