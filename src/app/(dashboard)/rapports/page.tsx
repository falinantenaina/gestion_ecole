"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  BarChart3,
  GraduationCap,
  DollarSign,
  FileText,
  Printer,
  Download,
  Loader2,
  Users,
  TrendingUp,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type TabKey = "academic" | "financial" | "administrative";

interface ClassAverage {
  id: string;
  name: string;
  level: string;
  schoolYear: string;
  totalStudents: number;
  totalGrades: number;
  average: number;
  subjectAverages: { name: string; average: number; totalGrades: number }[];
}

interface StudentRank {
  id: string;
  firstName: string;
  lastName: string;
  matricule: string;
  average: number;
  totalGrades: number;
}

interface FinancialData {
  totalPaid: number;
  totalTransactions: number;
  totalDue: number;
  unpaidAmount: number;
  paymentTypeSummary: {
    name: string;
    baseAmount: number;
    totalReceived: number;
    count: number;
  }[];
  recentPayments: {
    id: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    student: { firstName: string; lastName: string; matricule: string };
    paymentType: { name: string };
  }[];
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  matricule: string;
  dateOfBirth: string;
  gender: string;
  phone: string | null;
  email: string | null;
  parentName: string | null;
  parentPhone: string | null;
  enrollments?: { class: { name: string }; status: string }[];
}

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  phone: string | null;
  email: string | null;
  qualification: string | null;
  specialization: string | null;
  isActive: boolean;
  teacherSubjects?: { subject: { name: string } }[];
  teacherClasses?: { class: { name: string } }[];
}

const PIE_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
];

const tabs = [
  { key: "academic" as TabKey, label: "Rapports Académiques", icon: GraduationCap },
  { key: "financial" as TabKey, label: "Rapports Financiers", icon: DollarSign },
  { key: "administrative" as TabKey, label: "Rapports Administratifs", icon: FileText },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "MGA",
    maximumFractionDigits: 0,
  }).format(amount);
}

function SkeletonTable() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-48 mb-6" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded" />
        ))}
      </div>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-40 mb-6" />
      <div className="h-64 bg-gray-100 rounded" />
    </div>
  );
}

function PrintButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
    >
      <Printer className="w-3.5 h-3.5" />
      Imprimer
    </button>
  );
}

function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
    >
      <Download className="w-3.5 h-3.5" />
      Exporter CSV
    </button>
  );
}

export default function RapportsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("academic");

  const [classData, setClassData] = useState<ClassAverage[]>([]);
  const [studentData, setStudentData] = useState<StudentRank[]>([]);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const [loadingAcademic, setLoadingAcademic] = useState(true);
  const [loadingFinancial, setLoadingFinancial] = useState(true);
  const [loadingAdministrative, setLoadingAdministrative] = useState(true);

  const printRef = useRef<HTMLDivElement>(null);

  const fetchAcademic = useCallback(async () => {
    setLoadingAcademic(true);
    try {
      const [classesRes, studentsRes] = await Promise.all([
        fetch("/api/rapports?type=classes"),
        fetch("/api/rapports?type=students"),
      ]);
      const classesJson = await classesRes.json();
      const studentsJson = await studentsRes.json();
      setClassData(classesJson.data || []);
      setStudentData(studentsJson.data || []);
    } catch {
      setClassData([]);
      setStudentData([]);
    } finally {
      setLoadingAcademic(false);
    }
  }, []);

  const fetchFinancial = useCallback(async () => {
    setLoadingFinancial(true);
    try {
      const res = await fetch("/api/rapports?type=financial");
      const json = await res.json();
      setFinancialData(json.data || null);
    } catch {
      setFinancialData(null);
    } finally {
      setLoadingFinancial(false);
    }
  }, []);

  const fetchAdministrative = useCallback(async () => {
    setLoadingAdministrative(true);
    try {
      const [studentsRes, teachersRes] = await Promise.all([
        fetch("/api/eleves?limit=500"),
        fetch("/api/enseignants?limit=500"),
      ]);
      const studentsJson = await studentsRes.json();
      const teachersJson = await teachersRes.json();
      setStudents(studentsJson.data || []);
      setTeachers(teachersJson.data || []);
    } catch {
      setStudents([]);
      setTeachers([]);
    } finally {
      setLoadingAdministrative(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "academic") fetchAcademic();
    else if (activeTab === "financial") fetchFinancial();
    else if (activeTab === "administrative") fetchAdministrative();
  }, [activeTab, fetchAcademic, fetchFinancial, fetchAdministrative]);

  function handlePrint() {
    window.print();
  }

  function exportTableToCSV(data: Record<string, unknown>[], filename: string) {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(";"),
      ...data.map((row) =>
        headers
          .map((h) => {
            const val = row[h];
            const str = val === null || val === undefined ? "" : String(val);
            return str.includes(";") || str.includes('"')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          })
          .join(";")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportStudents() {
    const data = students.map((s) => ({
      Prénom: s.firstName,
      Nom: s.lastName,
      Matricule: s.matricule,
      Genre: s.gender === "MALE" ? "M" : "F",
      Date_naissance: s.dateOfBirth
        ? new Date(s.dateOfBirth).toLocaleDateString("fr-FR")
        : "",
      Téléphone: s.phone || "",
      Email: s.email || "",
      Parent: s.parentName || "",
      Téléphone_parent: s.parentPhone || "",
    }));
    exportTableToCSV(data, "liste_eleves");
  }

  function exportTeachers() {
    const data = teachers.map((t) => ({
      Prénom: t.firstName,
      Nom: t.lastName,
      Matricule_employé: t.employeeId,
      Téléphone: t.phone || "",
      Email: t.email || "",
      Qualification: t.qualification || "",
      Spécialisation: t.specialization || "",
      Actif: t.isActive ? "Oui" : "Non",
      Matières: t.teacherSubjects?.map((ts) => ts.subject?.name).join(", ") || "",
      Classes: t.teacherClasses?.map((tc) => tc.class?.name).join(", ") || "",
    }));
    exportTableToCSV(data, "liste_enseignants");
  }

  const subjectChartData = classData.length > 0
    ? (() => {
        const map = new Map<string, { total: number; count: number }>();
        for (const cl of classData) {
          for (const sa of cl.subjectAverages) {
            const existing = map.get(sa.name);
            if (existing) {
              existing.total += sa.average;
              existing.count++;
            } else {
              map.set(sa.name, { total: sa.average, count: 1 });
            }
          }
        }
        return Array.from(map.entries()).map(([name, v]) => ({
          name,
          moyenne: Math.round((v.total / v.count) * 100) / 100,
        }));
      })()
    : [];

  const passRateData = classData.map((cl) => ({
    name: cl.name,
    taux:
      cl.totalStudents > 0
        ? Math.round(
            (cl.average >= 10 ? (cl.average / 20) * 100 : (cl.average / 20) * 50) *
              10
          ) / 10
        : 0,
    moyenne: cl.average,
  }));

  const monthlyPayments = financialData?.recentPayments
    ? (() => {
        const map = new Map<string, number>();
        for (const p of financialData.recentPayments) {
          const d = new Date(p.paymentDate);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          map.set(key, (map.get(key) || 0) + p.amount);
        }
        return Array.from(map.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, montant]) => {
            const [y, m] = month.split("-");
            const monthNames = [
              "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
              "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc",
            ];
            return { month: `${monthNames[parseInt(m, 10) - 1]} ${y}`, montant };
          });
      })()
    : [];

  const paymentMethodData = financialData?.recentPayments
    ? (() => {
        const map = new Map<string, { total: number; count: number }>();
        const methodLabels: Record<string, string> = {
          CASH: "Espèces",
          BANK_TRANSFER: "Virement",
          MOBILE_MONEY: "Mobile Money",
          CREDIT_CARD: "Carte",
        };
        for (const p of financialData.recentPayments) {
          const label = methodLabels[p.paymentMethod] || p.paymentMethod;
          const existing = map.get(label);
          if (existing) {
            existing.total += p.amount;
            existing.count++;
          } else {
            map.set(label, { total: p.amount, count: 1 });
          }
        }
        return Array.from(map.entries()).map(([name, v]) => ({
          name,
          value: v.count,
          total: v.total,
        }));
      })()
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-indigo-600" />
          Rapports
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Consultez les rapports académiques, financiers et administratifs
        </p>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "academic" && (
        <div className="space-y-6">
          {loadingAcademic ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-3" />
                    <div className="h-8 bg-gray-200 rounded w-20" />
                  </div>
                ))}
              </div>
              <SkeletonTable />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SkeletonChart />
                <SkeletonChart />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Users className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs text-indigo-600">Total Classes</p>
                      <p className="text-xl font-bold text-indigo-900">{classData.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 rounded-xl p-5 border border-green-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <GraduationCap className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-green-600">Total Élèves</p>
                      <p className="text-xl font-bold text-green-900">{studentData.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-amber-600">Moyenne Générale</p>
                      <p className="text-xl font-bold text-amber-900">
                        {classData.length > 0
                          ? (
                              classData.reduce((s, c) => s + c.average, 0) /
                              classData.length
                            ).toFixed(2)
                          : "—"}
                        /20
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Moyennes par Classe
                  </h2>
                  <PrintButton onClick={handlePrint} />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/50">
                        <th className="px-4 py-3 font-medium">Classe</th>
                        <th className="px-4 py-3 font-medium">Niveau</th>
                        <th className="px-4 py-3 font-medium text-center">Élèves</th>
                        <th className="px-4 py-3 font-medium text-center">Notes saisies</th>
                        <th className="px-4 py-3 font-medium text-center">Moyenne</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classData.map((cl) => (
                        <tr
                          key={cl.id}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {cl.name}
                          </td>
                          <td className="px-4 py-3 text-gray-500">{cl.level}</td>
                          <td className="px-4 py-3 text-center text-gray-700">
                            {cl.totalStudents}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-700">
                            {cl.totalGrades}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                cl.average >= 14
                                  ? "bg-green-100 text-green-700"
                                  : cl.average >= 10
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-700"
                              }`}
                            >
                              {cl.average.toFixed(2)}/20
                            </span>
                          </td>
                        </tr>
                      ))}
                      {classData.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                            Aucune donnée disponible
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Classement des Élèves (Top 20)
                  </h2>
                  <PrintButton onClick={handlePrint} />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/50">
                        <th className="px-4 py-3 font-medium">#</th>
                        <th className="px-4 py-3 font-medium">Élève</th>
                        <th className="px-4 py-3 font-medium">Matricule</th>
                        <th className="px-4 py-3 font-medium text-center">Nombre de notes</th>
                        <th className="px-4 py-3 font-medium text-center">Moyenne</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentData.slice(0, 20).map((s, i) => (
                        <tr
                          key={s.id}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-4 py-3 text-gray-500 font-medium">{i + 1}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {s.firstName} {s.lastName}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                              {s.matricule}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-700">
                            {s.totalGrades}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                s.average >= 14
                                  ? "bg-green-100 text-green-700"
                                  : s.average >= 10
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-700"
                              }`}
                            >
                              {s.average.toFixed(2)}/20
                            </span>
                          </td>
                        </tr>
                      ))}
                      {studentData.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                            Aucune donnée disponible
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Taux de Réussite par Classe
                  </h2>
                  <PrintButton onClick={handlePrint} />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/50">
                        <th className="px-4 py-3 font-medium">Classe</th>
                        <th className="px-4 py-3 font-medium text-center">Moyenne</th>
                        <th className="px-4 py-3 font-medium text-center">Taux de Réussite</th>
                      </tr>
                    </thead>
                    <tbody>
                      {passRateData.map((pr, i) => (
                        <tr
                          key={i}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">{pr.name}</td>
                          <td className="px-4 py-3 text-center text-gray-700">
                            {pr.moyenne.toFixed(2)}/20
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    pr.taux >= 60
                                      ? "bg-green-500"
                                      : pr.taux >= 40
                                        ? "bg-amber-500"
                                        : "bg-red-500"
                                  }`}
                                  style={{ width: `${Math.min(pr.taux, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-gray-600">
                                {pr.taux.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Moyenne par Matière
                  </h2>
                  <div className="h-72">
                    {subjectChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={subjectChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={80} />
                          <YAxis tick={{ fontSize: 12 }} domain={[0, 20]} />
                          <Tooltip formatter={(value: number) => [`${value}/20`, "Moyenne"]} />
                          <Bar dataKey="moyenne" fill="#6366F1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                        Aucune donnée disponible
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Moyennes par Classe
                  </h2>
                  <div className="h-72">
                    {classData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={classData.map((c) => ({ name: c.name, moyenne: c.average }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 12 }} domain={[0, 20]} />
                          <Tooltip formatter={(value: number) => [`${value}/20`, "Moyenne"]} />
                          <Bar dataKey="moyenne" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                        Aucune donnée disponible
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "financial" && (
        <div className="space-y-6">
          {loadingFinancial ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-3" />
                    <div className="h-8 bg-gray-200 rounded w-24" />
                  </div>
                ))}
              </div>
              <SkeletonChart />
              <SkeletonTable />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-green-50 rounded-xl p-5 border border-green-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-green-600">Total Perçu</p>
                      <p className="text-lg font-bold text-green-900">
                        {formatCurrency(financialData?.totalPaid || 0)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-red-50 rounded-xl p-5 border border-red-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs text-red-600">Montant Impayé</p>
                      <p className="text-lg font-bold text-red-900">
                        {formatCurrency(financialData?.unpaidAmount || 0)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-600">Transactions</p>
                      <p className="text-lg font-bold text-blue-900">
                        {financialData?.totalTransactions || 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-amber-600">Total Dû</p>
                      <p className="text-lg font-bold text-amber-900">
                        {formatCurrency(financialData?.totalDue || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Paiements par Mois
                  </h2>
                  <PrintButton onClick={handlePrint} />
                </div>
                <div className="h-72">
                  {monthlyPayments.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyPayments}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          formatter={(value: number) => [formatCurrency(value), "Montant"]}
                        />
                        <Bar dataKey="montant" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                      Aucune donnée de paiement disponible
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Répartition par Mode de Paiement
                    </h2>
                    <PrintButton onClick={handlePrint} />
                  </div>
                  <div className="h-72">
                    {paymentMethodData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={paymentMethodData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                          >
                            {paymentMethodData.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={PIE_COLORS[index % PIE_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Legend />
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                        Aucune donnée disponible
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Total par Type de Paiement
                    </h2>
                    <PrintButton onClick={handlePrint} />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/50">
                          <th className="px-4 py-3 font-medium">Type</th>
                          <th className="px-4 py-3 font-medium text-center">Montant</th>
                          <th className="px-4 py-3 font-medium text-center">Transactions</th>
                          <th className="px-4 py-3 font-medium text-center">Total Reçu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financialData?.paymentTypeSummary.map((pt, i) => (
                          <tr
                            key={i}
                            className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                          >
                            <td className="px-4 py-3 font-medium text-gray-900">{pt.name}</td>
                            <td className="px-4 py-3 text-center text-gray-700">
                              {formatCurrency(pt.baseAmount)}
                            </td>
                            <td className="px-4 py-3 text-center text-gray-700">{pt.count}</td>
                            <td className="px-4 py-3 text-center font-bold text-green-700">
                              {formatCurrency(pt.totalReceived)}
                            </td>
                          </tr>
                        ))}
                        {(!financialData?.paymentTypeSummary ||
                          financialData.paymentTypeSummary.length === 0) && (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">
                              Aucune donnée disponible
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Liste des Impayés
                  </h2>
                  <PrintButton onClick={handlePrint} />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/50">
                        <th className="px-4 py-3 font-medium">Élève</th>
                        <th className="px-4 py-3 font-medium hidden sm:table-cell">Matricule</th>
                        <th className="px-4 py-3 font-medium">Type Frais</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Montant</th>
                        <th className="px-4 py-3 font-medium hidden md:table-cell">Mode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financialData?.recentPayments
                        .filter(
                          (p) =>
                            p.amount <
                            (financialData.paymentTypeSummary.find(
                              (pt) => pt.name === p.paymentType?.name
                            )?.baseAmount || Infinity)
                        )
                        .map((p) => (
                          <tr
                            key={p.id}
                            className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                          >
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {p.student.firstName} {p.student.lastName}
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                {p.student.matricule}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500">
                              {p.paymentType?.name || "—"}
                            </td>
                            <td className="px-4 py-3 text-gray-500">
                              {new Date(p.paymentDate).toLocaleDateString("fr-FR")}
                            </td>
                            <td className="px-4 py-3 font-medium text-red-600">
                              {formatCurrency(p.amount)}
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell text-gray-500">
                              {p.paymentMethod}
                            </td>
                          </tr>
                        ))}
                      {financialData?.recentPayments.filter(
                        (p) =>
                          p.amount <
                          (financialData.paymentTypeSummary.find(
                            (pt) => pt.name === p.paymentType?.name
                          )?.baseAmount || Infinity)
                      ).length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                            Aucun impayé détecté
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "administrative" && (
        <div className="space-y-6">
          {loadingAdministrative ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-3" />
                    <div className="h-8 bg-gray-200 rounded w-20" />
                  </div>
                ))}
              </div>
              <SkeletonTable />
              <SkeletonTable />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <GraduationCap className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-600">Total Élèves</p>
                      <p className="text-xl font-bold text-blue-900">{students.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 rounded-xl p-5 border border-green-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Users className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-green-600">Total Enseignants</p>
                      <p className="text-xl font-bold text-green-900">{teachers.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-xl p-5 border border-purple-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-purple-600">Enseignants Actifs</p>
                      <p className="text-xl font-bold text-purple-900">
                        {teachers.filter((t) => t.isActive).length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-amber-600">Taux d&apos;Activité</p>
                      <p className="text-xl font-bold text-amber-900">
                        {teachers.length > 0
                          ? Math.round(
                              (teachers.filter((t) => t.isActive).length /
                                teachers.length) *
                                100
                            )
                          : 0}
                        %
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Liste des Élèves
                  </h2>
                  <div className="flex items-center gap-2">
                    <ExportButton onClick={exportStudents} />
                    <PrintButton onClick={handlePrint} />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/50">
                        <th className="px-4 py-3 font-medium">Nom</th>
                        <th className="px-4 py-3 font-medium">Prénom</th>
                        <th className="px-4 py-3 font-medium hidden sm:table-cell">Matricule</th>
                        <th className="px-4 py-3 font-medium hidden md:table-cell">Genre</th>
                        <th className="px-4 py-3 font-medium hidden lg:table-cell">Date Naiss.</th>
                        <th className="px-4 py-3 font-medium hidden lg:table-cell">Parent</th>
                        <th className="px-4 py-3 font-medium hidden xl:table-cell">Tél. Parent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.slice(0, 50).map((s) => (
                        <tr
                          key={s.id}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">{s.lastName}</td>
                          <td className="px-4 py-3 text-gray-700">{s.firstName}</td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                              {s.matricule}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
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
                          <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                            {s.dateOfBirth
                              ? new Date(s.dateOfBirth).toLocaleDateString("fr-FR")
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                            {s.parentName || "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-500 hidden xl:table-cell">
                            {s.parentPhone || "—"}
                          </td>
                        </tr>
                      ))}
                      {students.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                            Aucun élève enregistré
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {students.length > 50 && (
                  <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
                    Affichage de 50 sur {students.length} élèves
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Liste des Enseignants
                  </h2>
                  <div className="flex items-center gap-2">
                    <ExportButton onClick={exportTeachers} />
                    <PrintButton onClick={handlePrint} />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/50">
                        <th className="px-4 py-3 font-medium">Nom</th>
                        <th className="px-4 py-3 font-medium">Prénom</th>
                        <th className="px-4 py-3 font-medium hidden sm:table-cell">Matricule</th>
                        <th className="px-4 py-3 font-medium hidden md:table-cell">Qualification</th>
                        <th className="px-4 py-3 font-medium hidden md:table-cell">Spécialisation</th>
                        <th className="px-4 py-3 font-medium hidden lg:table-cell">Matières</th>
                        <th className="px-4 py-3 font-medium hidden lg:table-cell">Classes</th>
                        <th className="px-4 py-3 font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teachers.map((t) => (
                        <tr
                          key={t.id}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">{t.lastName}</td>
                          <td className="px-4 py-3 text-gray-700">{t.firstName}</td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                              {t.employeeId}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                            {t.qualification || "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                            {t.specialization || "—"}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {t.teacherSubjects?.map((ts, i) => (
                                <span
                                  key={i}
                                  className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full"
                                >
                                  {ts.subject?.name}
                                </span>
                              ))}
                              {(!t.teacherSubjects || t.teacherSubjects.length === 0) && (
                                <span className="text-gray-400 text-xs">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {t.teacherClasses?.map((tc, i) => (
                                <span
                                  key={i}
                                  className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full"
                                >
                                  {tc.class?.name}
                                </span>
                              ))}
                              {(!t.teacherClasses || t.teacherClasses.length === 0) && (
                                <span className="text-gray-400 text-xs">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                t.isActive
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {t.isActive ? "Actif" : "Inactif"}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {teachers.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">
                            Aucun enseignant enregistré
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Historique des Inscriptions
                  </h2>
                  <PrintButton onClick={handlePrint} />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/50">
                        <th className="px-4 py-3 font-medium">Élève</th>
                        <th className="px-4 py-3 font-medium">Classe</th>
                        <th className="px-4 py-3 font-medium hidden sm:table-cell">Année Scolaire</th>
                        <th className="px-4 py-3 font-medium hidden md:table-cell">Date Inscription</th>
                        <th className="px-4 py-3 font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students
                        .flatMap((s) =>
                          (s.enrollments || []).map((e) => ({
                            student: s,
                            enrollment: e,
                          }))
                        )
                        .sort(
                          (a, b) =>
                            new Date(b.enrollment.status === "VALIDATED" ? "2099" : "2000").getTime() -
                            new Date(a.enrollment.status === "VALIDATED" ? "2099" : "2000").getTime()
                        )
                        .slice(0, 30)
                        .map(({ student, enrollment }, i) => (
                          <tr
                            key={`${student.id}-${i}`}
                            className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                          >
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {student.firstName} {student.lastName}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {enrollment.class?.name || "—"}
                            </td>
                            <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">—</td>
                            <td className="px-4 py-3 text-gray-500 hidden md:table-cell">—</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                  enrollment.status === "VALIDATED"
                                    ? "bg-green-100 text-green-700"
                                    : enrollment.status === "PENDING"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {enrollment.status === "VALIDATED"
                                  ? "Validée"
                                  : enrollment.status === "PENDING"
                                    ? "En attente"
                                    : enrollment.status === "CANCELLED"
                                      ? "Annulée"
                                      : enrollment.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      {students.filter((s) => s.enrollments && s.enrollments.length > 0)
                        .length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                            Aucune inscription enregistrée
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Statistiques par Classe
                  </h2>
                  <PrintButton onClick={handlePrint} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classData.map((cl) => (
                    <div
                      key={cl.id}
                      className="border border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">{cl.name}</h3>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {cl.level}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Élèves</p>
                          <p className="font-bold text-gray-900">{cl.totalStudents}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Notes</p>
                          <p className="font-bold text-gray-900">{cl.totalGrades}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Moyenne</p>
                          <p
                            className={`font-bold ${
                              cl.average >= 14
                                ? "text-green-600"
                                : cl.average >= 10
                                  ? "text-amber-600"
                                  : "text-red-600"
                            }`}
                          >
                            {cl.average.toFixed(2)}/20
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Matières</p>
                          <p className="font-bold text-gray-900">{cl.subjectAverages.length}</p>
                        </div>
                      </div>
                      {cl.subjectAverages.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-500 mb-2">Détail par matière</p>
                          <div className="space-y-1">
                            {cl.subjectAverages.slice(0, 3).map((sa, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 truncate">{sa.name}</span>
                                <span
                                  className={`font-medium ${
                                    sa.average >= 14
                                      ? "text-green-600"
                                      : sa.average >= 10
                                        ? "text-amber-600"
                                        : "text-red-600"
                                  }`}
                                >
                                  {sa.average.toFixed(1)}
                                </span>
                              </div>
                            ))}
                            {cl.subjectAverages.length > 3 && (
                              <p className="text-xs text-gray-400">
                                +{cl.subjectAverages.length - 3} autres
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {classData.length === 0 && (
                    <div className="col-span-full text-center text-gray-400 text-sm py-8">
                      Aucune donnée de classe disponible
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
