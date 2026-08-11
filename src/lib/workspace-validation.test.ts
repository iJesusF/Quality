import { describe, expect, it } from "vitest";
import { workspaceSchema, workspaceValidationMessage } from "./workspace-validation";

describe("workspaceSchema", () => {
  it("normalizes valid workspace fields", () => {
    expect(workspaceSchema.parse({
      organization: "  VORTECH  ",
      slug: "  Vortech-Quality  ",
      project: "  Proyecto Uno  ",
      code: "  PROJ-001  ",
    })).toEqual({
      organization: "VORTECH",
      slug: "vortech-quality",
      project: "Proyecto Uno",
      code: "PROJ-001",
    });
  });

  it("names the fields that need attention", () => {
    const result = workspaceSchema.safeParse({ organization: "V", slug: "slug inválido", project: "", code: "P" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(workspaceValidationMessage(result.error)).toBe("Revisa los campos: Organización, Identificador, Primer proyecto, Código.");
    }
  });
});
