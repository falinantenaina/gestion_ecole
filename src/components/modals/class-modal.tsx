"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import type { Class, SchoolYear } from "@/types";

interface ClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  classe?: Class | null;
  onSuccess: () => void;
}

export default function ClassModal({
  isOpen,
  onClose,
  classe,
  onSuccess,
}: ClassModalProps) {
  const isEditing = !!classe;

  const [formData, setFormData] = useState({
    name: "",
    level: "",
    section: "",
    capacity: "40",
    schoolYearId: "",
    description: "",
  });

  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    fetch("/api/school-years")
      .then((res) => res.json())
      .then((data) => setSchoolYears(data.data || []))
      .catch(() => setSchoolYears([]));
  }, []);

  useEffect(() => {
    if (classe) {
      setFormData({
        name: classe.name || "",
        level: classe.level || "",
        section: classe.section || "",
        capacity: String(classe.capacity || 40),
        schoolYearId: classe.schoolYearId || "",
        description: classe.description || "",
      });
    } else {
      const currentYear = schoolYears.find((sy) => sy.isCurrent);
      setFormData({
        name: "",
        level: "",
        section: "",
        capacity: "40",
        schoolYearId: currentYear?.id || "",
        description: "",
      });
    }
    setErrors({});
    setSubmitError("");
  }, [classe, isOpen, schoolYears]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Le nom est requis";
    }
    if (!formData.level.trim()) {
      newErrors.level = "Le niveau est requis";
    }
    if (!formData.schoolYearId) {
      newErrors.schoolYearId = "L'année scolaire est requise";
    }
    if (
      formData.capacity &&
      (isNaN(Number(formData.capacity)) || Number(formData.capacity) < 1)
    ) {
      newErrors.capacity = "La capacité doit être un nombre positif";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const url = isEditing ? `/api/classes/${classe.id}` : "/api/classes";
      const method = isEditing ? "PUT" : "POST";

      const body: Record<string, unknown> = {
        name: formData.name.trim(),
        level: formData.level.trim(),
        section: formData.section.trim() || null,
        capacity: formData.capacity ? Number(formData.capacity) : 40,
        schoolYearId: formData.schoolYearId,
        description: formData.description.trim() || null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Une erreur est survenue");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "Une erreur est survenue"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={!submitting ? onClose : undefined}
      />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? "Modifier la classe" : "Nouvelle Classe"}
          </h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ex: 6ème A"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.name ? "border-red-300" : "border-gray-300"
              }`}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Niveau *
              </label>
              <input
                type="text"
                name="level"
                value={formData.level}
                onChange={handleChange}
                placeholder="Ex: 6ème"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.level ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.level && (
                <p className="text-xs text-red-500 mt-1">{errors.level}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Section
              </label>
              <input
                type="text"
                name="section"
                value={formData.section}
                onChange={handleChange}
                placeholder="Ex: A, B, C"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacité
              </label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                min="1"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.capacity ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.capacity && (
                <p className="text-xs text-red-500 mt-1">{errors.capacity}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Année Scolaire *
              </label>
              <select
                name="schoolYearId"
                value={formData.schoolYearId}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.schoolYearId ? "border-red-300" : "border-gray-300"
                }`}
              >
                <option value="">Sélectionner</option>
                {schoolYears.map((sy) => (
                  <option key={sy.id} value={sy.id}>
                    {sy.name}
                  </option>
                ))}
              </select>
              {errors.schoolYearId && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.schoolYearId}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? "Enregistrer" : "Créer la classe"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
