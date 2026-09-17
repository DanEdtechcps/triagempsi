# Skills, Rules e Governança Agêntica

Este documento reúne todas as **Regras de Ouro**, **Instruções de Agente**, **Políticas de Governança de Código** e **Habilidades Especializadas (Skills)** aplicadas no desenvolvimento e manutenção contínua desta plataforma. Qualquer agente autônomo ou modelo de linguagem operando neste repositório deve seguir rigorosamente estes preceitos.

---

## 1. Regras Fundamentais do Usuário (Daniel Arraes Reino)

### Regra de Ouro: Links de Arquivos Clicáveis
- **SEMPRE** que um arquivo relevante for criado, editado ou referenciado na conversa ou relatório, o agente **DEVE** fornecer um link markdown clicável direto utilizando o esquema `file://`.
- **Formato Mandatório:** `[Nome do Arquivo](file:///caminho/absoluto/do/arquivo)` ou com linhas `[Nome](file:///caminho#L10-L25)`.
- **Justificativa:** Elimina o atrito cognitivo de navegação e permite auditoria instantânea por qualquer ferramenta ou IDE integrada.

### Comunicação Direta e Sem Enrolação
- Respostas orientadas à solução ("Macarrão Carbonara com os talheres corretos"):
  - Sem introduções genéricas ou rodeios desnecessários.
  - Resultados diretos, testes executados e status objetivo de cada entrega.

---

## 2. Regras de Preservação e Integração Lovable

```markdown
<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> Este projeto possui sincronização com a plataforma Lovable.
> NUNCA reescreva o histórico git publicado (evite expressamente `git push --force`, rebase ou squash de commits que já foram enviados para o repositório remoto).
> Forçar commits destrói o histórico de versões no editor visual do Lovable.
> Mantenha a branch `main` sempre em estado compilável e funcional (verde).
<!-- LOVABLE:END -->
```

---

## 3. Diretrizes de Segurança e Proteção de Segredos

### Regra Anti-Exposição (GitHub Push Protection)
- Chaves do tipo `SUPABASE_SERVICE_ROLE_KEY` ou segredos sensíveis **JAMAIS** devem ser gravados em arquivos rastreados pelo Git (`wrangler.jsonc`, `config.ts`, etc.).
- O GitHub bloqueia commits com push protection (GH013).
- **Padrão Obrigatório:**
  - Chaves públicas anon/publishable (`sb_publishable_...`) podem residir no `.env.production` e variáveis públicas do `wrangler.json`.
  - Service Role Key deve ser injetada via Secret Manager do Cloudflare (`wrangler secret put SUPABASE_SERVICE_ROLE_KEY`) ou Supabase Vault.

### Fallback de Inicialização do Supabase Client
No bundle estático gerado por Vite, o código do cliente não deve assumir que `import.meta.env` ou `process.env` sempre estarão povoados em tempo de execução:
- Implementar **triplo fallback**:
  1. `import.meta.env.VITE_SUPABASE_URL`
  2. `globalThis.__SUPABASE_URL__` (se injetado no runtime)
  3. Constante de fallback da instância de produção

---

## 4. Skills e Boas Práticas do Banco de Dados (Supabase / Postgres)

### Modelagem e RLS (Row Level Security)
- **RLS Ativo:** Toda tabela nova deve conter obrigatoriamente `ALTER TABLE public.<nome> ENABLE ROW LEVEL SECURITY;`.
- **Políticas com Roles Seguras:** Uso do helper `auth.has_role(auth.uid(), 'admin'::app_role)` para evitar consultas circulares ou brechas de segurança.
- **Isolamento de Tenant:** Consultas públicas ou de médicos devem sempre validar `clinic_id` ou permissão de vínculo de equipe.
- **Tipagem Estrita:** Uso de `TIMESTAMPTZ` para todos os campos temporais e `UUID` para chaves primárias.

### Prevenção de Inatividade (Keepalive)
- Instâncias gratuitas do Supabase entram em pausa após inatividade.
- **Solução Padronizada:** Manter uma tabela técnica `_keepalive` atualizada via cron job interno (`pg_cron`) e via GitHub Actions semanal/diário.

---

## 5. Skills de Engenharia Frontend e UX Clínica

### Arquitetura de Componentes
- Stack: **React 19 + TypeScript + Vite + Tailwind CSS + Radix UI / Shadcn**.
- Isolamento do motor de cálculo: funções puras em `src/lib/clinical-engine/` sem dependência de estado de UI.
- Feedback Imediato: Loading skeletons em transições de rota e toast notifications amigáveis para mensagens de erro ou sucesso.

### Validação e Testes Contínuos (TDD Gate)
- Toda alteração nas regras de pontuação de escalas (PHQ-9, GAD-7, C-SSRS, CRAFFT, ASRS) deve ser acompanhada por testes unitários com **Vitest**.
- O build deve ser verificado com `tsc --noEmit` antes de qualquer commit.

---

## 6. Governança para Próximos Agentes de IA

Ao ser inicializado para trabalhar neste projeto:
1. **Consulte a pasta `documentação viva/`** antes de propor mudanças arquiteturais.
2. **Execute os testes (`bun test:run`)** para garantir que o ambiente está íntegro.
3. **Mantenha os arquivos da pasta `documentação viva/` atualizados** sempre que novas tabelas, rotas ou fluxos clínicos forem adicionados.
4. **Respeite o formato de saída do usuário Daniel**, mantendo links de arquivo clicáveis e foco cirúrgico na execução.
