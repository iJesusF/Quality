import { z } from "zod";

export const workspaceSchema = z.object({
  organization: z.string().trim().min(2).max(100),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/),
  project: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(20),
});

const fieldLabels: Record<keyof z.infer<typeof workspaceSchema>, string> = {
  organization: "Organización",
  slug: "Identificador",
  project: "Primer proyecto",
  code: "Código",
};

export function workspaceValidationMessage(error: z.ZodError) {
  const fields = [...new Set(error.issues.map((issue) => fieldLabels[issue.path[0] as keyof typeof fieldLabels]).filter(Boolean))];
  return fields.length === 1
    ? `Revisa el campo: ${fields[0]}.`
    : `Revisa los campos: ${fields.join(", ")}.`;
}
