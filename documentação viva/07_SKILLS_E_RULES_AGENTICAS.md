# 07. Skills, Rules e Governança Agêntica — TriagemPsi

> **Responsáveis do Projeto:** Daniel Arraes Reino (Arquitetura & Engenharia) & Dr. José Saraiva Jr. (Direção Médica)  
> **Versão de Governança:** v1.30.0 (Atualizada em Setembro de 2026)

Este documento reúne todas as **Regras de Ouro**, **Instruções de Agente**, **Políticas de Governança de Código** e **Diretrizes Ético-Clínicas** aplicadas no desenvolvimento, manutenção e evolução contínua da plataforma. Qualquer agente autônomo, CLI ou modelo de linguagem operando neste repositório deve seguir rigorosamente estes preceitos.

---

## 1. Identidade Ético-Clínica e Tom de Voz

O sistema deve sempre refletir a autoridade humanizada, científica e integrativa da prática médica:

1. **Tom de Voz da Comunicação:**
   - **Acolhedor e Claro:** Herança direta da Medicina de Família e Comunidade.
   - **Técnico sem ser frio:** Vocabulário médico fundamentado em evidências (DSM-5, CID-11, diretrizes da ABP e OMS), mas acessível ao paciente em sofrimento.
   - **Educativo e Orientativo:** Focado na psicoeducação ativa em vez de rotulações precipitadas.
   - **Sem Sensacionalismo:** NUNCA utilizar termos como *"cura definitiva"*, *"solução mágica"* ou qualquer abordagem de marketing médico abusivo.
   - **Respeito Absoluto ao Sofrimento:** Reconhece a dor psíquica com dignidade e validação empática.

2. **Diretriz de Segurança Inviolável (Protocolo de Crise):**
   - Diante de qualquer sinal de risco (PHQ-9 item 9 ≥ 1, C-SSRS positivo ou RISK-COMPOSITE), a prioridade absoluta do sistema é a exibição do **Plano de Segurança Estruturado** com os canais gratuitos de emergência 24h: **CVV 188** e **SAMU 192**.

3. **Padrão Cromático Oficial:**
   - **Saraiva:** Primary `#1e4d5c` (Azul-petróleo sóbrio e confiável), Accent `#3d8b8b` (Verde-azulado suave).
   - **Lumina:** Primary `#1e1b4b` (Índigo profundo), Accent `#6366f1` (Índigo vibrante).
   - **Neutros:** Tons de cinza quente e off-white para legibilidade confortável e sem fadiga visual.

---

## 2. Regras Mandatórias do Usuário (Daniel Arraes Reino)

### 2.1 Regra de Ouro: Links de Arquivos Clicáveis
- **SEMPRE** que um arquivo relevante for criado, editado ou referenciado na conversa, plano ou relatório, o agente **DEVE** fornecer um link markdown clicável direto utilizando o esquema `file://`.
- **Formato Mandatório:** `[Nome do Arquivo](file:///caminho/absoluto/do/arquivo)` ou com linhas `[Nome](file:///caminho#L10-L25)`.
- **Justificativa:** Elimina o atrito cognitivo de navegação e permite auditoria instantânea por qualquer ferramenta ou IDE integrada.

### 2.2 Abordagem de Sessão ("O Pedido do Macarrão Carbonara")
- Servir a resposta exatamente com os "talheres" que o Daniel gosta:
  - Links clicáveis no padrão exigido.
  - Respostas diretas ao ponto, sem preâmbulos genéricos ou enrolação.
  - Respeito aos frameworks de engenharia, governança e marketing legaltech/saúde.
  - Ao receber comandos de ação como `/plan`, obedecer rigidamente ao protocolo e sempre finalizar disponibilizando o link do artefato `.md` gerado.

---

## 3. Regras de Preservação e Integração Lovable

```markdown
<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> Este projeto possui sincronização com a plataforma Lovable.
> NUNCA reescreva o histórico git publicado (evite expressamente git push --force, rebase ou squash de commits que já foram enviados para o repositório remoto).
> Reescrever histórico destrói a trilha de versões no editor visual do Lovable.
> Mantenha a branch main sempre em estado compilável e funcional (verde).
<!-- LOVABLE:END -->
```

---

## 4. Diretrizes de Segurança e Proteção de Segredos

### 4.1 Bloqueio de Exposição de Segredos (GitHub Push Protection)
- Chaves privadas como `SUPABASE_SERVICE_ROLE_KEY` **JAMAIS** devem ser gravadas em arquivos rastreados pelo Git (`wrangler.json`, `config.ts`, `.env.production`, etc.).
- O GitHub bloqueia commits com push protection (erro GH013).
- **Padrão Obrigatório:**
  - Chaves públicas anon (`sb_publishable_...`) residem no `.env.production` e em `vars` do `wrangler.json`.
  - A Service Role Key deve ser injetada via Secret Manager do Cloudflare (`bun x wrangler secret put SUPABASE_SERVICE_ROLE_KEY`).

### 4.2 Triplo Fallback de Inicialização do Supabase Client
No bundle estático gerado por Vite, o código do cliente não deve assumir que variáveis de ambiente sempre estarão povoadas em tempo de execução:
1. `import.meta.env.VITE_SUPABASE_URL`
2. `process.env.SUPABASE_URL` || `process.env.VITE_SUPABASE_URL`
3. Constante canônica da instância de produção (`https://ffyjjkouscnabyxjxexu.supabase.co`).

---

## 5. Práticas de Banco de Dados e Multi-Tenant (Postgres / Supabase)

1. **RLS Ativo e Inegociável:** Toda tabela criada deve conter obrigatoriamente `ALTER TABLE public.<nome> ENABLE ROW LEVEL SECURITY;`.
2. **Governança Multi-Tenant:**
   - Super Admin: `coletivoaruatemvoz@gmail.com` (`clinic_id: NULL`) com visão global.
   - Médicos e Equipe: `clinic_id` obrigatório e validado por RLS e funções `SECURITY DEFINER`.
3. **Tipagem e Padrões:**
   - Chaves primárias: `UUID` com `DEFAULT gen_random_uuid()`.
   - Campos de data/hora: `TIMESTAMPTZ` com `DEFAULT now()`.
   - Campos de dados flexíveis (telemetria, scores brutos): `JSONB`.

---

## 6. Portões de Qualidade (Quality Gates)

Antes de qualquer conclusão de tarefa ou envio de commit, o agente deve obrigatoriamente executar:

1. **Verificação de Tipos:**
   ```bash
   bun x tsc --noEmit
   ```
   *Meta:* 0 erros de compilação.

2. **Suíte Completa de Testes:**
   ```bash
   bun run test
   ```
   *Meta:* 204 testes aprovados (16 arquivos de teste).

3. **Build de Produção:**
   ```bash
   bun run build
   ```
   *Meta:* Compilação do Nitro e Vite concluída em menos de 2 segundos.
