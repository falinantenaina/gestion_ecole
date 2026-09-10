"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Printer,
  Loader2,
  GraduationCap,
  ArrowLeft,
  Download,
  Users,
  User,
} from "lucide-react";
import Link from "next/link";
import type {
  Student,
  Term,
  Grade,
  Subject,
  Class,
  SchoolYear,
} from "@/types";

interface SubjectAverage {
  subject: Subject;
  grades: Grade[];
  average: number;
  totalCoeff: number;
  devoirs: { label: string; score: number; maxScore: number }[];
}

interface StudentReport {
  student: Student;
  term: Term | null;
  schoolYear: SchoolYear | null;
  className: string;
  subjectAverages: SubjectAverage[];
  overallAverage: number;
  overallRank: number;
  totalStudents: number;
}

interface ClassRankingRow {
  student: Student;
  average: number;
  rank: number;
  mention: string;
  status: "Admis" | "Refusé";
}

function getMention(average: number): string {
  if (average >= 16) return "Très Bien";
  if (average >= 14) return "Bien";
  if (average >= 12) return "Assez Bien";
  if (average >= 10) return "Passable";
  return "Insuffisant";
}

function getAppreciation(average: number): string {
  if (average >= 16) return "Excellent travail, continuez ainsi.";
  if (average >= 14) return "Bon travail, des progrès sont possibles.";
  if (average >= 12) return "Travail satisfaisant avec des efforts à poursuivre.";
  if (average >= 10) return "Travail acceptable, des efforts sont nécessaires.";
  return "Travail insuffisant, des efforts importants sont nécessaires.";
}

export default function BulletinPage() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [classStudents, setClassStudents] = useState<Student[]>([]);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");
  const [showEntireClass, setShowEntireClass] = useState(false);

  const [report, setReport] = useState<StudentReport | null>(null);
  const [classRanking, setClassRanking] = useState<ClassRankingRow[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  const fetchDropdowns = useCallback(async () => {
    setLoadingDropdowns(true);
    try {
      const [classesRes, yearsRes] = await Promise.all([
        fetch("/api/classes?limit=500"),
        fetch("/api/school-years"),
      ]);
      setClasses((await classesRes.json()).data || []);
      const yearsData = (await yearsRes.json()).data || [];
      setSchoolYears(yearsData);
      const allTerms: Term[] = [];
      for (const sy of yearsData) { if (sy.terms) allTerms.push(...sy.terms); }
      setTerms(allTerms);
    } catch { /* silent */ }
    finally { setLoadingDropdowns(false); }
  }, []);

  useEffect(() => { fetchDropdowns(); }, [fetchDropdowns]);

  useEffect(() => {
    if (selectedClassId) {
      setLoadingStudents(true);
      fetch(`/api/eleves?limit=500`)
        .then((r) => r.json())
          .then((data) => {
            const students = (data.data || []).filter((s: { enrollments?: { classId: string; status: string }[] }) =>
              s.enrollments?.some((e) => e.classId === selectedClassId && e.status === "VALIDATED")
            );
          setClassStudents(students);
        })
        .catch(() => setClassStudents([]))
        .finally(() => setLoadingStudents(false));
    } else {
      setClassStudents([]);
    }
    setSelectedStudentId("");
  }, [selectedClassId]);

  const generateReport = useCallback(async () => {
    if (!selectedTermId) { setReport(null); setClassRanking([]); return; }

    if (showEntireClass && selectedClassId) {
      setLoadingReport(true);
      try {
        const params = new URLSearchParams({ classId: selectedClassId, termId: selectedTermId, limit: "500" });
        const res = await fetch(`/api/notes?${params.toString()}`);
        const data = await res.json();
        const gradeRows = (data.data || []) as (Grade & { student?: Student; subject?: Subject })[];

        const studentMap = new Map<string, { student: Student; weighted: number; coeff: number }>();
        for (const g of gradeRows) {
          if (!g.student) continue;
          const existing = studentMap.get(g.studentId);
          if (existing) { existing.weighted += g.score * g.coefficient; existing.coeff += g.coefficient; }
          else studentMap.set(g.studentId, { student: g.student, weighted: g.score * g.coefficient, coeff: g.coefficient });
        }

        const ranking: ClassRankingRow[] = Array.from(studentMap.values())
          .map((d) => ({ student: d.student, average: d.coeff > 0 ? Math.round((d.weighted / d.coeff) * 100) / 100 : 0, rank: 0, mention: "", status: "Refusé" }))
          .sort((a, b) => b.average - a.average)
          .map((d, i) => ({
            ...d,
            rank: i + 1,
            mention: getMention(d.average),
            status: d.average >= 10 ? "Admis" : "Refusé",
          }));

        setClassRanking(ranking);
        setReport(null);
      } catch { setClassRanking([]); }
      finally { setLoadingReport(false); }
      return;
    }

    if (!selectedStudentId) { setReport(null); setClassRanking([]); return; }

    setLoadingReport(true);
    try {
      const params = new URLSearchParams({ studentId: selectedStudentId, termId: selectedTermId });
      if (selectedClassId) params.set("classId", selectedClassId);
      const res = await fetch(`/api/notes?${params.toString()}`);
      const data = await res.json();
      const gradeRows = (data.data || []) as (Grade & { subject?: Subject; class?: { id: string; name: string } })[];

      const student = classStudents.find((s) => s.id === selectedStudentId);
      if (!student) { setReport(null); setLoadingReport(false); return; }

      const term = terms.find((t) => t.id === selectedTermId);
      const sy = schoolYears.find((s) => s.isCurrent) || schoolYears[0] || null;
      const className = gradeRows.length > 0 && gradeRows[0].class ? gradeRows[0].class.name : classes.find((c) => c.id === selectedClassId)?.name || "—";

      const subjectMap = new Map<string, { subject: Subject; grades: Grade[]; totalScore: number; totalCoeff: number }>();
      for (const g of gradeRows) {
        if (!g.subject) continue;
        const existing = subjectMap.get(g.subjectId);
        if (existing) { existing.grades.push(g); existing.totalScore += g.score * g.coefficient; existing.totalCoeff += g.coefficient; }
        else subjectMap.set(g.subjectId, { subject: g.subject, grades: [g], totalScore: g.score * g.coefficient, totalCoeff: g.coefficient });
      }

      const subjectAverages: SubjectAverage[] = Array.from(subjectMap.values()).map((d) => ({
        subject: d.subject,
        grades: d.grades,
        average: d.totalCoeff > 0 ? Math.round((d.totalScore / d.totalCoeff) * 100) / 100 : 0,
        totalCoeff: d.totalCoeff,
        devoirs: d.grades.slice(0, 3).map((g) => ({
          label: g.evaluationName || (g.evaluationType === "EXAM" ? "Examen" : g.evaluationType === "QUIZ" ? "Contrôle" : `Note ${d.grades.indexOf(g) + 1}`),
          score: g.score,
          maxScore: g.maxScore,
        })),
      }));

      let overallTotal = 0;
      let overallCoeff = 0;
      for (const sa of subjectAverages) { overallTotal += sa.average * sa.totalCoeff; overallCoeff += sa.totalCoeff; }
      const overallAverage = overallCoeff > 0 ? Math.round((overallTotal / overallCoeff) * 100) / 100 : 0;

      // Calculate rank
      const allParams = new URLSearchParams({ classId: selectedClassId || gradeRows[0]?.classId || "", termId: selectedTermId, limit: "500" });
      const allRes = await fetch(`/api/notes?${allParams.toString()}`);
      const allData = await allRes.json();
      const allGrades = (allData.data || []) as (Grade & { student?: Student })[];
      const rankMap = new Map<string, { weighted: number; coeff: number }>();
      for (const g of allGrades) {
        if (!g.student) continue;
        const existing = rankMap.get(g.studentId);
        if (existing) { existing.weighted += g.score * g.coefficient; existing.coeff += g.coefficient; }
        else rankMap.set(g.studentId, { weighted: g.score * g.coefficient, coeff: g.coefficient });
      }
      const sortedStudents = Array.from(rankMap.entries())
        .map(([id, d]) => ({ id, average: d.coeff > 0 ? Math.round((d.weighted / d.coeff) * 100) / 100 : 0 }))
        .sort((a, b) => b.average - a.average);
      const overallRank = sortedStudents.findIndex((s) => s.id === selectedStudentId) + 1;

      setReport({
        student,
        term: term || null,
        schoolYear: sy,
        className,
        subjectAverages,
        overallAverage,
        overallRank,
        totalStudents: sortedStudents.length,
      });
      setClassRanking([]);
    } catch { setReport(null); }
    finally { setLoadingReport(false); }
  }, [selectedStudentId, selectedTermId, selectedClassId, showEntireClass, classStudents, terms, schoolYears, classes]);

  useEffect(() => { generateReport(); }, [generateReport]);

  function handlePrint() { window.print(); }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-indigo-600" />
            Bulletin Scolaire
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Générez et imprimez les bulletins de vos élèves
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/notes" className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
          {(report || classRanking.length > 0) && (
            <>
              <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                <Printer className="w-4 h-4" />
                Imprimer
              </button>
              <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
                <Download className="w-4 h-4" />
                Exporter PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Selection Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 print:hidden">
        {loadingDropdowns ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
            <span className="ml-2 text-sm text-gray-500">Chargement des données...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Classe *</label>
                <select value={selectedClassId} onChange={(e) => { setSelectedClassId(e.target.value); setShowEntireClass(false); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Sélectionner une classe...</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trimestre *</label>
                <select value={selectedTermId} onChange={(e) => setSelectedTermId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Sélectionner un trimestre...</option>
                  {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Élève</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => { setSelectedStudentId(e.target.value); setShowEntireClass(false); }}
                  disabled={!selectedClassId || loadingStudents}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">{loadingStudents ? "Chargement..." : "Sélectionner un élève..."}</option>
                  {classStudents.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.matricule})</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => { setShowEntireClass(true); setSelectedStudentId(""); }}
                disabled={!selectedClassId}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${showEntireClass ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"} disabled:opacity-50`}
              >
                <Users className="w-4 h-4" />
                Toute la classe
              </button>
              <button
                onClick={() => { setShowEntireClass(false); }}
                disabled={!selectedClassId}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${!showEntireClass && selectedStudentId ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"} disabled:opacity-50`}
              >
                <User className="w-4 h-4" />
                Élève individuel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading */}
      {loadingReport && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          <span className="ml-2 text-sm text-gray-500">Génération du bulletin...</span>
        </div>
      )}

      {/* Individual Student Bulletin */}
      {!loadingReport && report && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 print:shadow-none print:border-0">
          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="text-center border-b-2 border-gray-900 pb-6 mb-6">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <GraduationCap className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
                École Primaire &amp; Secondaire
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Année Scolaire {report.schoolYear?.name || "—"}
              </p>
              <h3 className="text-lg font-bold text-indigo-700 mt-4">
                BULLETIN SCOLAIRE
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {report.term?.name || "Trimestre"} — {report.className}
              </p>
            </div>

            {/* Student Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Nom</p>
                <p className="text-sm font-semibold text-gray-900">{report.student.lastName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Prénom</p>
                <p className="text-sm font-semibold text-gray-900">{report.student.firstName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Matricule</p>
                <p className="text-sm font-mono text-gray-700">{report.student.matricule}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Date de naissance</p>
                <p className="text-sm text-gray-700">{formatDate(report.student.dateOfBirth)}</p>
              </div>
            </div>

            {/* Grades Table */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b-2 border-gray-200">
                    <th className="px-3 py-2 font-semibold">Matière</th>
                    <th className="px-3 py-2 font-semibold text-center">Coeff.</th>
                    {report.subjectAverages.length > 0 && report.subjectAverages[0].devoirs.map((d, i) => (
                      <th key={i} className="px-3 py-2 font-semibold text-center">{d.label}</th>
                    ))}
                    {report.subjectAverages.length > 0 && report.subjectAverages[0].devoirs.length < 3 &&
                      Array.from({ length: 3 - report.subjectAverages[0].devoirs.length }).map((_, i) => (
                        <th key={`empty-h-${i}`} className="px-3 py-2 font-semibold text-center text-gray-300">
                          {`Devoir ${report.subjectAverages[0].devoirs.length + i + 1}`}
                        </th>
                      ))}
                    <th className="px-3 py-2 font-semibold text-center">Moyenne</th>
                    <th className="px-3 py-2 font-semibold text-center hidden sm:table-cell">Appréciation</th>
                  </tr>
                </thead>
                <tbody>
                  {report.subjectAverages.map((sa) => (
                    <tr key={sa.subject.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-gray-900">{sa.subject.name}</div>
                        <div className="text-xs text-gray-400">{sa.subject.code}</div>
                      </td>
                      <td className="px-3 py-2.5 text-center text-gray-600">{sa.totalCoeff}</td>
                      {sa.devoirs.map((d, i) => (
                        <td key={i} className="px-3 py-2.5 text-center text-gray-700">{d.score}/{d.maxScore}</td>
                      ))}
                      {sa.devoirs.length < 3 &&
                        Array.from({ length: 3 - sa.devoirs.length }).map((_, i) => (
                          <td key={`empty-${i}`} className="px-3 py-2.5 text-center text-gray-300">—</td>
                        ))}
                      <td className="px-3 py-2.5 text-center font-bold text-gray-900">{sa.average.toFixed(2)}/20</td>
                      <td className="px-3 py-2.5 text-center text-gray-500 text-xs hidden sm:table-cell italic">
                        {getAppreciation(sa.average)}
                      </td>
                    </tr>
                  ))}
                  {report.subjectAverages.length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400 text-sm">Aucune note enregistrée pour cette période</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-indigo-50 rounded-lg text-center">
                <p className="text-xs text-indigo-600 uppercase tracking-wide mb-1">Moyenne Générale</p>
                <p className="text-2xl font-bold text-indigo-700">{report.overallAverage.toFixed(2)}/20</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Rang</p>
                <p className="text-2xl font-bold text-gray-700">{report.overallRank}/{report.totalStudents}</p>
              </div>
              <div className={`p-4 rounded-lg text-center border ${report.overallAverage >= 10 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                <p className="text-xs uppercase tracking-wide mb-1">{report.overallAverage >= 10 ? "Décision" : "Statut"}</p>
                <p className="text-lg font-bold">{report.overallAverage >= 10 ? "Admis" : "Refusé"}</p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Mention</p>
              <p className="text-sm font-semibold text-gray-900">{getMention(report.overallAverage)}</p>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Appréciation du Conseil de Classe</p>
              <p className="text-sm text-gray-700 italic">&ldquo;{getAppreciation(report.overallAverage)}&rdquo;</p>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-10">
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-12">Le Directeur</p>
                <div className="border-t border-gray-300 pt-2">
                  <p className="text-sm text-gray-700">Signature</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-12">Le Professeur Principal</p>
                <div className="border-t border-gray-300 pt-2">
                  <p className="text-sm text-gray-700">Signature</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-400">Fait à _____________, le {today}</p>
            </div>
          </div>
        </div>
      )}

      {/* Class Ranking View */}
      {!loadingReport && classRanking.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 print:shadow-none print:border-0">
          <div className="p-6 sm:p-8">
            <div className="text-center border-b-2 border-gray-900 pb-6 mb-6">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
                École Primaire &amp; Secondaire
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Année Scolaire {schoolYears.find((s) => s.isCurrent)?.name || "—"}
              </p>
              <h3 className="text-lg font-bold text-indigo-700 mt-4">
                CLASSEMENT DE LA CLASSE
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {terms.find((t) => t.id === selectedTermId)?.name || "Trimestre"} — {classes.find((c) => c.id === selectedClassId)?.name || "Classe"}
              </p>
            </div>

            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b-2 border-gray-200">
                    <th className="px-3 py-2 font-semibold text-center w-16">Rang</th>
                    <th className="px-3 py-2 font-semibold">Nom</th>
                    <th className="px-3 py-2 font-semibold">Prénom</th>
                    <th className="px-3 py-2 font-semibold text-center">Moyenne</th>
                    <th className="px-3 py-2 font-semibold text-center">Mention</th>
                    <th className="px-3 py-2 font-semibold text-center">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {classRanking.map((row) => (
                    <tr key={row.student.id} className={`border-b border-gray-100 last:border-0 ${row.status === "Admis" ? "" : "bg-red-50/50"}`}>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`w-8 h-8 rounded-full inline-flex items-center justify-center text-xs font-bold ${row.rank <= 3 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                          {row.rank}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-gray-900">{row.student.lastName}</td>
                      <td className="px-3 py-2.5 text-gray-700">{row.student.firstName}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-gray-900">{row.average.toFixed(2)}/20</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${row.average >= 16 ? "bg-emerald-100 text-emerald-700" : row.average >= 14 ? "bg-blue-100 text-blue-700" : row.average >= 12 ? "bg-indigo-100 text-indigo-700" : row.average >= 10 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                          {row.mention}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${row.status === "Admis" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Class Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-indigo-50 rounded-lg text-center">
                <p className="text-xs text-indigo-600 uppercase tracking-wide mb-1">Moyenne de la Classe</p>
                <p className="text-2xl font-bold text-indigo-700">
                  {classRanking.length > 0 ? (classRanking.reduce((s, r) => s + r.average, 0) / classRanking.length).toFixed(2) : "—"}/20
                </p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg text-center">
                <p className="text-xs text-emerald-600 uppercase tracking-wide mb-1">Taux de Réussite</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {classRanking.length > 0 ? Math.round((classRanking.filter((r) => r.status === "Admis").length / classRanking.length) * 100) : 0}%
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Élèves</p>
                <p className="text-2xl font-bold text-gray-700">{classRanking.length}</p>
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-10">
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-12">Le Directeur</p>
                <div className="border-t border-gray-300 pt-2">
                  <p className="text-sm text-gray-700">Signature</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-12">Le Professeur Principal</p>
                <div className="border-t border-gray-300 pt-2">
                  <p className="text-sm text-gray-700">Signature</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-400">Fait à _____________, le {today}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty States */}
      {!loadingReport && !report && classRanking.length === 0 && selectedTermId && !showEntireClass && !selectedStudentId && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Sélectionnez un élève pour afficher son bulletin</p>
        </div>
      )}

      {!loadingReport && !report && classRanking.length === 0 && !selectedTermId && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Sélectionnez une classe et un trimestre pour générer le bulletin</p>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:shadow-none, .print\\:border-0,
          .print\\:shadow-none *, .print\\:border-0 * { visibility: visible !important; }
          .print\\:shadow-none, .print\\:border-0 { position: absolute; left: 0; top: 0; width: 100%; }
          @page { margin: 1.5cm; size: A4; }
          table { page-break-inside: avoid; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
