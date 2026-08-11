import { apiRequest, apiUpload } from "@/lib/apiClient";
import type { MaterialKind, MaterialListResponse, MaterialPublic } from "@/types/material";

export function listMaterials(token: string): Promise<MaterialListResponse> {
  return apiRequest<MaterialListResponse>("/api/v1/materials", { token });
}

export function uploadMaterial(
  token: string,
  file: File,
  kind: MaterialKind,
  name: string,
): Promise<MaterialPublic> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", kind);
  if (name.trim()) {
    formData.append("name", name.trim());
  }
  return apiUpload<MaterialPublic>("/api/v1/materials", formData, token);
}

export function deleteMaterial(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/api/v1/materials/${id}`, { method: "DELETE", token });
}
