"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ClipboardList,
  Filter,
  Trophy,
  BookOpen,
} from "lucide-react";
import GradeModal from "@/components/modals/grade-modal";
import type {
  Grade,
  Class,
  Subject,
  Term,
  SchoolYear,
  PaginatedResponse,
} from "@/types";

type GradeRow = Grade & {
  student?: { id: string; firstName: string; lastName: string; matricule: string };
  subject?: { id: string; name: string; code: string; coefficient: number };
  class?: { id: string; name: string };
  term?: Term;
};

const ITEMS_PER_PAGE = 10;

const evaluationTypeLabels: Record<string, string> = {
  HOMEWORK: "Devoir",
  QUIZ: "Contrôle",
  EXAM: "Examen",
  PARTICIPATION: "Participation",
  PROJECT: "Projet",
};

function getGradeColor(score: number, maxScore: number) {
  const pct = (score / maxScore) * 100;
  if (pct >= 80) return "text-emerald-600 bg-emerald-50";
  if (pct >= 60) return "text-blue-600 bg-blue-50";
  if (pct >= 40) return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
}

export default function NotesPage() {
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: ITEMS_PER_PAGE,
    totalPages: 0,
  });

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [termFilter, setTermFilter] = useState("");
  const [evaluationTypeFilter, setEvaluationTypeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [subjectAverages, setSubjectAverages] = useState<
    { subjectName: string; average: number; count: number }[]
  >([]);
  const [classRanking, setClassRanking] = useState<
    { studentName: string; average: number; rank: number }[]
  >([]);

  const fetchGrades = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(ITEMS_PER_PAGE),
      });
      if (search) params.set("search", search);
      if (classFilter) params.set("classId", classFilter);
      if (subjectFilter) params.set("subjectId", subjectFilter);
      if (termFilter) params.set("termId", termFilter);

      const res = await fetch(`/api/notes?${params.toString()}`);
      const data = (await res.json()) as PaginatedResponse<GradeRow>;
      setGrades(data.data || []);
      setPagination(data.pagination);

      if (data.data && data.data.length > 0) {
        computeSubjectAverages(data.data);
        computeClassRanking(data.data);
      } else {
        setSubjectAverages([]);
        setClassRanking([]);
      }
    } catch {
      setGrades([]);
      setSubjectAverages([]);
      setClassRanking([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, classFilter, subjectFilter, termFilter]);

  function computeSubjectAverages(gradeList: GradeRow[]) {
    const map = new Map<
      string,
      { subjectName: string; totalScore: number; totalMax: number; count: number }
    >();
    for (const g of gradeList) {
      if (!g.subject) continue;
      const existing = map.get(g.subjectId);
      if (existing) {
        existing.totalScore += g.score;
        existing.totalMax += g.maxScore;
        existing.count += 1;
      } else {
        map.set(g.subjectId, {
          subjectName: g.subject.name,
          totalScore: g.score,
          totalMax: g.maxScore,
          count: 1,
        });
      }
    }
    const avgs = Array.from(map.values()).map((d) => ({
      subjectName: d.subjectName,
      average: d.totalMax > 0 ? Math.round((d.totalScore / d.totalMax) * 2000) / 100 : 0,
      count: d.count,
    }));
    setSubjectAverages(avgs);
  }

  function computeClassRanking(gradeList: GradeRow[]) {
    const studentMap = new Map<
      string,
      { studentName: string; totalScore: number; totalCoeff: number }
    >();
    for (const g of gradeList) {
      if (!g.student) continue;
      const existing = studentMap.get(g.studentId);
      if (existing) {
        existing.totalScore += g.score * g.coefficient;
        existing.totalCoeff += g.coefficient;
      } else {
        studentMap.set(g.studentId, {
          studentName: `${g.student.firstName} ${g.student.lastName}`,
          totalScore: g.score * g.coefficient,
          totalCoeff: g.coefficient,
        });
      }
    }
    const ranked = Array.from(studentMap.values())
      .map((d) => ({
        studentName: d.studentName,
        average: d.totalCoeff > 0 ? Math.round((d.totalScore / d.totalCoeff) * 100) / 100 : 0,
        rank: 0,
      }))
      .sort((a, b) => b.average - a.average)
      .map((d, i) => ({ ...d, rank: i + 1 }));
    setClassRanking(ranked.slice(0, 10));
  }

  const fetchFilters = useCallback(async () => {
    try {
      const [classesRes, subjectsRes, yearsRes] = await Promise.all([
        fetch("/api/classes?limit=500"),
        fetch("/api/matieres?limit=500"),
        fetch("/api/school-years"),
      ]);
      const classesData = await classesRes.json();
      const subjectsData = await subjectsRes.json();
      const yearsData = await yearsRes.json();
      setClasses(classesData.data || []);
      setSubjects(subjectsData.data || []);
      const allTerms: Term[] = [];
      for (const sy of yearsData.data || []) {
        if (sy.terms) allTerms.push(...sy.terms);
      }
      setTerms(allTerms);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, classFilter, subjectFilter, termFilter, evaluationTypeFilter]);

  function handleEdit(grade: GradeRow) {
    setEditingGrade(grade);
    setModalOpen(true);
  }

  function handleCreate() {
    setEditingGrade(null);
    setModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette note ?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/notes/${id}`, { method: "DELETE" });
      fetchGrades();
    } finally {
      setDeletingId(null);
    }
  }

  const filteredGrades =
    evaluationTypeFilter && grades.length > 0
      ? grades.filter((g) => g.evaluationType === evaluationTypeFilter)
      : grades;

  const totalPages = pagination.totalPages;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-indigo-600" />
            Gestion des Notes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {pagination.total} note{pagination.total !== 1 ? "s" : ""} au total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/notes/bulletin"
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Bulletin
          </a>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouvelle Note
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher par nom d'élève..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="">Toutes les classes</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <select
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    className="pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="">Toutes les matières</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <select
                    value={termFilter}
                    onChange={(e) => setTermFilter(e.target.value)}
                    className="pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="">Tous les trimestres</option>
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <select
                    value={evaluationTypeFilter}
                    onChange={(e) => setEvaluationTypeFilter(e.target.value)}
                    className="pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="">Tous les types</option>
                    {Object.entries(evaluationTypeLabels).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                <span className="ml-2 text-sm text-gray-500">
                  Chargement...
                </span>
              </div>
            ) : filteredGrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <ClipboardList className="w-12 h-12 mb-3" />
                <p className="text-sm font-medium">Aucune note trouvée</p>
                <p className="text-xs mt-1">
                  {search ||
                  classFilter ||
                  subjectFilter ||
                  termFilter ||
                  evaluationTypeFilter
                    ? "Essayez de modifier vos filtres"
                    : "Commencez par ajouter une note"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/50">
                      <th className="px-4 py-3 font-medium">Élève</th>
                      <th className="px-4 py-3 font-medium">Matière</th>
                      <th className="px-4 py-3 font-medium hidden sm:table-cell">
                        Type
                      </th>
                      <th className="px-4 py-3 font-medium text-center">
                        Note
                      </th>
                      <th className="px-4 py-3 font-medium hidden md:table-cell text-center">
                        Note Max
                      </th>
                      <th className="px-4 py-3 font-medium hidden md:table-cell text-center">
                        Coeff.
                      </th>
                      <th className="px-4 py-3 font-medium hidden lg:table-cell text-center">
                        Moyenne
                      </th>
                      <th className="px-4 py-3 font-medium hidden xl:table-cell">
                        Commentaire
                      </th>
                      <th className="px-4 py-3 font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGrades.map((grade) => {
                      const avg = grade.maxScore > 0
                        ? ((grade.score / grade.maxScore) * 20).toFixed(1)
                        : "—";
                      return (
                        <tr
                          key={grade.id}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">
                              {grade.student
                                ? `${grade.student.firstName} ${grade.student.lastName}`
                                : "—"}
                            </div>
                            <div className="text-xs text-gray-400 font-mono">
                              {grade.student?.matricule}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-gray-700">
                              {grade.subject?.name || "—"}
                            </div>
                            <div className="text-xs text-gray-400">
                              {grade.subject?.code}
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              {evaluationTypeLabels[grade.evaluationType] ||
                                grade.evaluationType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-lg text-sm font-semibold ${getGradeColor(
                                grade.score,
                                grade.maxScore
                              )}`}
                            >
                              {grade.score}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-500 hidden md:table-cell">
                            {grade.maxScore}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-500 hidden md:table-cell">
                            {grade.coefficient}
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-gray-700 hidden lg:table-cell">
                            {avg}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate hidden xl:table-cell">
                            {grade.comment || "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleEdit(grade)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                title="Modifier"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(grade.id)}
                                disabled={deletingId === grade.id}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                title="Supprimer"
                              >
                                {deletingId === grade.id ? (
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

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Page {pagination.page} sur {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                          currentPage === pageNum
                            ? "bg-indigo-600 text-white"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {subjectAverages.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                Moyennes par matière
              </h3>
              <div className="space-y-2">
                {subjectAverages.map((sa) => (
                  <div
                    key={sa.subjectName}
                    className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-xs text-gray-600 truncate">
                      {sa.subjectName}
                    </span>
                    <span
                      className={`text-sm font-semibold px-2 py-0.5 rounded ${
                        sa.average >= 14
                          ? "text-emerald-600 bg-emerald-50"
                          : sa.average >= 10
                          ? "text-amber-600 bg-amber-50"
                          : "text-red-600 bg-red-50"
                      }`}
                    >
                      {sa.average.toFixed(1)}/20
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {classRanking.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Classement de la classe
              </h3>
              <div className="space-y-1.5">
                {classRanking.map((cr) => (
                  <div
                    key={cr.studentName}
                    className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          cr.rank === 1
                            ? "bg-amber-100 text-amber-700"
                            : cr.rank === 2
                            ? "bg-gray-200 text-gray-600"
                            : cr.rank === 3
                            ? "bg-orange-100 text-orange-600"
                            : "bg-gray-50 text-gray-500"
                        }`}
                      >
                        {cr.rank}
                      </span>
                      <span className="text-xs text-gray-700 truncate max-w-[120px]">
                        {cr.studentName}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-gray-600">
                      {cr.average.toFixed(1)}/20
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {subjectAverages.length === 0 &&
            classRanking.length === 0 &&
            !loading && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
                <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">
                  Les statistiques apparaîtront ici une fois les notes ajoutées
                </p>
              </div>
            )}
        </div>
      </div>

      <GradeModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingGrade(null);
        }}
        grade={editingGrade}
        onSuccess={fetchGrades}
      />
    </div>
  );
}
