// Mirrors backend/app/schemas/material.py so the API contract only has one
// place it can drift: this file.

export type MaterialKind = "resume" | "cover_letter" | "portfolio" | "other";

export const MATERIAL_KIND_LABELS: Record<MaterialKind, string> = {
  resume: "Résumé",
  cover_letter: "Cover letter",
  portfolio: "Portfolio",
  other: "Other",
};

export const MATERIAL_KIND_ORDER: MaterialKind[] = ["resume", "cover_letter", "portfolio", "other"];

export interface MaterialPublic {
  id: string;
  kind: MaterialKind;
  name: string;
  asset_url: string;
  mime_type: string;
  bytes: number;
  created_at: string;
  updated_at: string;
}

export interface MaterialListResponse {
  items: MaterialPublic[];
}
