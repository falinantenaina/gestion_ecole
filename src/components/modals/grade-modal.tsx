"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2, Search, Calculator } from "lucide-react";
import type {
  Student,
  Subject,
  Class,
  Term,
  SchoolYear,
  Grade,
  EvaluationType,
} from "@/types";

interface GradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  grade?: Grade | null;
  onSuccess: () => void;
}

const evaluationTypeLabels: Record<string, string> = {
  HOMEWORK: "Devoir",
  QUIZ: "Contrôle",
  EXAM: "Examen",
  PARTICIPATION: "Participation",
  PROJECT: "Projet",
};

export default function GradeModal({
  isOpen,
  onClose,
  grade,
  onSuccess,
}: GradeModalProps) {
  const isEditing = !!grade;

  const [formData, setFormData] = useState({
    studentId: "",
    subjectId: "",
    classId: "",
    termId: "",
    schoolYearId: "",
    evaluationType: "HOMEWORK" as EvaluationType,
    score: "",
    maxScore: "20",
    coefficient: "1",
    evaluationName: "",
    evaluationDate: new Date().toISOString().split("T")[0],
    comment: "",
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [classSubjects, setClassSubjects] = useState<
    { subjectId: string; coefficient: number; subject?: Subject }[]
  >([]);

  const [studentSearch, setStudentSearch] = useState("");
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [loadingCoefficient, setLoadingCoefficient] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const fetchDropdowns = useCallback(async () => {
    setLoadingDropdowns(true);
    try {
      const [studentsRes, subjectsRes, classesRes, yearsRes] =
        await Promise.all([
          fetch("/api/eleves?limit=500"),
          fetch("/api/matieres?limit=500"),
          fetch("/api/classes?limit=500"),
          fetch("/api/school-years"),
        ]);
      const studentsData = await studentsRes.json();
      const subjectsData = await subjectsRes.json();
      const classesData = await classesRes.json();
      const yearsData = await yearsRes.json();
      setStudents(studentsData.data || []);
      setSubjects(subjectsData.data || []);
      setClasses(classesData.data || []);
      setSchoolYears(yearsData.data || []);
    } catch {
      setStudents([]);
      setSubjects([]);
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
    if (formData.schoolYearId) {
      const sy = schoolYears.find((s) => s.id === formData.schoolYearId);
      if (sy?.terms) {
        setTerms(sy.terms);
      } else {
        fetch(`/api/school-years/${formData.schoolYearId}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.terms) setTerms(data.terms);
          })
          .catch(() => setTerms([]));
      }
    } else {
      setTerms([]);
    }
  }, [formData.schoolYearId, schoolYears]);

  useEffect(() => {
    if (formData.classId) {
      fetch(`/api/classes/${formData.classId}`)
        .then((r) => r.json())
        .then((data) => {
          setClassSubjects(data.subjects || []);
        })
        .catch(() => setClassSubjects([]));
    } else {
      setClassSubjects([]);
    }
    setFormData((prev) => ({ ...prev, subjectId: "" }));
  }, [formData.classId]);

  useEffect(() => {
    if (formData.classId && formData.subjectId) {
      setLoadingCoefficient(true);
      fetch(
        `/api/classes/${formData.classId}?includeSubjects=true`
      )
        .then((r) => r.json())
        .then((data) => {
          const cs = (data.subjects || []).find(
            (s: { subjectId: string }) => s.subjectId === formData.subjectId
          );
          if (cs) {
            setFormData((prev) => ({
              ...prev,
              coefficient: String(cs.coefficient ?? 1),
            }));
          }
        })
        .catch(() => {})
        .finally(() => setLoadingCoefficient(false));
    }
  }, [formData.classId, formData.subjectId]);

  useEffect(() => {
    if (grade) {
      const evalDate = grade.evaluationDate
        ? new Date(grade.evaluationDate).toISOString().split("T")[0]
        : "";
      setFormData({
        studentId: grade.studentId || "",
        subjectId: grade.subjectId || "",
        classId: grade.classId || "",
        termId: grade.termId || "",
        schoolYearId: grade.schoolYearId || "",
        evaluationType: grade.evaluationType || "HOMEWORK",
        score: String(grade.score ?? ""),
        maxScore: String(grade.maxScore ?? 20),
        coefficient: String(grade.coefficient ?? 1),
        evaluationName: grade.evaluationName || "",
        evaluationDate: evalDate,
        comment: grade.comment || "",
      });
      if (grade.student) {
        setStudentSearch(`${grade.student.firstName} ${grade.student.lastName}`);
      }
    } else {
      setFormData({
        studentId: "",
        subjectId: "",
        classId: "",
        termId: "",
        schoolYearId: "",
        evaluationType: "HOMEWORK",
        score: "",
        maxScore: "20",
        coefficient: "1",
        evaluationName: "",
        evaluationDate: new Date().toISOString().split("T")[0],
        comment: "",
      });
      setStudentSearch("");
    }
    setErrors({});
    setSubmitError("");
  }, [grade, isOpen]);

  const filteredStudents = students.filter((s) => {
    const query = studentSearch.toLowerCase();
    return (
      s.firstName.toLowerCase().includes(query) ||
      s.lastName.toLowerCase().includes(query) ||
      s.matricule.toLowerCase().includes(query)
    );
  });

  const selectedStudent = students.find((s) => s.id === formData.studentId);

  const calculatedAverage =
    formData.score && formData.maxScore
      ? (
          (Number(formData.score) / Number(formData.maxScore)) *
          20
        ).toFixed(2)
      : "—";

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!formData.studentId) newErrors.studentId = "L'élève est requis";
    if (!formData.subjectId) newErrors.subjectId = "La matière est requise";
    if (!formData.classId) newErrors.classId = "La classe est requise";
    if (!formData.termId) newErrors.termId = "Le trimestre est requis";
    if (!formData.schoolYearId)
      newErrors.schoolYearId = "L'année scolaire est requise";
    if (!formData.score && formData.score !== "0")
      newErrors.score = "La note est requise";
    if (
      formData.score &&
      (isNaN(Number(formData.score)) || Number(formData.score) < 0)
    ) {
      newErrors.score = "La note doit être un nombre positif";
    }
    if (
      formData.maxScore &&
      (isNaN(Number(formData.maxScore)) || Number(formData.maxScore) <= 0)
    ) {
      newErrors.maxScore = "La note maximale doit être positive";
    }
    if (
      formData.score &&
      formData.maxScore &&
      Number(formData.score) > Number(formData.maxScore)
    ) {
      newErrors.score = "La note ne peut pas dépasser la note maximale";
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
      const url = isEditing ? `/api/notes/${grade.id}` : "/api/notes";
      const method = isEditing ? "PUT" : "POST";

      const body: Record<string, unknown> = {
        studentId: formData.studentId,
        subjectId: formData.subjectId,
        classId: formData.classId,
        termId: formData.termId,
        schoolYearId: formData.schoolYearId,
        evaluationType: formData.evaluationType,
        score: Number(formData.score),
        maxScore: Number(formData.maxScore) || 20,
        coefficient: Number(formData.coefficient) || 1,
        evaluationName: formData.evaluationName.trim() || null,
        evaluationDate: formData.evaluationDate || undefined,
        comment: formData.comment.trim() || null,
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
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? "Modifier la note" : "Nouvelle Note"}
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

          {loadingDropdowns ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
              <span className="ml-2 text-sm text-gray-500">
                Chargement des données...
              </span>
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
                    placeholder={
                      selectedStudent
                        ? `${selectedStudent.firstName} ${selectedStudent.lastName} (${selectedStudent.matricule})`
                        : "Rechercher un élève..."
                    }
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Classe *
                  </label>
                  <select
                    name="classId"
                    value={formData.classId}
                    onChange={handleChange}
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
                    Trimestre *
                  </label>
                  <select
                    name="termId"
                    value={formData.termId}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.termId ? "border-red-300" : "border-gray-300"
                    }`}
                  >
                    <option value="">Sélectionner...</option>
                    {terms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.name}
                      </option>
                    ))}
                  </select>
                  {errors.termId && (
                    <p className="text-xs text-red-500 mt-1">{errors.termId}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Matière *
                  </label>
                  <select
                    name="subjectId"
                    value={formData.subjectId}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.subjectId ? "border-red-300" : "border-gray-300"
                    }`}
                  >
                    <option value="">Sélectionner...</option>
                    {(formData.classId ? classSubjects : subjects).map((cs) => {
                      let subj: Subject | null = null;
                      if (formData.classId) {
                        const csAny = cs as any;
                        subj = csAny.subject || subjects.find((s: Subject) => s.id === csAny.subjectId) || null;
                      } else {
                        subj = cs as Subject;
                      }
                      if (!subj) return null;
                      return (
                        <option key={subj.id} value={subj.id}>
                          {subj.name} ({subj.code})
                        </option>
                      );
                    })}
                  </select>
                  {errors.subjectId && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.subjectId}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type d&apos;évaluation *
                  </label>
                  <select
                    name="evaluationType"
                    value={formData.evaluationType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(evaluationTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Note *
                  </label>
                  <input
                    type="number"
                    name="score"
                    value={formData.score}
                    onChange={handleChange}
                    min="0"
                    step="0.5"
                    placeholder="0"
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.score ? "border-red-300" : "border-gray-300"
                    }`}
                  />
                  {errors.score && (
                    <p className="text-xs text-red-500 mt-1">{errors.score}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Note Max
                  </label>
                  <input
                    type="number"
                    name="maxScore"
                    value={formData.maxScore}
                    onChange={handleChange}
                    min="1"
                    step="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.maxScore && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.maxScore}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coefficient
                    {loadingCoefficient && (
                      <Loader2 className="inline w-3 h-3 ml-1 animate-spin" />
                    )}
                  </label>
                  <input
                    type="number"
                    name="coefficient"
                    value={formData.coefficient}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Moyenne (/20)
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700">
                    <Calculator className="w-4 h-4 text-indigo-500" />
                    <span className="font-medium">{calculatedAverage}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de l&apos;évaluation
                  </label>
                  <input
                    type="text"
                    name="evaluationName"
                    value={formData.evaluationName}
                    onChange={handleChange}
                    placeholder="Ex: Devoir de maths"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de l&apos;évaluation
                  </label>
                  <input
                    type="date"
                    name="evaluationDate"
                    value={formData.evaluationDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commentaire
                </label>
                <textarea
                  name="comment"
                  value={formData.comment}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Observations optionnelles..."
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
              {isEditing ? "Enregistrer" : "Créer la note"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
