# 📚 Documentação Viva — TriagemPsi & Saraiva Clínica de Psiquiatria

> **Saraiva Clínica de Psiquiatria**  
> **Dr. José Ribamar Fernandes Saraiva Junior** | CRM-RS 29349 · RQE 30038 | Passo Fundo / RS  
> *“Cuidado psiquiátrico com escuta, ciência e humanidade”*  
> *“Psiquiatria que acolhe e orienta”*

Esta documentação foi projetada para ser um repositório central, vivo e autônomo. Qualquer desenvolvedor, médico ou assistente de IA (CLI / Agente Autônomo) pode utilizar este conjunto de documentos para compreender, operar, manter ou reproduzir o ecossistema com 100% de exatidão técnica e fidelidade à proposta clínica.

---

## 🏛️ Posicionamento e Identidade Institucional

* **Consultório:** Saraiva Clínica de Psiquiatria (Passo Fundo/RS).
* **Responsável Técnico:** Dr. José Ribamar Fernandes Saraiva Junior (Médico com formação de base em Medicina de Família, Psiquiatria clínica pela ABP, Terapia Cognitivo-Comportamental - TCC, Dependência Química e Envelhecimento Humano/Geriatria).
* **Proposta de Valor:** Transformar a primeira consulta psiquiátrica particular em uma experiência acolhedora, aprofundada e livre de burocracia, aliando pré-triagem adaptativa com 28 escalas psicométricas validadas, plano de segurança e psicoeducação responsável.
* **Paleta de Marca Oficial:**
  * **Primary:** `#1e4d5c` (Azul-petróleo sóbrio, acolhedor e seguro)
  * **Accent:** `#3d8b8b` (Verde-azulado suave e clínico)
  * **Neutros:** Tons de cinza quente e off-white para conforto visual e foco na leitura.

---

## 🗺️ Mapa da Documentação Viva

| Arquivo | Descrição |
|---|---|
| [01_ARQUITETURA_E_VISAO_GERAL.md](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/01_ARQUITETURA_E_VISAO_GERAL.md) | Stack tecnológica, visão do consultório, SSR com TanStack Start + Nitro e Cloudflare Workers. |
| [02_BANCO_DE_DADOS_E_MIGRACOES.md](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/02_BANCO_DE_DADOS_E_MIGRACOES.md) | Dicionário de dados, tabelas de clínicas, psicoeducação, políticas RLS e script consolidado. |
| [03_MOTOR_CLINICO_E_ESCALAS.md](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/03_MOTOR_CLINICO_E_ESCALAS.md) | As 28 escalas, árvore adaptativa, Plano de Segurança Estruturado, Decision Support e 10 temas de psicoeducação. |
| [04_ROTAS_E_FLUXO_DE_USUARIO.md](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/04_ROTAS_E_FLUXO_DE_USUARIO.md) | Mapa de rotas do TanStack Router (Landing, Triagem Saraiva, Portal do Paciente, Painel Clínico, Admin). |
| [05_VARIAVEIS_E_INFRA_CLOUDFLARE.md](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/05_VARIAVEIS_E_INFRA_CLOUDFLARE.md) | Gestão de segredos, `.env`, `.env.production`, Cloudflare Workers e configuração do `wrangler.json`. |
| [06_RUNBOOK_REPRODUCAO_DO_ZERO.md](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/06_RUNBOOK_REPRODUCAO_DO_ZERO.md) | Guia cirúrgico para reproduzir o sistema do zero em qualquer servidor em menos de 10 minutos. |
| [07_SKILLS_E_RULES_AGENTICAS.md](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/07_SKILLS_E_RULES_AGENTICAS.md) | Governança de agentes, regras Lovable, boas práticas Supabase e diretrizes operacionais. |

---

## 🎯 Endpoints de Produção Ativos

* **Produção (Cloudflare Workers):** `https://triagempsi.pontocomumtus.workers.dev`
* **Triagem Saraiva Clínica:** `https://triagempsi.pontocomumtus.workers.dev/saraiva/triagem` (alias: `/padrao/triagem`)
* **Portal do Paciente:** `https://triagempsi.pontocomumtus.workers.dev/portal`
* **Acesso Médico & Equipe:** `https://triagempsi.pontocomumtus.workers.dev/auth`
* **Painel Clínico do Dr. Saraiva:** `https://triagempsi.pontocomumtus.workers.dev/painel`
* **Repositório GitHub:** `https://github.com/DanEdtechcps/triagempsi`
* **Banco Supabase Cloud:** `https://ffyjjkouscnabyxjxexu.supabase.co`
