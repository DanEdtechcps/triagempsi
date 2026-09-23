# 🧠 TriagemPsi — Cockpit Clínico & Plataforma Multi-Tenant de Triagem Psiquiátrica

> **Saraiva Clínica de Psiquiatria**  
> **Dr. José Ribamar Fernandes Saraiva Junior** | CRM-RS 29349 · RQE 30038 | Passo Fundo / RS  
> *“Cuidado psiquiátrico com escuta, ciência e humanidade”*  
> *“Psiquiatria que acolhe e orienta”*

Plataforma SaaS Multi-Tenant de pré-triagem psiquiátrica adaptativa, fundamentada na prática clínica do Dr. Saraiva — aliando a escuta e o vínculo da Medicina de Família, evidências em Terapia Cognitivo-Comportamental (TCC), redução de danos em Dependência Química e a psicodinâmica do Envelhecimento Humano.

---

## 🏛️ Consultórios & Topologia Multi-Tenant

* **Saraiva Clínica de Psiquiatria (`/saraiva`):**
  * **Responsável Técnico:** Dr. José Ribamar Fernandes Saraiva Junior (ABP).
  * **Identidade Visual:** Primary `#1e4d5c` (Azul-petróleo sóbrio), Accent `#3d8b8b` (Verde-azulado suave).
* **Instituto Lumina de Saúde Mental & Neurociências (`/lumina`):**
  * **Responsável Técnico:** Dr. Gustavo Mello (CRM 198765-SP) & Dra. Camila Nogueira (CRM 234567-SP).
  * **Identidade Visual:** Primary `#4c1d95` (Púrpura Nobre), Accent `#8b5cf6` (Violeta Clínico).
  * **Plano:** Enterprise (5 profissionais, telemetria avançada de dwell-time).
* **Administrador Geral / Global:** `coletivoaruatemvoz@gmail.com` com governança cross-tenant via [`TenantSwitcher`](file:///mnt/armazenamento/Projetos/triagem-medica/src/components/painel/TenantSwitcher.tsx).

---

## 🚀 Stack Tecnológica & Arquitetura

- **Framework:** [TanStack Start](https://tanstack.com/start) + [React 19](https://react.dev/) + TypeScript (Type-Safety fim a fim).
- **Roteamento:** [TanStack Router](https://tanstack.com/router) com File-based Routing e Server Functions.
- **Motor Clínico Isolado (`src/lib/clinical-engine/`):**
  - **Schemas Declarativos (15 instrumentos):** EPDS, PHQ-2, PHQ-9, C-SSRS, SRQ-20, SNAP-IV, ASRS-18, AD-8, GDS-15, Y-BOCS, PCL-5, ISI, MBI-HSS, AUDIT, ASSIST.
  - **Avaliador Puro:** Trava biológica estrita da EPDS para homens e cálculo determinístico.
  - **Grafo Reativo DAG:** Disparo acíclico com algoritmo DFS e catálogo de reações cruzadas.
  - **Motor CAT/TRI:** Graded Response Model (GRM de Samejima) com Informação de Fisher, estimativa EAP e parada $SE(\theta) \le 0.30$ ($\ge 50\%$ de redução de itens).
  - **Telemetria Dwell-Time:** Detecção de hesitação em ideação suicida ($\ge 3\times$ a média) e preenchimento randômico (< 400ms).
  - **Isolamento de Tenant:** `assertTenantBoundary` contra cross-tenant leakage.
  - **Execução Sombra:** Padrão Strangler Fig garantindo 100% de paridade clínica.
- **Backend / Database:** [PostgreSQL (Supabase)](https://supabase.com/) com Row Level Security (RLS) estrito.
- **Runtime / Edge:** [Cloudflare Workers](https://workers.cloudflare.com/) via [Nitro Engine](https://nitro.unjs.io/).
- **Testes:** [Vitest](https://vitest.dev/) (204 testes automatizados cobrindo psicometria, DAG, TRI e multi-tenancy).

---

## 📚 Documentação & Governança

- [📜 CHANGELOG.md](file:///mnt/armazenamento/Projetos/triagem-medica/CHANGELOG.md): Histórico completo de versões e releases (v1.0.0 a v1.30.0).
- [🗺️ ROADMAP.md](file:///mnt/armazenamento/Projetos/triagem-medica/ROADMAP.md): Status atual das Fases 1 a 5, itens em andamento e futuro (eCRF / RWE).
- [📖 Pasta documentação viva/](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/): Guias detalhados de arquitetura, banco, runbook e rotas.

---

## ⚡ Comandos de Execução Rápida

```bash
# Instalação das dependências
bun install

# Executar a suíte completa de testes (204 testes unitários e de integração)
bun run test

# Verificação estática de tipos (0 erros)
bun x tsc --noEmit

# Iniciar servidor de desenvolvimento local (porta 8080)
bun run dev

# Build de produção (Vite + Nitro Cloudflare target)
bun run build

# Deploy no Cloudflare Workers
bun x wrangler deploy
```

---

## 🌐 Endpoints Ativos

* **Produção:** [https://triagempsi.pontocomumtus.workers.dev](https://triagempsi.pontocomumtus.workers.dev)
* **Triagem Saraiva Clínica:** [https://triagempsi.pontocomumtus.workers.dev/saraiva/triagem](https://triagempsi.pontocomumtus.workers.dev/saraiva/triagem)
* **Triagem Instituto Lumina:** [https://triagempsi.pontocomumtus.workers.dev/lumina/triagem](https://triagempsi.pontocomumtus.workers.dev/lumina/triagem)
* **Cockpit de Psicoeducação:** [https://triagempsi.pontocomumtus.workers.dev/materiais](https://triagempsi.pontocomumtus.workers.dev/materiais)
* **Portal do Paciente:** [https://triagempsi.pontocomumtus.workers.dev/portal](https://triagempsi.pontocomumtus.workers.dev/portal)
* **Acesso Médico & Painel:** [https://triagempsi.pontocomumtus.workers.dev/painel](https://triagempsi.pontocomumtus.workers.dev/painel)
