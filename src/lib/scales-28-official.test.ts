import { describe, expect, it } from "vitest";
import { SCALE_BY_CODE } from "@/lib/scales-data";
import { scoreScale } from "@/lib/scoring";

describe("As 28 Escalas Psiquiátricas Oficiais do TriagemPsi", () => {
  // 1. PHQ-9 (Depressão + item 9)
  describe("1. PHQ-9", () => {
    it("pontua faixas clínicas corretamente", () => {
      const min = scoreScale("PHQ-9", { "1": 1, "2": 1, "9": 0 });
      expect(min.scale_code).toBe("PHQ-9");
      expect(min.score).toBe(2);
      expect(min.band_level).toBe(0);
      expect(min.risk).toBe(false);

      const mod = scoreScale("PHQ-9", { "1": 3, "2": 3, "3": 3, "4": 2, "9": 0 });
      expect(mod.score).toBe(11);
      expect(mod.band_level).toBe(2);
      expect(mod.risk).toBe(false);

      const grave = scoreScale("PHQ-9", {
        "1": 3,
        "2": 3,
        "3": 3,
        "4": 3,
        "5": 3,
        "6": 3,
        "7": 3,
        "9": 0,
      });
      expect(grave.score).toBe(21);
      expect(grave.band_level).toBe(4);
    });

    it("item 9 positivo dispara risk flag imediato", () => {
      const r = scoreScale("PHQ-9", { "1": 0, "9": 1 });
      expect(r.risk).toBe(true);
    });
  });

  // 2. GAD-7 (Ansiedade)
  describe("2. GAD-7", () => {
    it("pontua faixas clínicas e risk flag em gravidade alta", () => {
      const leve = scoreScale("GAD-7", { "1": 2, "2": 2, "3": 2 });
      expect(leve.score).toBe(6);
      expect(leve.band_level).toBe(1);
      expect(leve.risk).toBe(false);

      const grave = scoreScale("GAD-7", { "1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 1 });
      expect(grave.score).toBe(16);
      expect(grave.band_level).toBe(4);
      expect(grave.risk).toBe(true);
    });
  });

  // 3. ASRS-18 (TDAH Adulto)
  describe("3. ASRS-18", () => {
    it("classifica como positivo quando Parte A >= 4 sintomas clinicamente significativos", () => {
      // Itens 1-3 com valor 3 (Frequentemente), 4 com valor 3
      const pos = scoreScale("ASRS-18", { "1": 3, "2": 3, "3": 3, "4": 3, "5": 0, "6": 0 });
      expect(pos.band_level).toBe(3);
      expect(pos.band).toContain("Rastreio positivo");

      const neg = scoreScale("ASRS-18", { "1": 1, "2": 1, "3": 1, "4": 0, "5": 0, "6": 0 });
      expect(neg.band_level).toBe(0);
      expect(neg.band).toContain("Rastreio negativo");
    });
  });

  // 4. MDQ (Bipolar)
  describe("4. MDQ", () => {
    it("pontua sintomas e corte positivo >= 7", () => {
      const answers: Record<string, number> = {};
      for (let i = 1; i <= 7; i++) answers[String(i)] = 1;
      const r = scoreScale("MDQ", answers);
      expect(r.score).toBe(7);
      expect(r.band_level).toBe(3);
      expect(r.band).toContain("Rastreio positivo");
    });
  });

  // 5. ISI (Insônia)
  describe("5. ISI", () => {
    it("classifica insônia subclínica, moderada e grave", () => {
      const sub = scoreScale("ISI", { "1": 3, "2": 3, "3": 3 });
      expect(sub.score).toBe(9);
      expect(sub.band_level).toBe(1);

      const mod = scoreScale("ISI", { "1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3 });
      expect(mod.score).toBe(18);
      expect(mod.band_level).toBe(3);
    });
  });

  // 6. AUDIT (Álcool)
  describe("6. AUDIT", () => {
    it("identifica uso de risco e provável dependência com risk flag", () => {
      const risco = scoreScale("AUDIT", { "1": 3, "2": 3, "3": 3 });
      expect(risco.score).toBe(9);
      expect(risco.band_level).toBe(2);

      const dep = scoreScale("AUDIT", { "1": 4, "2": 4, "3": 4, "4": 4, "5": 4 });
      expect(dep.score).toBe(20);
      expect(dep.band_level).toBe(4);
      expect(dep.risk).toBe(true);
    });
  });

  // 7. DAST-10 (Substâncias)
  describe("7. DAST-10", () => {
    it("pontua de 0 a 10 com risk flag em risco substancial", () => {
      const baixo = scoreScale("DAST-10", { "1": 1 });
      expect(baixo.score).toBe(1);
      expect(baixo.band_level).toBe(1);
      expect(baixo.risk).toBe(false);

      const grave = scoreScale("DAST-10", { "1": 1, "2": 1, "3": 1, "4": 1, "5": 1, "6": 1 });
      expect(grave.score).toBe(6);
      expect(grave.band_level).toBe(3);
      expect(grave.risk).toBe(true);
    });
  });

  // 8. C-SSRS (Columbia Suicídio)
  describe("8. C-SSRS", () => {
    it("qualquer resposta gera risk flag, e plano/intenção gera nível 4", () => {
      const passivo = scoreScale("C-SSRS", { "1": 1 });
      expect(passivo.score).toBe(1);
      expect(passivo.risk).toBe(true);
      expect(passivo.band_level).toBe(2);

      const critico = scoreScale("C-SSRS", { "1": 1, "5": 1 });
      expect(critico.risk).toBe(true);
      expect(critico.band_level).toBe(4);
      expect(critico.band).toContain("Risco alto / iminente");
    });
  });

  // 9. Y-BOCS (TOC)
  describe("9. Y-BOCS", () => {
    it("pontua de 0 a 40 em faixas de gravidade", () => {
      const mod = scoreScale("Y-BOCS", {
        "1": 2,
        "2": 2,
        "3": 2,
        "4": 2,
        "5": 2,
        "6": 2,
        "7": 2,
        "8": 2,
        "9": 2,
      });
      expect(mod.score).toBe(18);
      expect(mod.band_level).toBe(2);
      expect(mod.band).toBe("TOC moderado");
    });
  });

  // 10. PCL-5 (TEPT)
  describe("10. PCL-5", () => {
    it("identifica TEPT provável com corte >= 31", () => {
      const answers: Record<string, number> = {};
      for (let i = 1; i <= 10; i++) answers[String(i)] = 4;
      const r = scoreScale("PCL-5", answers);
      expect(r.score).toBe(40);
      expect(r.band_level).toBe(3);
      expect(r.risk).toBe(true);
    });
  });

  // 11. EPDS (Depressão Perinatal)
  describe("11. EPDS", () => {
    it("item 10 gera risk flag imediato", () => {
      const r = scoreScale("EPDS", { "10": 1 });
      expect(r.risk).toBe(true);
    });
  });

  // 12. AQ-10 (Autismo Adulto)
  describe("12. AQ-10", () => {
    it("corte >= 6 indica rastreio positivo", () => {
      const answers: Record<string, number> = {};
      for (let i = 1; i <= 6; i++) answers[String(i)] = 1;
      const r = scoreScale("AQ-10", answers);
      expect(r.score).toBe(6);
      expect(r.band_level).toBe(3);
    });
  });

  // 13. SPIN (Fobia Social)
  describe("13. SPIN", () => {
    it("pontua gravidade de fobia social", () => {
      const answers: Record<string, number> = {};
      for (let i = 1; i <= 10; i++) answers[String(i)] = 3;
      const r = scoreScale("SPIN", answers);
      expect(r.score).toBe(30);
      expect(r.band_level).toBe(1);
    });
  });

  // 14. PDSS-SR (Pânico)
  describe("14. PDSS-SR", () => {
    it("classifica gravidade do pânico", () => {
      const r = scoreScale("PDSS-SR", { "1": 2, "2": 2, "3": 2, "4": 2, "5": 2 });
      expect(r.score).toBe(10);
      expect(r.band_level).toBe(2);
      expect(r.band).toBe("Transtorno de pânico leve");
    });
  });

  // 15. BES (Compulsão Alimentar)
  describe("15. BES", () => {
    it("classifica compulsão moderada e grave", () => {
      const answers: Record<string, number> = {};
      for (let i = 1; i <= 10; i++) answers[String(i)] = 2;
      const r = scoreScale("BES", answers);
      expect(r.score).toBe(20);
      expect(r.band_level).toBe(2);
      expect(r.band).toBe("Compulsão alimentar moderada");
    });
  });

  // 16. PHQ-15 (Somatização)
  describe("16. PHQ-15", () => {
    it("pontua sintomas somáticos", () => {
      const r = scoreScale("PHQ-15", { "1": 2, "2": 2, "3": 2, "4": 1 });
      expect(r.score).toBe(7);
      expect(r.band_level).toBe(1);
      expect(r.band).toBe("Baixa");
    });
  });

  // 17. MBI-HSS (Burnout)
  describe("17. MBI-HSS", () => {
    it("classifica alto risco de Burnout", () => {
      const answers: Record<string, number> = {};
      for (let i = 1; i <= 6; i++) answers[String(i)] = 5;
      const r = scoreScale("MBI-HSS", answers);
      expect(r.score).toBe(30);
      expect(r.band_level).toBe(4);
    });
  });

  // 18. CRAFFT (Substâncias Jovens)
  describe("18. CRAFFT", () => {
    it("corte >= 2 gera risk flag", () => {
      const r = scoreScale("CRAFFT", { "1": 1, "2": 1 });
      expect(r.score).toBe(2);
      expect(r.risk).toBe(true);
      expect(r.band_level).toBe(3);
    });
  });

  // 19. SCOFF (Transtorno Alimentar)
  describe("19. SCOFF", () => {
    it("corte >= 2 indica rastreio positivo", () => {
      const r = scoreScale("SCOFF", { "1": 1, "2": 1 });
      expect(r.score).toBe(2);
      expect(r.band_level).toBe(3);
    });
  });

  // 20. HADS (Ansiedade + Depressão)
  describe("20. HADS", () => {
    it("pontua escala hospitalar", () => {
      const answers: Record<string, number> = {};
      for (let i = 1; i <= 8; i++) answers[String(i)] = 2;
      const r = scoreScale("HADS", answers);
      expect(r.score).toBe(16);
      expect(r.band_level).toBe(2);
    });
  });

  // 21. PSS-10 (Estresse Percebido)
  describe("21. PSS-10", () => {
    it("pontua níveis de estresse percebido", () => {
      const r = scoreScale("PSS-10", { "1": 3, "2": 3, "3": 3, "6": 3, "9": 3, "10": 3 });
      expect(r.score).toBe(18);
      expect(r.band_level).toBe(2);
    });
  });

  // 22. WHO-5 (Bem-estar e risco depressivo)
  describe("22. WHO-5", () => {
    it("classifica bem-estar muito reduzido e gera risk flag", () => {
      const r = scoreScale("WHO-5", { "1": 1, "2": 1, "3": 1 });
      expect(r.score).toBe(3);
      expect(r.risk).toBe(true);
      expect(r.band_level).toBe(4);
    });
  });

  // 23. ASRS-C (TDAH Criança)
  describe("23. ASRS-Criança", () => {
    it("pontua rastreio positivo para infância", () => {
      const answers: Record<string, number> = {};
      for (let i = 1; i <= 9; i++) answers[String(i)] = 3;
      const r = scoreScale("ASRS-C", answers);
      expect(r.score).toBe(27);
      expect(r.band_level).toBe(3);
    });
  });

  // 24. SNAP-IV
  describe("24. SNAP-IV", () => {
    it("pontua sintomas infantojuvenis", () => {
      const r = scoreScale("SNAP-IV", { "1": 3, "2": 3, "3": 3 });
      expect(r.score).toBe(9);
      expect(r.scale_code).toBe("SNAP-IV");
    });
  });

  // 25. CGI-S (Gravidade Global 1-7)
  describe("25. CGI-S", () => {
    it("score >= 6 dispara risk flag", () => {
      const r = scoreScale("CGI-S", { "1": 6 });
      expect(r.score).toBe(6);
      expect(r.risk).toBe(true);
      expect(r.band_level).toBe(4);
    });
  });

  // 26. WSAS (Prejuízo Funcional 0-40)
  describe("26. WSAS", () => {
    it("classifica prejuízo severo com score >= 21", () => {
      const r = scoreScale("WSAS", { "1": 5, "2": 5, "3": 5, "4": 4, "5": 4 });
      expect(r.score).toBe(23);
      expect(r.band_level).toBe(4);
    });
  });

  // 27. PHQ-2 + GAD-2 (Screeners Iniciais)
  describe("27. PHQ-2 e GAD-2", () => {
    it("corte >= 3 ativa gatilho de aprofundamento", () => {
      const phq2 = scoreScale("PHQ-2", { "1": 2, "2": 1 });
      expect(phq2.score).toBe(3);
      expect(phq2.band_level).toBe(2);

      const gad2 = scoreScale("GAD-2", { "1": 3 });
      expect(gad2.score).toBe(3);
      expect(gad2.band_level).toBe(2);
    });
  });

  // 28. RISK-COMPOSITE
  describe("28. RISK-COMPOSITE", () => {
    it("sinaliza atenção clínica ou emergência", () => {
      const r = scoreScale("RISK-COMPOSITE", { suicidio: 1, psicose: 1, mania: 1 });
      expect(r.score).toBe(3);
      expect(r.risk).toBe(true);
      expect(r.band_level).toBe(4);
    });
  });
});
