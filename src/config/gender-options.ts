/**
 * Opções padronizadas e inclusivas de sexo biológico e identidade de gênero (LGBTQIA+).
 * Alinhado com diretrizes clínicas de acolhimento e saúde mental humanizada (CFP / CFM / OMS).
 */

export interface GenderOption {
  value: string;
  label: string;
  category?: "cis" | "trans" | "nao-binario" | "intersexo" | "outro" | "privacidade";
}

export const GENDER_OPTIONS: readonly GenderOption[] = [
  { value: "Feminino (cisgênero)", label: "Feminino (cisgênero)", category: "cis" },
  { value: "Masculino (cisgênero)", label: "Masculino (cisgênero)", category: "cis" },
  { value: "Mulher transgênero", label: "Mulher transgênero", category: "trans" },
  { value: "Homem transgênero", label: "Homem transgênero", category: "trans" },
  { value: "Travesti", label: "Travesti", category: "trans" },
  { value: "Não-binário", label: "Não-binário", category: "nao-binario" },
  { value: "Gênero fluido", label: "Gênero fluido", category: "nao-binario" },
  { value: "Agênero", label: "Agênero", category: "nao-binario" },
  { value: "Pessoa Intersexo", label: "Pessoa Intersexo", category: "intersexo" },
  { value: "Outra identidade", label: "Outra identidade (especificar)", category: "outro" },
  { value: "Prefiro não informar", label: "Prefiro não informar", category: "privacidade" },
] as const;

export const PRONOUN_OPTIONS: readonly string[] = [
  "Ela / Dela",
  "Ele / Dele",
  "Elu / Delu (neutro)",
  "Ela / Ele (qualquer um)",
  "Outros pronomes",
  "Prefiro não informar",
] as const;
