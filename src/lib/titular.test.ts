import { describe, expect, it } from "vitest";
import { SUBJECT_MODES, SUBJECT_MODE_LABEL, canExerciseSubjectRights } from "@/lib/titular";

describe("canExerciseSubjectRights", () => {
  it("admin da própria clínica pode", () => {
    expect(canExerciseSubjectRights([{ role: "admin", clinic_id: "a" }], "a")).toBe(true);
  });
  it("admin global (sem clínica) pode em qualquer clínica", () => {
    expect(canExerciseSubjectRights([{ role: "admin", clinic_id: null }], "qualquer")).toBe(true);
  });
  it("admin de OUTRA clínica não pode (isolamento multi-tenant)", () => {
    expect(canExerciseSubjectRights([{ role: "admin", clinic_id: "b" }], "a")).toBe(false);
  });
  it("médico/clínico/staff da própria clínica NÃO podem", () => {
    for (const role of ["doctor", "clinico", "staff"]) {
      expect(canExerciseSubjectRights([{ role, clinic_id: "a" }], "a")).toBe(false);
    }
  });
  it("sem papéis → não pode", () => {
    expect(canExerciseSubjectRights([], "a")).toBe(false);
  });
  it("vários papéis: basta um admin válido", () => {
    expect(
      canExerciseSubjectRights(
        [
          { role: "doctor", clinic_id: "a" },
          { role: "admin", clinic_id: "a" },
        ],
        "a",
      ),
    ).toBe(true);
  });
});

describe("modos", () => {
  it("cada modo tem título e aviso de irreversibilidade", () => {
    for (const m of SUBJECT_MODES) {
      expect(SUBJECT_MODE_LABEL[m].title.length).toBeGreaterThan(5);
      expect(SUBJECT_MODE_LABEL[m].confirm).toMatch(/não pode ser desfeito/i);
    }
  });
});
