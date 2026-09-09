"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Printer,
  Loader2,
  GraduationCap,
  ArrowLeft,
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
}

interface StudentReport {
  student: Student;
  term: Term | null;
  className: string;
  grades: Grade[];
  subjectAverages: SubjectAverage[];
  overallAverage: number;
  overallRank: number;
  totalStudents: number;
}

function getMention(average: number): string {
  if (average >= 16) return "Très Bien";
  if (average >= 14) return "Bien";
  if (average >= 12) return "Assez Bien";
  if (average >= 10) return "Passable";
  return "Insuffisant";
}

function getMentionColor(average: number): string {
  if (average >= 16) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (average >= 14) return "text-blue-700 bg-blue-50 border-blue-200";
  if (average >= 12) return "text-indigo-700 bg-indigo-50 border-indigo-200";
  if (average >= 10) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function getAppreciation(average: number): string {
  if (average >= 16) return "Excellent travail, continuez ainsi.";
  if (average >= 14) return "Bon travail, des progrès sont possibles.";
  if (average >= 12) return "Travail satisfaisant avec des efforts à poursuivre.";
  if (average >= 10) return "Travail acceptable, des efforts sont nécessaires.";
  return "Travail insuffisant, des efforts importants sont nécessaires.";
}

export default function BulletinPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);

  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");

  const [report, setReport] = useState<StudentReport | null>(null);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);

  const fetchDropdowns = useCallback(async () => {
    setLoadingDropdowns(true);
    try {
      const [studentsRes, classesRes, yearsRes] = await Promise.all([
        fetch("/api/eleves?limit=500"),
        fetch("/api/classes?limit=500"),
        fetch("/api/school-years"),
      ]);
      const studentsData = await studentsRes.json();
      const classesData = await classesRes.json();
      const yearsData = await yearsRes.json();
      setStudents(studentsData.data || []);
      setClasses(classesData.data || []);
      setSchoolYears(yearsData.data || []);

      const allTerms: Term[] = [];
      for (const sy of yearsData.data || []) {
        if (sy.terms) allTerms.push(...sy.terms);
      }
      setTerms(allTerms);
    } catch {
      /* silent */
    } finally {
      setLoadingDropdowns(false);
    }
  }, []);

  useEffect(() => {
    fetchDropdowns();
  }, [fetchDropdowns]);

  const generateReport = useCallback(async () => {
    if (!selectedStudentId || !selectedTermId) {
      setReport(null);
      return;
    }

    setLoadingReport(true);
    try {
      const params = new URLSearchParams({
        studentId: selectedStudentId,
        termId: selectedTermId,
      });
      if (selectedClassId) params.set("classId", selectedClassId);

      const res = await fetch(`/api/notes?${params.toString()}`);
      const data = await res.json();
      const gradeRows = data.data || [];

      const student = students.find((s) => s.id === selectedStudentId);
      if (!student) {
        setReport(null);
        return;
      }

      const term = terms.find((t) => t.id === selectedTermId);
      const className =
        gradeRows.length > 0 && gradeRows[0].class
          ? gradeRows[0].class.name
          : classes.find((c) => c.id === selectedClassId)?.name || "—";

      const subjectMap = new Map<
        string,
        { subject: Subject; grades: Grade[]; totalScore: number; totalCoeff: number }
      >();

      for (const g of gradeRows) {
        if (!g.subject) continue;
        const existing = subjectMap.get(g.subjectId);
        if (existing) {
          existing.grades.push(g);
          existing.totalScore += g.score * g.coefficient;
          existing.totalCoeff += g.coefficient;
        } else {
          subjectMap.set(g.subjectId, {
            subject: g.subject,
            grades: [g],
            totalScore: g.score * g.coefficient,
            totalCoeff: g.coefficient,
          });
        }
      }

      const subjectAverages: SubjectAverage[] = Array.from(
        subjectMap.values()
      ).map((d) => ({
        subject: d.subject,
        grades: d.grades,
        average:
          d.totalCoeff > 0
            ? Math.round((d.totalScore / d.totalCoeff) * 100) / 100
            : 0,
        totalCoeff: d.totalCoeff,
      }));

      let overallTotal = 0;
      let overallCoeff = 0;
      for (const sa of subjectAverages) {
        overallTotal += sa.average * sa.totalCoeff;
        overallCoeff += sa.totalCoeff;
      }
      const overallAverage =
        overallCoeff > 0
          ? Math.round((overallTotal / overallCoeff) * 100) / 100
          : 0;

      setReport({
        student,
        term: term || null,
        className,
        grades: gradeRows,
        subjectAverages,
        overallAverage,
        overallRank: 1,
        totalStudents: 1,
      });
    } catch {
      setReport(null);
    } finally {
      setLoadingReport(false);
    }
  }, [
    selectedStudentId,
    selectedTermId,
    selectedClassId,
    students,
    terms,
    classes,
  ]);

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  function handlePrint() {
    window.print();
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <div className="space-y-5">
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
          <Link
            href="/notes"
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
          {report && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimer
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 print:hidden">
        {loadingDropdowns ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
            <span className="ml-2 text-sm text-gray-500">
              Chargement des données...
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Élève *
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Sélectionner un élève...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} ({s.matricule})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trimestre *
              </label>
              <select
                value={selectedTermId}
                onChange={(e) => setSelectedTermId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Sélectionner un trimestre...</option>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Classe (optionnel)
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Toutes les classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {loadingReport && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          <span className="ml-2 text-sm text-gray-500">
            Génération du bulletin...
          </span>
        </div>
      )}

      {!loadingReport && report && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 print:shadow-none print:border-0">
          <div className="p-6 sm:p-8">
            <div className="text-center border-b-2 border-gray-900 pb-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
                École Primaire & Secondaire
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Année Scolaire {report.term?.name || "—"}
              </p>
              <h3 className="text-lg font-bold text-indigo-700 mt-4">
                BULLETIN SCOLAIRE
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {report.term?.name || "Trimestre"} — {report.className}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Nom
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {report.student.lastName}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Prénom
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {report.student.firstName}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Matricule
                </p>
                <p className="text-sm font-mono text-gray-700">
                  {report.student.matricule}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Date de naissance
                </p>
                <p className="text-sm text-gray-700">
                  {formatDate(report.student.dateOfBirth)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b-2 border-gray-200">
                    <th className="px-3 py-2 font-semibold">Matière</th>
                    <th className="px-3 py-2 font-semibold text-center">
                      Coeff.
                    </th>
                    {report.subjectAverages.length > 0 &&
                      report.subjectAverages[0].grades.slice(0, 3).map((_, i) => (
                        <th
                          key={i}
                          className="px-3 py-2 font-semibold text-center"
                        >
                          Note {i + 1}
                        </th>
                      ))}
                    <th className="px-3 py-2 font-semibold text-center">
                      Moyenne
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.subjectAverages.map((sa) => (
                    <tr
                      key={sa.subject.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-gray-900">
                          {sa.subject.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {sa.subject.code}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center text-gray-600">
                        {sa.subject.coefficient}
                      </td>
                      {sa.grades.slice(0, 3).map((g, i) => (
                        <td
                          key={i}
                          className="px-3 py-2.5 text-center text-gray-700"
                        >
                          {g.score}/{g.maxScore}
                        </td>
                      ))}
                      {sa.grades.length < 3 &&
                        Array.from({ length: 3 - sa.grades.length }).map(
                          (_, i) => (
                            <td
                              key={`empty-${i}`}
                              className="px-3 py-2.5 text-center text-gray-300"
                            >
                              —
                            </td>
                          )
                        )}
                      <td className="px-3 py-2.5 text-center font-bold text-gray-900">
                        {sa.average.toFixed(2)}/20
                      </td>
                    </tr>
                  ))}
                  {report.subjectAverages.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-8 text-center text-gray-400 text-sm"
                      >
                        Aucune note enregistrée pour cette période
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-indigo-50 rounded-lg text-center">
                <p className="text-xs text-indigo-600 uppercase tracking-wide mb-1">
                  Moyenne Générale
                </p>
                <p className="text-2xl font-bold text-indigo-700">
                  {report.overallAverage.toFixed(2)}/20
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Rang
                </p>
                <p className="text-2xl font-bold text-gray-700">
                  {report.overallRank}/{report.totalStudents}
                </p>
              </div>
              <div
                className={`p-4 rounded-lg text-center border ${getMentionColor(
                  report.overallAverage
                )}`}
              >
                <p className="text-xs uppercase tracking-wide mb-1">
                  Mention
                </p>
                <p className="text-lg font-bold">
                  {getMention(report.overallAverage)}
                </p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                Appréciation du Conseil de Classe
              </p>
              <p className="text-sm text-gray-700 italic">
                &ldquo;{getAppreciation(report.overallAverage)}&rdquo;
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-10">
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-12">
                  Le Directeur
                </p>
                <div className="border-t border-gray-300 pt-2">
                  <p className="text-sm text-gray-700">Signature</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-12">
                  Le Professeur Principal
                </p>
                <div className="border-t border-gray-300 pt-2">
                  <p className="text-sm text-gray-700">Signature</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-400">
                Fait à _____________, le {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
        </div>
      )}

      {!loadingReport && !report && selectedStudentId && selectedTermId && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            Aucune donnée disponible pour cette sélection
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Vérifiez que des notes ont été saisies pour cet élève durant cette période
          </p>
        </div>
      )}

      {!loadingReport && !selectedStudentId && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            Sélectionnez un élève et un trimestre pour générer le bulletin
          </p>
        </div>
      )}
    </div>
  );
}
