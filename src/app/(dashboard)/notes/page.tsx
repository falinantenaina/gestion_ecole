"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Loader2,
  ClipboardList,
  Filter,
  Trophy,
  BookOpen,
  ArrowUpDown,
  ListPlus,
  X,
  Save,
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
  subject?: { id: string; name: string; code: string };
  class?: { id: string; name: string };
  term?: Term;
};

type SortField = "student" | "subject" | "className" | "evaluationType" | "score" | "coefficient" | "evaluationDate";
type SortDir = "asc" | "desc";

const ITEMS_PER_PAGE = 15;

const evaluationTypeLabels: Record<string, string> = {
  HOMEWORK: "Devoir",
  QUIZ: "Contrôle",
  EXAM: "Examen",
  PARTICIPATION: "Participation",
  PROJECT: "Projet",
};

function getGradeColor(score: number) {
  if (score >= 14) return "text-emerald-600 bg-emerald-50";
  if (score >= 10) return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
}

function getRankBadge(rank: number) {
  if (rank === 1) return "bg-amber-100 text-amber-700";
  if (rank === 2) return "bg-gray-200 text-gray-600";
  if (rank === 3) return "bg-orange-100 text-orange-600";
  return "bg-gray-50 text-gray-500";
}

export default function NotesPage() {
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: ITEMS_PER_PAGE, totalPages: 0 });

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [termFilter, setTermFilter] = useState("");
  const [evaluationTypeFilter, setEvaluationTypeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("evaluationDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);

  const [subjectAverages, setSubjectAverages] = useState<{ subjectName: string; average: number; count: number }[]>([]);
  const [classRanking, setClassRanking] = useState<{ studentName: string; average: number; rank: number }[]>([]);
  const [totalGrades, setTotalGrades] = useState(0);
  const [classAvg, setClassAvg] = useState(0);

  const [bulkMode, setBulkMode] = useState(false);
  const [bulkClassId, setBulkClassId] = useState("");
  const [bulkSubjectId, setBulkSubjectId] = useState("");
  const [bulkEvalType, setBulkEvalType] = useState("HOMEWORK");
  const [bulkEvalName, setBulkEvalName] = useState("");
  const [bulkTermId, setBulkTermId] = useState("");
  const [bulkYearId, setBulkYearId] = useState("");
  const [bulkStudents, setBulkStudents] = useState<{ id: string; firstName: string; lastName: string; scores: Record<string, string> }[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkClassSubjects, setBulkClassSubjects] = useState<{ subjectId: string; coefficient: number; subject?: Subject }[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);

  function computeStats(gradeList: GradeRow[]) {
    const subMap = new Map<string, { name: string; total: number; count: number }>();
    const studentMap = new Map<string, { name: string; weighted: number; coeff: number }>();
    let totalScore = 0;
    let totalCount = 0;

    for (const g of gradeList) {
      totalScore += g.score;
      totalCount++;

      if (g.subject) {
        const existing = subMap.get(g.subjectId);
        if (existing) { existing.total += g.score; existing.count++; }
        else subMap.set(g.subjectId, { name: g.subject.name, total: g.score, count: 1 });
      }

      if (g.student) {
        const key = g.studentId;
        const existing = studentMap.get(key);
        if (existing) { existing.weighted += g.score * g.coefficient; existing.coeff += g.coefficient; }
        else studentMap.set(key, { name: `${g.student.firstName} ${g.student.lastName}`, weighted: g.score * g.coefficient, coeff: g.coefficient });
      }
    }

    setSubjectAverages(
      Array.from(subMap.values()).map((d) => ({
        subjectName: d.name,
        average: Math.round((d.total / d.count) * 100) / 100,
        count: d.count,
      }))
    );

    const ranked = Array.from(studentMap.values())
      .map((d) => ({ studentName: d.name, average: d.coeff > 0 ? Math.round((d.weighted / d.coeff) * 100) / 100 : 0, rank: 0 }))
      .sort((a, b) => b.average - a.average)
      .map((d, i) => ({ ...d, rank: i + 1 }));

    setClassRanking(ranked.slice(0, 10));
    setClassAvg(totalCount > 0 ? Math.round((totalScore / totalCount) * 100) / 100 : 0);
  }

  const fetchGrades = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(currentPage), limit: String(ITEMS_PER_PAGE) });
      if (search) params.set("search", search);
      if (classFilter) params.set("classId", classFilter);
      if (subjectFilter) params.set("subjectId", subjectFilter);
      if (termFilter) params.set("termId", termFilter);

      const res = await fetch(`/api/notes?${params.toString()}`);
      const data = (await res.json()) as PaginatedResponse<GradeRow>;
      setGrades(data.data || []);
      setPagination(data.pagination);
      setTotalGrades(data.pagination.total);

      if (data.data && data.data.length > 0) {
        computeStats(data.data);
      } else {
        setSubjectAverages([]);
        setClassRanking([]);
        setClassAvg(0);
      }
    } catch {
      setGrades([]);
      setSubjectAverages([]);
      setClassRanking([]);
      setClassAvg(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, classFilter, subjectFilter, termFilter]);

  const fetchFilters = useCallback(async () => {
    try {
      const [classesRes, subjectsRes, yearsRes] = await Promise.all([
        fetch("/api/classes?limit=500"),
        fetch("/api/matieres?limit=500"),
        fetch("/api/school-years"),
      ]);
      setClasses((await classesRes.json()).data || []);
      setSubjects((await subjectsRes.json()).data || []);
      const yearsData = (await yearsRes.json()).data || [];
      setSchoolYears(yearsData);
      const allTerms: Term[] = [];
      for (const sy of yearsData) { if (sy.terms) allTerms.push(...sy.terms); }
      setTerms(allTerms);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchFilters(); }, [fetchFilters]);
  useEffect(() => { fetchGrades(); }, [fetchGrades]);
  useEffect(() => { setCurrentPage(1); }, [search, classFilter, subjectFilter, termFilter, evaluationTypeFilter]);

  function handleSort(field: SortField) {
    if (sortField === field) { setSortDir((d) => d === "asc" ? "desc" : "asc"); }
    else { setSortField(field); setSortDir("asc"); }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-gray-300" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-indigo-600" /> : <ChevronDown className="w-3 h-3 text-indigo-600" />;
  }

  const sortedGrades = [...grades]
    .filter((g) => !evaluationTypeFilter || g.evaluationType === evaluationTypeFilter)
    .sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "student": cmp = `${a.student?.lastName ?? ""}${a.student?.firstName ?? ""}`.localeCompare(`${b.student?.lastName ?? ""}${b.student?.firstName ?? ""}`); break;
        case "subject": cmp = (a.subject?.name ?? "").localeCompare(b.subject?.name ?? ""); break;
        case "className": cmp = (a.class?.name ?? "").localeCompare(b.class?.name ?? ""); break;
        case "evaluationType": cmp = a.evaluationType.localeCompare(b.evaluationType); break;
        case "score": cmp = a.score - b.score; break;
        case "coefficient": cmp = a.coefficient - b.coefficient; break;
        case "evaluationDate": cmp = new Date(a.evaluationDate).getTime() - new Date(b.evaluationDate).getTime(); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

  function handleEdit(grade: GradeRow) { setEditingGrade(grade); setModalOpen(true); }
  function handleCreate() { setEditingGrade(null); setModalOpen(true); }

  async function handleDelete(id: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette note ?")) return;
    setDeletingId(id);
    try { await fetch(`/api/notes/${id}`, { method: "DELETE" }); fetchGrades(); }
    finally { setDeletingId(null); }
  }

  const totalPages = pagination.totalPages;

  function openBulkMode() {
    setBulkMode(true);
    setBulkClassId("");
    setBulkSubjectId("");
    setBulkEvalType("HOMEWORK");
    setBulkEvalName("");
    setBulkTermId("");
    setBulkYearId("");
    setBulkStudents([]);
    setBulkClassSubjects([]);
  }

  useEffect(() => {
    if (bulkClassId) {
      fetch(`/api/classes/${bulkClassId}`)
        .then((r) => r.json())
        .then((data) => { setBulkClassSubjects(data.subjects || []); setBulkSubjectId(""); })
        .catch(() => { setBulkClassSubjects([]); setBulkSubjectId(""); });
    } else {
      setBulkClassSubjects([]);
      setBulkSubjectId("");
    }
  }, [bulkClassId]);

  useEffect(() => {
    if (bulkClassId && bulkTermId) {
      setBulkLoading(true);
      const params = new URLSearchParams({ classId: bulkClassId, termId: bulkTermId, limit: "500" });
      fetch(`/api/eleves?${params}`)
        .then((r) => r.json())
        .then((data) => {
          const students = (data.data || []).map((s: { id: string; firstName: string; lastName: string }) => ({ id: s.id, firstName: s.firstName, lastName: s.lastName, scores: {} as Record<string, string> }));
          setBulkStudents(students);
        })
        .catch(() => setBulkStudents([]))
        .finally(() => setBulkLoading(false));
    } else {
      setBulkStudents([]);
    }
  }, [bulkClassId, bulkTermId]);

  function updateBulkScore(studentId: string, value: string) {
    setBulkStudents((prev) => prev.map((s) => s.id === studentId ? { ...s, scores: { ...s.scores, [bulkSubjectId]: value } } : s));
  }

  async function handleBulkSubmit() {
    const cs = bulkClassSubjects.find((c) => c.subjectId === bulkSubjectId);
    if (!bulkClassId || !bulkSubjectId || !bulkTermId || !bulkYearId || !cs) return;

    setBulkSubmitting(true);
    try {
      const promises = bulkStudents
        .filter((s) => s.scores[bulkSubjectId] && s.scores[bulkSubjectId] !== "")
        .map((s) =>
          fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentId: s.id,
              subjectId: bulkSubjectId,
              classId: bulkClassId,
              termId: bulkTermId,
              schoolYearId: bulkYearId,
              evaluationType: bulkEvalType,
              score: Number(s.scores[bulkSubjectId]),
              maxScore: 20,
              coefficient: cs.coefficient,
              evaluationName: bulkEvalName.trim() || null,
            }),
          })
        );
      await Promise.all(promises);
      setBulkMode(false);
      fetchGrades();
    } catch { /* silent */ }
    finally { setBulkSubmitting(false); }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-indigo-600" />
            Gestion des Notes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalGrades} note{totalGrades !== 1 ? "s" : ""} au total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/notes/bulletin" className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
            <BookOpen className="w-4 h-4" />
            Bulletin
          </a>
          <button onClick={openBulkMode} className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
            <ListPlus className="w-4 h-4" />
            Saisie Multiple
          </button>
          <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4" />
            Nouvelle Note
          </button>
        </div>
      </div>

      {/* Bulk Add Panel */}
      {bulkMode && (
        <div className="bg-white rounded-xl shadow-sm border border-indigo-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ListPlus className="w-5 h-5 text-indigo-600" />
              Saisie Multiple des Notes
            </h2>
            <button onClick={() => setBulkMode(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Classe *</label>
              <select value={bulkClassId} onChange={(e) => setBulkClassId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Sélectionner...</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Matière *</label>
              <select value={bulkSubjectId} onChange={(e) => setBulkSubjectId(e.target.value)} disabled={!bulkClassId} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400">
                <option value="">Sélectionner...</option>
                {bulkClassSubjects.map((cs) => cs.subject ? <option key={cs.subjectId} value={cs.subjectId}>{cs.subject.name} (coeff. {cs.coefficient})</option> : null)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type d&apos;évaluation *</label>
              <select value={bulkEvalType} onChange={(e) => setBulkEvalType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {Object.entries(evaluationTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Trimestre *</label>
              <select value={bulkTermId} onChange={(e) => setBulkTermId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Sélectionner...</option>
                {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Année Scolaire *</label>
              <select value={bulkYearId} onChange={(e) => setBulkYearId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Sélectionner...</option>
                {schoolYears.map((sy) => <option key={sy.id} value={sy.id}>{sy.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom de l&apos;évaluation</label>
              <input type="text" value={bulkEvalName} onChange={(e) => setBulkEvalName(e.target.value)} placeholder="Ex: Devoir de maths" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          {bulkLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
              <span className="ml-2 text-sm text-gray-500">Chargement des élèves...</span>
            </div>
          )}

          {!bulkLoading && bulkStudents.length > 0 && (
            <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Élève</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-600 w-32">Note /20</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkStudents.map((s) => (
                    <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <span className="font-medium text-gray-900">{s.lastName} {s.firstName}</span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="number" min="0" max="20" step="0.5"
                          value={s.scores[bulkSubjectId] || ""}
                          onChange={(e) => updateBulkScore(s.id, e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="—"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!bulkLoading && bulkStudents.length === 0 && bulkClassId && bulkTermId && (
            <p className="text-sm text-gray-500 text-center py-4">Aucun élève trouvé pour cette classe et ce trimestre.</p>
          )}

          {bulkStudents.length > 0 && (
            <div className="flex justify-end mt-4">
              <button onClick={handleBulkSubmit} disabled={bulkSubmitting || !bulkSubjectId || !bulkYearId} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {bulkSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer les notes
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Table */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {/* Filters */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Rechercher par nom d'élève..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white">
                    <option value="">Toutes les classes</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white">
                  <option value="">Toutes les matières</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={termFilter} onChange={(e) => setTermFilter(e.target.value)} className="pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white">
                  <option value="">Tous les trimestres</option>
                  {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select value={evaluationTypeFilter} onChange={(e) => setEvaluationTypeFilter(e.target.value)} className="pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white">
                  <option value="">Tous les types</option>
                  {Object.entries(evaluationTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                <span className="ml-2 text-sm text-gray-500">Chargement...</span>
              </div>
            ) : sortedGrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <ClipboardList className="w-12 h-12 mb-3" />
                <p className="text-sm font-medium">Aucune note trouvée</p>
                <p className="text-xs mt-1">{search || classFilter || subjectFilter || termFilter || evaluationTypeFilter ? "Essayez de modifier vos filtres" : "Commencez par ajouter une note"}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/50">
                      {[
                        { field: "student" as SortField, label: "Élève", cls: "" },
                        { field: "subject" as SortField, label: "Matière", cls: "hidden sm:table-cell" },
                        { field: "className" as SortField, label: "Classe", cls: "hidden md:table-cell" },
                        { field: "evaluationType" as SortField, label: "Type", cls: "hidden lg:table-cell" },
                        { field: "score" as SortField, label: "Note/20", cls: "text-center" },
                        { field: "coefficient" as SortField, label: "Coeff", cls: "hidden md:table-cell text-center" },
                        { field: "evaluationDate" as SortField, label: "Date", cls: "hidden xl:table-cell" },
                      ].map(({ field, label, cls }) => (
                        <th key={field} className={`px-4 py-3 font-medium cursor-pointer select-none hover:text-indigo-600 transition-colors ${cls}`} onClick={() => handleSort(field)}>
                          <span className="flex items-center gap-1">{label}<SortIcon field={field} /></span>
                        </th>
                      ))}
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedGrades.map((grade) => {
                      const date = new Date(grade.evaluationDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
                      return (
                        <tr key={grade.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{grade.student ? `${grade.student.lastName} ${grade.student.firstName}` : "—"}</div>
                            <div className="text-xs text-gray-400 font-mono">{grade.student?.matricule}</div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <div className="text-gray-700">{grade.subject?.name || "—"}</div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-gray-600">{grade.class?.name || "—"}</span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              {evaluationTypeLabels[grade.evaluationType] || grade.evaluationType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-lg text-sm font-semibold ${getGradeColor(grade.score)}`}>
                              {grade.score}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-500 hidden md:table-cell">{grade.coefficient}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs hidden xl:table-cell">{date}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => handleEdit(grade)} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Modifier">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(grade.id)} disabled={deletingId === grade.id} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50" title="Supprimer">
                                {deletingId === grade.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Page {pagination.page} sur {totalPages}</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;
                    return (
                      <button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${currentPage === pageNum ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                        {pageNum}
                      </button>
                    );
                  })}
                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Quick Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Statistiques</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-indigo-50 rounded-lg">
                <p className="text-2xl font-bold text-indigo-700">{totalGrades}</p>
                <p className="text-xs text-indigo-600">Notes</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-700">{classAvg > 0 ? classAvg.toFixed(1) : "—"}</p>
                <p className="text-xs text-gray-600">Moy. Classe</p>
              </div>
            </div>
          </div>

          {/* Subject Averages */}
          {subjectAverages.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                Moyennes par Matière
              </h3>
              <div className="space-y-2">
                {subjectAverages.map((sa) => (
                  <div key={sa.subjectName} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div>
                      <span className="text-xs text-gray-600 truncate block max-w-[120px]">{sa.subjectName}</span>
                      <span className="text-[10px] text-gray-400">{sa.count} note{sa.count !== 1 ? "s" : ""}</span>
                    </div>
                    <span className={`text-sm font-semibold px-2 py-0.5 rounded ${sa.average >= 14 ? "text-emerald-600 bg-emerald-50" : sa.average >= 10 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50"}`}>
                      {sa.average.toFixed(1)}/20
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Class Ranking */}
          {classRanking.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Classement (Top 10)
              </h3>
              <div className="space-y-1.5">
                {classRanking.map((cr) => (
                  <div key={cr.studentName} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getRankBadge(cr.rank)}`}>
                        {cr.rank}
                      </span>
                      <span className="text-xs text-gray-700 truncate max-w-[120px]">{cr.studentName}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-600">{cr.average.toFixed(1)}/20</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {subjectAverages.length === 0 && classRanking.length === 0 && !loading && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
              <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Les statistiques apparaîtront ici une fois les notes ajoutées</p>
            </div>
          )}
        </div>
      </div>

      <GradeModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingGrade(null); }}
        grade={editingGrade}
        onSuccess={fetchGrades}
      />
    </div>
  );
}
