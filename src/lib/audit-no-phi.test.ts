import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// LGPD: a trilha de auditoria é lida por toda a equipe da clínica e é imutável.
// Nome/telefone/e-mail de paciente NÃO podem entrar em `details` (o banco também
// remove esses campos num gatilho, mas o código deve estar correto na origem).
const DIR = dirname(fileURLToPath(import.meta.url));
const FORBIDDEN = /\b(respondent_name|contact_name|informant_name|to_phone|phone|destinatario)\s*:/;

/** Extrai o texto de cada chamada recordAudit(...)/recordReadAudit(...) por casamento de parênteses. */
function auditCalls(src: string): string[] {
  const out: string[] = [];
  const re = /\brecord(?:Read)?Audit\s*\(/g;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    let depth = 1;
    let i = m.index + m[0].length;
    for (; i < src.length && depth > 0; i++) {
      if (src[i] === "(") depth++;
      else if (src[i] === ")") depth--;
    }
    out.push(src.slice(m.index, i));
  }
  return out;
}

describe("auditoria sem PHI", () => {
  const files = readdirSync(DIR)
    .filter((f) => /\.(functions|server)\.ts$/.test(f))
    .map((f) => ({ f, src: readFileSync(join(DIR, f), "utf8") }));

  it("encontra chamadas de auditoria para validar (sanidade do teste)", () => {
    const total = files.reduce((n, { src }) => n + auditCalls(src).length, 0);
    expect(total).toBeGreaterThan(10);
  });

  for (const { f, src } of files) {
    const calls = auditCalls(src).filter((c) => !c.includes("function "));
    if (calls.length === 0) continue;
    it(`${f}: nenhuma chamada de auditoria grava nome/telefone/e-mail de paciente`, () => {
      for (const call of calls) {
        expect(call, call.slice(0, 120)).not.toMatch(FORBIDDEN);
      }
    });
  }
});
