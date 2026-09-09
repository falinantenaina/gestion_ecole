"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2, Search } from "lucide-react";
import type { Student, Class, SchoolYear } from "@/types";

interface EnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const statusLabels: Record<string, string> = {
  PENDING: "En attente",
  VALIDATED: "Validée",
  CANCELLED: "Annulée",
  COMPLETED: "Terminée",
};

export default function EnrollmentModal({
  isOpen,
  onClose,
  onSuccess,
}: EnrollmentModalProps) {
  const [formData, setFormData] = useState({
    studentId: "",
    classId: "",
    schoolYearId: "",
    status: "PENDING" as string,
    notes: "",
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);

  const [studentSearch, setStudentSearch] = useState("");
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const fetchDropdowns = useCallback(async () => {
    setLoadingDropdowns(true);
    try {
      const [studentsRes, classesRes, yearsRes] = await Promise.all([
        fetch("/api/eleves?limit=100"),
        fetch("/api/classes?limit=100"),
        fetch("/api/school-years"),
      ]);
      const studentsData = await studentsRes.json();
      const classesData = await classesRes.json();
      const yearsData = await yearsRes.json();
      setStudents(studentsData.data || []);
      setClasses(classesData.data || []);
      setSchoolYears(yearsData.data || []);
    } catch {
      setStudents([]);
      setClasses([]);
      setSchoolYears([]);
    } finally {
      setLoadingDropdowns(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchDropdowns();
    }
  }, [isOpen, fetchDropdowns]);

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        studentId: "",
        classId: "",
        schoolYearId: "",
        status: "PENDING",
        notes: "",
      });
      setStudentSearch("");
      setErrors({});
      setSubmitError("");
    }
  }, [isOpen]);

  const filteredStudents = students.filter((s) => {
    const query = studentSearch.toLowerCase();
    return (
      s.firstName.toLowerCase().includes(query) ||
      s.lastName.toLowerCase().includes(query) ||
      s.matricule.toLowerCase().includes(query)
    );
  });

  const selectedStudent = students.find((s) => s.id === formData.studentId);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!formData.studentId) {
      newErrors.studentId = "L'élève est requis";
    }
    if (!formData.classId) {
      newErrors.classId = "La classe est requise";
    }
    if (!formData.schoolYearId) {
      newErrors.schoolYearId = "L'année scolaire est requise";
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
      const res = await fetch("/api/inscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: formData.studentId,
          classId: formData.classId,
          schoolYearId: formData.schoolYearId,
          status: formData.status,
          notes: formData.notes.trim() || null,
        }),
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
            Nouvelle Inscription
          </h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {submitError}
            </div>
          )}

          {loadingDropdowns ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
              <span className="ml-2 text-sm text-gray-500">Chargement...</span>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Élève *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName} (${selectedStudent.matricule})` : "Rechercher un élève..."}
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setShowStudentDropdown(true);
                      if (formData.studentId) {
                        setFormData((prev) => ({ ...prev, studentId: "" }));
                      }
                    }}
                    onFocus={() => setShowStudentDropdown(true)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.studentId ? "border-red-300" : "border-gray-300"
                    }`}
                  />
                  {showStudentDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredStudents.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          Aucun élève trouvé
                        </div>
                      ) : (
                        filteredStudents.map((student) => (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                studentId: student.id,
                              }));
                              setStudentSearch(
                                `${student.firstName} ${student.lastName}`
                              );
                              setShowStudentDropdown(false);
                              if (errors.studentId) {
                                setErrors((prev) => {
                                  const next = { ...prev };
                                  delete next.studentId;
                                  return next;
                                });
                              }
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 transition-colors flex justify-between items-center"
                          >
                            <span className="font-medium text-gray-900">
                              {student.firstName} {student.lastName}
                            </span>
                            <span className="text-xs text-gray-500 font-mono">
                              {student.matricule}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {errors.studentId && (
                  <p className="text-xs text-red-500 mt-1">{errors.studentId}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Classe *
                  </label>
                  <select
                    value={formData.classId}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        classId: e.target.value,
                      }));
                      if (errors.classId) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.classId;
                          return next;
                        });
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.classId ? "border-red-300" : "border-gray-300"
                    }`}
                  >
                    <option value="">Sélectionner...</option>
                    {classes.map((classe) => (
                      <option key={classe.id} value={classe.id}>
                        {classe.name}
                      </option>
                    ))}
                  </select>
                  {errors.classId && (
                    <p className="text-xs text-red-500 mt-1">{errors.classId}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Année Scolaire *
                  </label>
                  <select
                    value={formData.schoolYearId}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        schoolYearId: e.target.value,
                      }));
                      if (errors.schoolYearId) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.schoolYearId;
                          return next;
                        });
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.schoolYearId ? "border-red-300" : "border-gray-300"
                    }`}
                  >
                    <option value="">Sélectionner...</option>
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
                  Statut
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  rows={3}
                  placeholder="Notes optionnelles..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </>
          )}

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
              disabled={submitting || loadingDropdowns}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Créer l&apos;inscription
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
