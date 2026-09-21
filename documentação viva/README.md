# 📚 Documentação Viva — TriagemPsi & Multi-Tenant Clínico

> **Saraiva Clínica de Psiquiatria** & **Instituto Lumina de Saúde Mental & Neurociências**  
> **Dr. José Ribamar Fernandes Saraiva Junior** | CRM-RS 29349 · RQE 30038 | Passo Fundo / RS  
> **Dr. Gustavo Mello** | CRM 198765-SP · Psiquiatria de Adultos & Neurociências | São Paulo / SP  
> (corpo clínico Lumina também inclui Dra. Camila Nogueira, CRM 234567-SP · Infância & Adolescência)  
> **Superadministrador da Plataforma:** Daniel Arraes Reino (`coletivoaruatemvoz@gmail.com`)  
> *Versão de Arquitetura: v1.32.0 (Corrigida em 2026-09-21 — identidade da Lumina alinhada ao banco real)*

Esta documentação foi projetada para ser um **repositório central, vivo, autônomo e resiliente a falhas**. Qualquer desenvolvedor, médico ou assistente de IA (CLI / Agente Autônomo) pode utilizar este conjunto de documentos para compreender, operar, manter ou reproduzir o ecossistema com 100% de exatidão técnica e fidelidade à proposta clínica.

---

## 🏛️ Posicionamento e Identidade Institucional

* **Clínica Fundadora:** Saraiva Clínica de Psiquiatria (Passo Fundo/RS).
* **Responsável Técnico:** Dr. José Ribamar Fernandes Saraiva Junior (Médico com formação de base em Medicina de Família, Psiquiatria clínica pela ABP, Terapia Cognitivo-Comportamental - TCC, Dependência Química e Envelhecimento Humano/Geriatria).
* **Clínica Federada Adicional:** Instituto Lumina de Saúde Mental & Neurociências (São Paulo/SP) — Dr. Gustavo Mello (admin) e Dra. Camila Nogueira.
* **Proposta de Valor:** Transformar a primeira consulta psiquiátrica em uma experiência acolhedora, aprofundada e livre de burocracia, aliando pré-triagem adaptativa com 28 escalas psicométricas validadas, plano de segurança e psicoeducação responsável.
* **Paletas de Marca Oficiais:**
  * **Saraiva Clínica:** Primary `#1e4d5c` (Azul-petróleo sóbrio), Accent `#3d8b8b` (Verde-azulado clínico).
  * **Instituto Lumina:** Primary `#1e1b4b` (Índigo profundo), Accent `#6366f1` (Índigo vibrante).
  * **Neutros:** Tons de cinza quente e off-white para conforto visual e foco na leitura.

---

## 🗺️ Mapa da Documentação Viva

| Arquivo | Descrição |
|---|---|
| [01_ARQUITETURA_E_VISAO_GERAL.md](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/01_ARQUITETURA_E_VISAO_GERAL.md) | Stack tecnológica v1.30.0, topologia multi-tenant federada (Saraiva + Lumina), motor clínico isolado e quality gates. |
| [02_BANCO_DE_DADOS_E_MIGRACOES.md](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/02_BANCO_DE_DADOS_E_MIGRACOES.md) | Dicionário de dados, tabelas de clínicas, psicoeducação, migrações versionadas, políticas RLS e script consolidado. |
| [03_MOTOR_CLINICO_E_ESCALAS.md](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/03_MOTOR_CLINICO_E_ESCALAS.md) | As 28 escalas, 15 schemas JSON, avaliador puro, grafo reativo DAG (DFS), motor CAT/TRI (Samejima GRM), Dwell-Time e Decision Support. |
| [04_ROTAS_E_FLUXO_DE_USUARIO.md](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/04_ROTAS_E_FLUXO_DE_USUARIO.md) | Mapa de rotas do TanStack Router, jornadas de acolhimento (/saraiva, /lumina), Cockpit de Psicoeducação (/materiais), TenantSwitcher e TelemetryCard. |
| [05_VARIAVEIS_E_INFRA_CLOUDFLARE.md](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/05_VARIAVEIS_E_INFRA_CLOUDFLARE.md) | Gestão de segredos, regra de ouro contra conflito de secrets no wrangler.json, triplo fallback do client e infra Cloudflare Workers. |
| [06_RUNBOOK_REPRODUCAO_DO_ZERO.md](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/06_RUNBOOK_REPRODUCAO_DO_ZERO.md) | Guia cirúrgico para reproduzir o sistema do zero em menos de 10 minutos com Bun, 204 testes automatizados e deploy. |
| [07_SKILLS_E_RULES_AGENTICAS.md](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/07_SKILLS_E_RULES_AGENTICAS.md) | Governança de agentes, regra de ouro de links clicáveis, abordagem sem enrolação, regras Lovable e portões de qualidade. |
| [08_REVISAO_TEXTOS_TRIAGEM.md](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/08_REVISAO_TEXTOS_TRIAGEM.md) | Auditoria e revisão textual completa de todas as telas da jornada do paciente na triagem. |
| [09_CHECKLIST_VIVO_UI_QUALITY.md](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/09_CHECKLIST_VIVO_UI_QUALITY.md) | Checklist vivo e permanente de qualidade de interface (UI Quality Baseline), mobile-first, a11y, feedback e matriz de conformidade. |
| [10_ANTI_FREEZE_E_MEMORIA_OPERACIONAL.md](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/10_ANTI_FREEZE_E_MEMORIA_OPERACIONAL.md) | Memória operacional do host Dell Inspiron 15 3520, histórico de fixes anti-freeze, runbook de diagnóstico e persistência febril ininterrupta. |

---

## 🎯 Endpoints de Produção Ativos

* **Produção Global (Cloudflare Workers):** `https://triagempsi.pontocomumtus.workers.dev`
* **Triagem Saraiva Clínica:** `https://triagempsi.pontocomumtus.workers.dev/saraiva/triagem` (alias: `/padrao/triagem`)
* **Triagem Instituto Lumina:** `https://triagempsi.pontocomumtus.workers.dev/lumina/triagem` (corrigido em 2026-09-21 — o slug real no banco era `lumina-saude`, causando 404; renomeado para `lumina` pra bater com este link documentado)
* **Portal do Paciente:** `https://triagempsi.pontocomumtus.workers.dev/portal`
* **Cockpit de Psicoeducação:** `https://triagempsi.pontocomumtus.workers.dev/materiais`
* **Acesso Médico & Equipe:** `https://triagempsi.pontocomumtus.workers.dev/auth`
* **Painel Clínico Multi-Tenant:** `https://triagempsi.pontocomumtus.workers.dev/painel`
* **Repositório GitHub:** `https://github.com/DanEdtechcps/triagempsi`
* **Banco Supabase Cloud:** `https://ffyjjkouscnabyxjxexu.supabase.co`
