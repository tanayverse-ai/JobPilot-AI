import { useEffect, useRef, useState, type FormEvent } from "react";

import AppHeader from "@/components/AppHeader";
import SelectField from "@/components/SelectField";
import TextField from "@/components/TextField";
import { useAuth } from "@/app/AuthContext";
import { ApiError } from "@/lib/apiClient";
import {
  MATERIAL_KIND_LABELS,
  MATERIAL_KIND_ORDER,
  type MaterialKind,
  type MaterialPublic,
} from "@/types/material";

import { deleteMaterial, listMaterials, uploadMaterial } from "./materialsApi";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function MaterialsPage() {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [materials, setMaterials] = useState<MaterialPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [kind, setKind] = useState<MaterialKind>("resume");
  const [name, setName] = useState("");
  const [uploadPending, setUploadPending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  function refresh() {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    listMaterials(token)
      .then((response) => setMaterials(response.items))
      .catch((err) => {
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load your materials. Please try again.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(refresh, [token]);

  async function handleUpload(event: FormEvent) {
    event.preventDefault();
    if (!token || !selectedFile) {
      setUploadError("Choose a file first.");
      return;
    }
    setUploadError(null);
    setUploadPending(true);
    try {
      await uploadMaterial(token, selectedFile, kind, name);
      setSelectedFile(null);
      setName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      refresh();
    } catch (error) {
      setUploadError(error instanceof ApiError ? error.message : "Upload failed. Please try again.");
    } finally {
      setUploadPending(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    setDeletingId(id);
    try {
      await deleteMaterial(token, id);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "Couldn't delete this file. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Materials</h1>
          <p className="mt-1 text-sm text-slate-500">
            Store your résumés, cover letters, and portfolio files in one place.
          </p>
        </div>

        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Upload a file</h2>
          <form onSubmit={handleUpload} noValidate>
            {uploadError ? (
              <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {uploadError}
              </div>
            ) : null}

            <div className="mb-4">
              <label htmlFor="material-file" className="mb-1 block text-sm font-medium text-slate-700">
                File
              </label>
              <input
                ref={fileInputRef}
                id="material-file"
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <p className="mt-1 text-xs text-slate-500">PDF, Word, or image files up to 10MB.</p>
            </div>

            <div className="grid gap-x-4 sm:grid-cols-2">
              <SelectField label="Type" value={kind} onChange={(e) => setKind(e.target.value as MaterialKind)}>
                {MATERIAL_KIND_ORDER.map((k) => (
                  <option key={k} value={k}>
                    {MATERIAL_KIND_LABELS[k]}
                  </option>
                ))}
              </SelectField>
              <TextField
                label="Name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Resume - Backend roles"
              />
            </div>

            <button
              type="submit"
              disabled={uploadPending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploadPending ? "Uploading…" : "Upload"}
            </button>
          </form>
        </div>

        {loadError ? (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {loadError}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <p className="px-6 py-8 text-sm text-slate-500">Loading…</p>
          ) : materials.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-900">No files yet</p>
              <p className="mt-1 text-sm text-slate-500">Upload your résumé to get started.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {materials.map((material) => (
                <li key={material.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <a
                      href={material.asset_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      {material.name}
                    </a>
                    <p className="truncate text-xs text-slate-500">
                      {MATERIAL_KIND_LABELS[material.kind]} · {formatBytes(material.bytes)} · Added{" "}
                      {formatDate(material.created_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(material.id)}
                    disabled={deletingId === material.id}
                    className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingId === material.id ? "Removing…" : "Remove"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
