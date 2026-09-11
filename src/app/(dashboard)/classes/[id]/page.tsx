"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  BookOpen,
  Users,
  User,
  GraduationCap,
  BarChart3,
  Loader2,
  AlertCircle,
  Search,
  Trash2,
  Plus,
  X,
  Clock,
  Award,
  UserPlus,
} from "lucide-react";
import type {
  Class,
  SchoolYear,
  Student,
  Subject,
  Grade,
  Teacher,
  Enrollment,
} from "@/types";

interface ClassDetail extends Omit<Class, "subjects" | "enrollments" | "teacherClasses"> {
  schoolYear?: SchoolYear;
  enrollments?: (Enrollment & { student: Student })[];
  subjects?: { id: string; classId: string; subjectId: string; coefficient: number; subject?: Subject; createdAt: string }[];
  teachers?: (Teacher & { phone?: string | null; email?: string | null })[];
  enrollmentCount?: number;
  gradesCount?: number;
}

type TabKey = "eleves" | "matieres" | "notes" | "emploi" | "stats";

const enrollmentStatusLabels: Record<string, string> = {
  PENDING: "En attente",
  VALIDATED: "Validée",
  CANCELLED: "Annulée",
  COMPLETED: "Terminée",
};

const enrollmentStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  VALIDATED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  COMPLETED: "bg-blue-100 text-blue-700",
};

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: session } = useSession();

  const [classe, setClasse] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<TabKey>("eleves");

  // Students tab
  const [studentSearch, setStudentSearch] = useState("");
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [removingStudentId, setRemovingStudentId] = useState<string | null>(null);

  // Teacher assignment
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [assigningTeacher, setAssigningTeacher] = useState(false);
  const [removingTeacherId, setRemovingTeacherId] = useState<string | null>(null);

  // Grades tab
  const [grades, setGrades] = useState<
    (Grade & { student?: { firstName: string; lastName: string }; subject?: { name: string } })[]
  >([]);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [gradeSubjectFilter, setGradeSubjectFilter] = useState("");

  const fetchClass = useCallback(async () => {
    try {
      const res = await fetch(`/api/classes/${id}`);
      if (!res.ok) throw new Error("Classe non trouvée");
      const data = await res.json();
      setClasse(data);
    } catch {
      setError("Erreur lors du chargement des données de la classe");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClass();
  }, [fetchClass]);

  const fetchGrades = useCallback(async () => {
    if (!classe) return;
    setGradesLoading(true);
    try {
      const params = new URLSearchParams({ classId: id, limit: "50" });
      if (gradeSubjectFilter) params.set("subjectId", gradeSubjectFilter);
      const res = await fetch(`/api/notes?${params.toString()}`);
      const data = await res.json();
      setGrades(data.data || []);
    } catch {
      setGrades([]);
    } finally {
      setGradesLoading(false);
    }
  }, [id, gradeSubjectFilter, classe]);

  useEffect(() => {
    if (activeTab === "notes") {
      fetchGrades();
    }
  }, [activeTab, fetchGrades]);

  const fetchAllStudents = useCallback(async () => {
    try {
      const res = await fetch("/api/eleves?limit=500");
      const data = await res.json();
      setAllStudents(data.data || []);
    } catch {
      setAllStudents([]);
    }
  }, []);

  useEffect(() => {
    if (showEnrollModal) {
      fetchAllStudents();
    }
  }, [showEnrollModal, fetchAllStudents]);

  const fetchAllTeachers = useCallback(async () => {
    try {
      const res = await fetch("/api/enseignants?limit=500");
      const data = await res.json();
      setAllTeachers(data.data || []);
    } catch {
      setAllTeachers([]);
    }
  }, []);

  useEffect(() => {
    if (showTeacherModal) {
      fetchAllTeachers();
    }
  }, [showTeacherModal, fetchAllTeachers]);

  async function handleAssignTeacher() {
    if (!selectedTeacherId) return;
    setAssigningTeacher(true);
    try {
      const res = await fetch("/api/teacher-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId: selectedTeacherId, classId: id }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erreur lors de l'assignation");
        return;
      }
      setShowTeacherModal(false);
      setSelectedTeacherId("");
      fetchClass();
    } finally {
      setAssigningTeacher(false);
    }
  }

  async function handleRemoveTeacher(teacherId: string) {
    if (!confirm("Êtes-vous sûr de vouloir retirer cet enseignant de la classe ?")) return;
    setRemovingTeacherId(teacherId);
    try {
      const res = await fetch(
        `/api/teacher-classes?teacherId=${teacherId}&classId=${id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erreur lors du retrait");
        return;
      }
      fetchClass();
    } finally {
      setRemovingTeacherId(null);
    }
  }

  async function handleEnroll() {
    if (!selectedStudentId) return;
    setEnrolling(true);
    try {
      const res = await fetch(`/api/classes/${id}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: selectedStudentId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erreur lors de l'inscription");
        return;
      }
      setShowEnrollModal(false);
      setSelectedStudentId("");
      fetchClass();
    } finally {
      setEnrolling(false);
    }
  }

  async function handleRemoveStudent(studentId: string) {
    if (!confirm("Êtes-vous sûr de vouloir retirer cet élève de la classe ?")) return;
    setRemovingStudentId(studentId);
    try {
      const res = await fetch(`/api/classes/${id}/students?studentId=${studentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erreur lors du retrait");
        return;
      }
      fetchClass();
    } finally {
      setRemovingStudentId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        <span className="ml-2 text-sm text-gray-500">Chargement...</span>
      </div>
    );
  }

  if (error || !classe) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <AlertCircle className="w-12 h-12 mb-3 text-red-400" />
        <p className="text-sm font-medium">{error || "Classe non trouvée"}</p>
        <button
          onClick={() => router.push("/classes")}
          className="mt-4 text-sm text-indigo-600 hover:underline"
        >
          Retour à la liste
        </button>
      </div>
    );
  }

  const enrolledStudents = classe.enrollments || [];
  const enrolledCount = enrolledStudents.length;
  const capacityPct = classe.capacity
    ? Math.min(100, Math.round((enrolledCount / classe.capacity) * 100))
    : 0;

  const filteredStudents = enrolledStudents.filter((enr) => {
    if (!studentSearch) return true;
    const q = studentSearch.toLowerCase();
    const s = enr.student;
    return (
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      s.matricule.toLowerCase().includes(q)
    );
  });

  const availableStudents = allStudents.filter((s) => {
    return !enrolledStudents.some((e) => e.studentId === s.id);
  });

  const filteredAvailable = availableStudents.filter((s) => {
    if (!selectedStudentId) return true;
    return true;
  });

  const subjectAverages = (() => {
    if (!classe.subjects || grades.length === 0) return [];
    const map: Record<string, { name: string; totalScore: number; totalMax: number; count: number }> = {};
    for (const g of grades) {
      const subName = g.subject?.name || "Inconnu";
      if (!map[g.subjectId]) {
        map[g.subjectId] = { name: subName, totalScore: 0, totalMax: 0, count: 0 };
      }
      map[g.subjectId].totalScore += g.score;
      map[g.subjectId].totalMax += g.maxScore;
      map[g.subjectId].count += 1;
    }
    return Object.values(map).map((m) => ({
      name: m.name,
      average: m.totalMax > 0 ? Math.round((m.totalScore / m.totalMax) * 20 * 100) / 100 : 0,
      count: m.count,
    }));
  })();

  const overallAvg =
    subjectAverages.length > 0
      ? Math.round(
          (subjectAverages.reduce((s, a) => s + a.average, 0) / subjectAverages.length) * 100
        ) / 100
      : 0;

  const passCount = grades.filter((g) => g.score >= g.maxScore * 0.5).length;
  const passRate = grades.length > 0 ? Math.round((passCount / grades.length) * 100) : 0;

  const studentAverages = (() => {
    const map: Record<string, { name: string; totalScore: number; totalMax: number; count: number }> = {};
    for (const g of grades) {
      const key = g.studentId;
      const name = g.student ? `${g.student.firstName} ${g.student.lastName}` : "Inconnu";
      if (!map[key]) {
        map[key] = { name, totalScore: 0, totalMax: 0, count: 0 };
      }
      map[key].totalScore += g.score;
      map[key].totalMax += g.maxScore;
      map[key].count += 1;
    }
    return Object.values(map)
      .map((m) => ({
        name: m.name,
        average: m.totalMax > 0 ? Math.round((m.totalScore / m.totalMax) * 20 * 100) / 100 : 0,
      }))
      .sort((a, b) => b.average - a.average);
  })();

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "eleves", label: "Élèves", icon: <Users className="w-4 h-4" />, count: enrolledCount },
    { key: "matieres", label: "Matières", icon: <BookOpen className="w-4 h-4" />, count: classe.subjects?.length },
    { key: "notes", label: "Notes", icon: <Award className="w-4 h-4" />, count: grades.length },
    { key: "emploi", label: "Emploi du temps", icon: <Clock className="w-4 h-4" /> },
    { key: "stats", label: "Statistiques", icon: <BarChart3 className="w-4 h-4" /> },
  ];

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("fr-FR");
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.push("/classes")}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors mt-1"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-7 h-7 text-indigo-600" />
                {classe.name}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {classe.level}
                {classe.section ? ` - Section ${classe.section}` : ""}
                {classe.schoolYear ? ` | ${classe.schoolYear.name}` : ""}
              </p>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">Capacité</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {enrolledCount}/{classe.capacity}
              </p>
              <div className="mt-2">
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      capacityPct >= 90
                        ? "bg-red-500"
                        : capacityPct >= 70
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${capacityPct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{capacityPct}% rempli</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500 uppercase">Enseignant(s)</p>
                {(session?.user?.role === "ADMIN" || session?.user?.role === "SECRETARY") && (
                  <button
                    onClick={() => setShowTeacherModal(true)}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Assigner
                  </button>
                )}
              </div>
              <div className="mt-2 space-y-1">
                {classe.teachers && classe.teachers.length > 0 ? (
                  classe.teachers.map((t) => (
                    <div key={t.id} className="flex items-center justify-between group">
                      <p className="text-sm font-medium text-gray-900">
                        {t.firstName} {t.lastName}
                      </p>
                      {(session?.user?.role === "ADMIN" || session?.user?.role === "SECRETARY") && (
                        <button
                          onClick={() => handleRemoveTeacher(t.id)}
                          disabled={removingTeacherId === t.id}
                          className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                          title="Retirer l'enseignant"
                        >
                          {removingTeacherId === t.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 italic mt-1">Non assigné</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">Matières</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {classe.subjects?.length || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">assignées</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">Notes</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{classe.gradesCount || grades.length}</p>
              <p className="text-xs text-gray-500 mt-1">enregistrées</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-100 overflow-x-auto">
          <div className="flex min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? "text-indigo-600 border-indigo-600"
                    : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.key
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {/* Tab: Élèves */}
          {activeTab === "eleves" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher un élève..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  onClick={() => setShowEnrollModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un élève
                </button>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Users className="w-12 h-12 mb-3" />
                  <p className="text-sm font-medium">
                    {studentSearch
                      ? "Aucun élève ne correspond à votre recherche"
                      : "Aucun élève inscrit dans cette classe"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/50">
                        <th className="px-4 py-3 font-medium">Matricule</th>
                        <th className="px-4 py-3 font-medium">Nom</th>
                        <th className="px-4 py-3 font-medium">Prénom</th>
                        <th className="px-4 py-3 font-medium hidden sm:table-cell">Sexe</th>
                        <th className="px-4 py-3 font-medium hidden md:table-cell">Date Naissance</th>
                        <th className="px-4 py-3 font-medium hidden lg:table-cell">Téléphone</th>
                        <th className="px-4 py-3 font-medium hidden lg:table-cell">Parent</th>
                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((enr) => {
                        const s = enr.student;
                        return (
                          <tr
                            key={enr.id}
                            className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                {s.matricule}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900">{s.lastName}</td>
                            <td className="px-4 py-3 text-gray-700">{s.firstName}</td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                  s.gender === "MALE"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-pink-100 text-pink-700"
                                }`}
                              >
                                {s.gender === "MALE" ? "M" : "F"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                              {formatDate(s.dateOfBirth)}
                            </td>
                            <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                              {s.phone || "—"}
                            </td>
                            <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                              {s.parentName || "—"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => router.push(`/eleves/${s.id}`)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                  title="Voir fiche élève"
                                >
                                  <GraduationCap className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRemoveStudent(s.id)}
                                  disabled={removingStudentId === s.id}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                  title="Retirer de la classe"
                                >
                                  {removingStudentId === s.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab: Matières */}
          {activeTab === "matieres" && (
            <div>
              {(!classe.subjects || classe.subjects.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <BookOpen className="w-12 h-12 mb-3" />
                  <p className="text-sm font-medium">Aucune matière assignée</p>
                  <p className="text-xs mt-1">Les matières sont gérées par l&apos;administrateur</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/50">
                        <th className="px-4 py-3 font-medium">Matière</th>
                        <th className="px-4 py-3 font-medium">Code</th>
                        <th className="px-4 py-3 font-medium">Coefficient</th>
                        <th className="px-4 py-3 font-medium hidden sm:table-cell">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classe.subjects.map((cs) => (
                        <tr
                          key={cs.id}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {cs.subject?.name || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                              {cs.subject?.code || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                              {cs.coefficient}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                            {cs.subject?.description || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab: Notes */}
          {activeTab === "notes" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="relative max-w-xs">
                  <select
                    value={gradeSubjectFilter}
                    onChange={(e) => setGradeSubjectFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Toutes les matières</option>
                    {classe.subjects?.map((cs) => (
                      <option key={cs.subjectId} value={cs.subjectId}>
                        {cs.subject?.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {gradesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                </div>
              ) : grades.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Award className="w-12 h-12 mb-3" />
                  <p className="text-sm font-medium">Aucune note enregistrée</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/50">
                        <th className="px-4 py-3 font-medium">Élève</th>
                        <th className="px-4 py-3 font-medium">Matière</th>
                        <th className="px-4 py-3 font-medium">Note</th>
                        <th className="px-4 py-3 font-medium">Coeff.</th>
                        <th className="px-4 py-3 font-medium hidden sm:table-cell">Type</th>
                        <th className="px-4 py-3 font-medium hidden sm:table-cell">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grades.map((g) => (
                        <tr
                          key={g.id}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {g.student ? `${g.student.firstName} ${g.student.lastName}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-700">{g.subject?.name || "—"}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`font-semibold ${
                                g.score >= g.maxScore * 0.5 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {g.score}/{g.maxScore}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{g.coefficient}</td>
                          <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                            {g.evaluationType}
                          </td>
                          <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                            {formatDate(g.evaluationDate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab: Emploi du temps */}
          {activeTab === "emploi" && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Clock className="w-12 h-12 mb-3" />
              <p className="text-sm font-medium">Emploi du temps</p>
              <p className="text-xs mt-1">Fonctionnalité à venir</p>
            </div>
          )}

          {/* Tab: Statistiques */}
          {activeTab === "stats" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase">Moyenne générale</p>
                  <p className={`text-2xl font-bold mt-1 ${overallAvg >= 10 ? "text-green-600" : overallAvg >= 8 ? "text-amber-600" : "text-red-600"}`}>
                    {overallAvg > 0 ? `${overallAvg}/20` : "—"}
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase">Taux de réussite</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {passRate > 0 ? `${passRate}%` : "—"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {passCount}/{grades.length} notes ≥ 10/20
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase">Total notes</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{grades.length}</p>
                </div>
              </div>

              {/* Subject averages */}
              {subjectAverages.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-500" />
                    Moyenne par matière
                  </h3>
                  <div className="space-y-3">
                    {subjectAverages.map((sa, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-700">{sa.name}</span>
                          <span className={`font-medium ${sa.average >= 10 ? "text-green-600" : sa.average >= 8 ? "text-amber-600" : "text-red-600"}`}>
                            {sa.average}/20
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              sa.average >= 10
                                ? "bg-emerald-500"
                                : sa.average >= 8
                                ? "bg-amber-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${Math.min(100, (sa.average / 20) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top students */}
              {studentAverages.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-500" />
                    Classement des élèves
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b border-gray-100">
                          <th className="pb-2 font-medium">#</th>
                          <th className="pb-2 font-medium">Élève</th>
                          <th className="pb-2 font-medium text-right">Moyenne</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentAverages.map((sa, i) => (
                          <tr
                            key={i}
                            className="border-b border-gray-50 last:border-0"
                          >
                            <td className="py-2.5 text-gray-500">{i + 1}</td>
                            <td className="py-2.5 font-medium text-gray-900">{sa.name}</td>
                            <td className="py-2.5 text-right">
                              <span
                                className={`font-semibold ${
                                  sa.average >= 10
                                    ? "text-green-600"
                                    : sa.average >= 8
                                    ? "text-amber-600"
                                    : "text-red-600"
                                }`}
                              >
                                {sa.average}/20
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {subjectAverages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <BarChart3 className="w-12 h-12 mb-3" />
                  <p className="text-sm font-medium">Pas assez de données pour les statistiques</p>
                  <p className="text-xs mt-1">Les statistiques apparaîtront quand des notes seront enregistrées</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Enroll student modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowEnrollModal(false);
              setSelectedStudentId("");
            }}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Ajouter un élève à {classe.name}
              </h2>
              <button
                onClick={() => {
                  setShowEnrollModal(false);
                  setSelectedStudentId("");
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {availableStudents.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <p className="text-sm">Tous les élèves sont déjà inscrits</p>
                </div>
              ) : (
                <>
                  <div className="text-sm text-gray-500">
                    {availableStudents.length} élève{availableStudents.length > 1 ? "s" : ""} disponible{availableStudents.length > 1 ? "s" : ""}
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {availableStudents.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedStudentId(s.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                          selectedStudentId === s.id
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {s.firstName} {s.lastName}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">{s.matricule}</p>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              s.gender === "MALE"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-pink-100 text-pink-700"
                            }`}
                          >
                            {s.gender === "MALE" ? "M" : "F"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowEnrollModal(false);
                  setSelectedStudentId("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleEnroll}
                disabled={!selectedStudentId || enrolling}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {enrolling && <Loader2 className="w-4 h-4 animate-spin" />}
                Inscrire l&apos;élève
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign teacher modal */}
      {showTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowTeacherModal(false);
              setSelectedTeacherId("");
            }}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                Assigner un enseignant
              </h2>
              <button
                onClick={() => {
                  setShowTeacherModal(false);
                  setSelectedTeacherId("");
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {allTeachers.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <p className="text-sm">Aucun enseignant disponible</p>
                </div>
              ) : (
                <>
                  <div className="text-sm text-gray-500">
                    {allTeachers.length} enseignant{allTeachers.length > 1 ? "s" : ""} disponible{allTeachers.length > 1 ? "s" : ""}
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {allTeachers.map((t) => {
                      const isAssigned = classe.teachers?.some((et) => et.id === t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => !isAssigned && setSelectedTeacherId(t.id)}
                          disabled={isAssigned}
                          className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                            isAssigned
                              ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                              : selectedTeacherId === t.id
                              ? "border-indigo-500 bg-indigo-50"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {t.firstName} {t.lastName}
                              </p>
                              <p className="text-xs text-gray-500">{t.email || t.employeeId}</p>
                            </div>
                            {isAssigned && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                                Assigné
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowTeacherModal(false);
                  setSelectedTeacherId("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAssignTeacher}
                disabled={!selectedTeacherId || assigningTeacher}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {assigningTeacher && <Loader2 className="w-4 h-4 animate-spin" />}
                Assigner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
