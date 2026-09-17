# Plano de Marketing e Monetização — Documento Estratégico

Entrega: um documento estratégico completo (PDF + DOCX) escrito na voz de um estrategista sênior do nicho de saúde mental digital, cobrindo os três cenários de comprador e uma verba de mídia de R$ 5.000/mês.

## O que o documento vai conter

**1. Diagnóstico e posicionamento**
- O que o produto realmente vende hoje: 29 instrumentos validados, trilha de decisão auditável, parecer médico, PDF pronto, multi-tenant, FHIR, curva longitudinal com RCI.
- Posicionamento central: não é "questionário online" — é redução de tempo da primeira consulta com rastro clínico defensável.
- Mapa competitivo (Mirah, Greenspace, Norse, Medora, WIO, iMental) e as três frases de diferenciação que só nós podemos dizer.
- Mensagens por persona: psiquiatra dono de consultório, gestor de clínica/rede, RH/SESMT.

**2. Precificação — todos os cenários**
- Cenário A — Consultórios e clínicas pequenas: SaaS por profissional, faixas de assento, taxa de implantação, plano anual com desconto.
- Cenário B — Grupos, redes e operadoras: preço por volume de triagens + contrato anual, add-ons (FHIR, SSO, SLA, DPO/LGPD, marca própria).
- Cenário C — Saúde ocupacional (NR-01): preço por colaborador avaliado, campanhas anuais, relatório agregado por empresa.
- Ancoragem, régua de desconto, política de piloto pago, comparação com os R$ 890 / R$ 2.400 já publicados na landing e recomendação de ajuste.
- Tabela de margem por plano com o custo real de servir.

**3. Custo do projeto e unit economics**
- Custo de construção já incorrido (estimativa por escopo entregue) e custo mensal de operação: infraestrutura, e-mail, WhatsApp, armazenamento, suporte.
- Custo por triagem e custo por conta ativa; ponto de equilíbrio por cenário.
- CAC alvo, LTV, LTV/CAC, payback em meses, churn tolerável.

**4. Campanhas — plano de 90 dias com R$ 5.000/mês**
- Alocação de verba por canal e por cenário (Google Search de intenção, Meta/Instagram para psiquiatras, LinkedIn para RH/ocupacional, outbound assistido, conteúdo/SEO, parcerias com sociedades e congressos).
- Calendário mês a mês: mês 1 validação de oferta, mês 2 escala do que converteu, mês 3 abertura do segundo cenário.
- Peças por canal: ângulos de criativo, headlines, provas, objeções e respostas.
- Funil completo com metas por etapa (impressão → clique → lead → demo → piloto → contrato) e taxas de referência.
- Sequências de e-mail e WhatsApp para nutrição e reativação.

**5. ROI**
- ROI do cliente: cálculo de minutos economizados por consulta × valor da hora clínica × volume mensal, em três perfis de consultório — o argumento que fecha a venda.
- ROI da operação de marketing: projeção de 12 meses com três cenários (conservador, base, agressivo), receita recorrente, CAC acumulado, mês de payback.
- Tabela de sensibilidade: o que acontece com o resultado se a conversão cair 30% ou o ticket subir 20%.

**6. Métricas, governança e riscos**
- Painel de KPIs semanais e mensais com metas numéricas.
- Regras de corte: quando pausar um canal, quando dobrar a verba.
- Riscos: CFM/publicidade médica, LGPD e dado sensível de saúde, sazonalidade, dependência de um único cliente âncora — com mitigação para cada um.

**7. Plano de ação de 12 meses**
- Trimestre a trimestre, com marcos comerciais e o que precisa existir no produto para sustentar cada faixa de preço.

## Detalhes técnicos

- Geração via script Python (ReportLab para o PDF, com fonte Unicode registrada para acentuação correta) e docx-js para a versão editável.
- Identidade visual alinhada à landing: paleta noir/ivory já usada no produto, tipografia limpa, tabelas com cabeçalho tonal.
- Todos os números financeiros entram como modelo explícito (premissa → fórmula → resultado), para você trocar as premissas sem refazer o documento.
- Nenhuma estatística de mercado será inventada: números de terceiros só entram com fonte citada; projeções ficam rotuladas como estimativa.
- QA obrigatório: cada página convertida em imagem e inspecionada antes da entrega.
- Arquivos entregues em `/mnt/documents` e registro da entrega no roadmap via `scripts/roadmap-add.mjs`.

## Fora do escopo desta entrega

Nenhuma alteração na landing, nos planos publicados ou no sistema. Se o documento recomendar mudar preços na página, isso vira uma entrega separada depois da sua aprovação.
