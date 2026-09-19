# 🧠 TriagemPsi — Saraiva Clínica de Psiquiatria

> **Saraiva Clínica de Psiquiatria**  
> **Dr. José Ribamar Fernandes Saraiva Junior** | CRM-RS 29349 · RQE 30038 | Passo Fundo / RS  
> *“Cuidado psiquiátrico com escuta, ciência e humanidade”*  
> *“Psiquiatria que acolhe e orienta”*

Plataforma SaaS de pré-triagem psiquiátrica adaptativa, fundamentada na prática clínica do Dr. Saraiva — aliando a escuta e o vínculo da Medicina de Família, evidências em Terapia Cognitivo-Comportamental (TCC), redução de danos em Dependência Química e a psicodinâmica do Envelhecimento Humano.

---

## 🏛️ Sobre o Consultório

* **Responsável Técnico:** Dr. José Ribamar Fernandes Saraiva Junior (Médico Psiquiatra titulado pela ABP com histórico de atuação em Medicina de Família e Comunidade).
* **Localização:** Passo Fundo / RS.
* **Proposta Clínica:** Pré-avaliação estruturada com 28 escalas psicométricas internacionais, apoio à decisão médica (Decision Support), Plano de Segurança Estruturado (CVV 188 / SAMU 192) e psicoeducação com foco em acolhimento sem emissão de diagnósticos automáticos.
* **Identidade Visual:**
  * **Primary:** `#1e4d5c` (Azul-petróleo sóbrio e acolhedor)
  * **Accent:** `#3d8b8b` (Verde-azulado suave)
  * **Neutros:** Tons de cinza quente e off-white

---

## 🚀 Stack Tecnológica

- **Framework:** [TanStack Start](https://tanstack.com/start) + [React 19](https://react.dev/) + TypeScript
- **Roteamento:** [TanStack Router](https://tanstack.com/router) com Type-Safety total
- **Estilização:** [Tailwind CSS v4](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/)
- **Backend / Database:** [PostgreSQL (Supabase)](https://supabase.com/) com Row Level Security (RLS)
- **Runtime / Edge:** [Cloudflare Workers](https://workers.cloudflare.com/) via [Nitro Engine](https://nitro.unjs.io/)
- **Testes:** [Vitest](https://vitest.dev/) (132 testes automatizados)

---

## 📚 Documentação Viva Completa

Toda a arquitetura, regras de negócio e procedimentos operacionais residem na pasta [`documentação viva/`](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/):

1. [01. Arquitetura e Visão Geral](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/01_ARQUITETURA_E_VISAO_GERAL.md)
2. [02. Banco de Dados e Migrações](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/02_BANCO_DE_DADOS_E_MIGRACOES.md)
3. [03. Motor Clínico e Escalas Psiquiátricas](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/03_MOTOR_CLINICO_E_ESCALAS.md)
4. [04. Mapeamento de Rotas e Fluxo de Usuário](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/04_ROTAS_E_FLUXO_DE_USUARIO.md)
5. [05. Variáveis de Ambiente e Infraestrutura](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/05_VARIAVEIS_E_INFRA_CLOUDFLARE.md)
6. [06. Runbook de Reprodução Do Zero](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/06_RUNBOOK_REPRODUCAO_DO_ZERO.md)
7. [07. Skills, Rules e Governança Agêntica](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/07_SKILLS_E_RULES_AGENTICAS.md)

---

## ⚡ Comandos de Execução Rápida

```bash
# Instalação das dependências
bun install

# Executar a suíte completa de testes (132 testes)
bun test:run

# Verificação estática de tipos
bun x tsc --noEmit

# Iniciar servidor de desenvolvimento local
bun run dev

# Build de produção
bun run build

# Deploy no Cloudflare Workers
bun x wrangler deploy
```

---

## 🌐 Endpoints Ativos

* **Produção:** [https://triagempsi.pontocomumtus.workers.dev](https://triagempsi.pontocomumtus.workers.dev)
* **Triagem Saraiva Clínica:** [https://triagempsi.pontocomumtus.workers.dev/saraiva/triagem](https://triagempsi.pontocomumtus.workers.dev/saraiva/triagem)
* **Portal do Paciente:** [https://triagempsi.pontocomumtus.workers.dev/portal](https://triagempsi.pontocomumtus.workers.dev/portal)
* **Acesso Médico:** [https://triagempsi.pontocomumtus.workers.dev/auth](https://triagempsi.pontocomumtus.workers.dev/auth)
* **Painel Clínico:** [https://triagempsi.pontocomumtus.workers.dev/painel](https://triagempsi.pontocomumtus.workers.dev/painel)
