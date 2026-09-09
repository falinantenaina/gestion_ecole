"use client";

import { useEffect, useState } from "react";
import {
  GraduationCap,
  Users,
  BookOpen,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  FileText,
  PieChart as PieChartIcon,
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

interface Enrollment {
  id: string;
  student: { firstName: string; lastName: string; matricule: string };
  class: { name: string };
  schoolYear: { name: string };
  enrollmentDate: string;
  status: string;
}

interface DashboardData {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  todayAbsences: number;
  totalPayments: number;
  unpaidAmount: number;
  recentEnrollments: Enrollment[];
  monthlyPayments: { total: number; count: number };
  monthlyPaymentHistory: { month: string; montant: number }[];
  studentsByGender: { name: string; value: number }[];
}

const PIE_COLORS = ["#3B82F6", "#EC4899"];

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-3 flex-1">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-8 bg-gray-200 rounded w-16" />
        </div>
        <div className="w-12 h-12 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-40 mb-6" />
      <div className="h-64 bg-gray-100 rounded" />
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-96 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Erreur lors du chargement des données.</p>
      </div>
    );
  }

  const statCardsRow1 = [
    {
      label: "Total Élèves",
      value: data.totalStudents,
      icon: GraduationCap,
      bg: "bg-blue-500",
      light: "bg-blue-50",
      text: "text-blue-600",
    },
    {
      label: "Total Enseignants",
      value: data.totalTeachers,
      icon: Users,
      bg: "bg-green-500",
      light: "bg-green-50",
      text: "text-green-600",
    },
    {
      label: "Total Classes",
      value: data.totalClasses,
      icon: BookOpen,
      bg: "bg-purple-500",
      light: "bg-purple-50",
      text: "text-purple-600",
    },
    {
      label: "Absences Aujourd'hui",
      value: data.todayAbsences,
      icon: AlertTriangle,
      bg: "bg-red-500",
      light: "bg-red-50",
      text: "text-red-600",
    },
  ];

  const statCardsRow2 = [
    {
      label: "Paiements Reçus",
      value: formatCurrency(data.totalPayments),
      icon: DollarSign,
      bg: "bg-emerald-500",
      light: "bg-emerald-50",
      text: "text-emerald-600",
    },
    {
      label: "Montant Impayés",
      value: formatCurrency(data.unpaidAmount),
      icon: TrendingUp,
      bg: "bg-orange-500",
      light: "bg-orange-50",
      text: "text-orange-600",
    },
    {
      label: "Inscriptions Récentes",
      value: data.recentEnrollments.length,
      icon: FileText,
      bg: "bg-indigo-500",
      light: "bg-indigo-50",
      text: "text-indigo-600",
    },
    {
      label: "Paiements ce Mois",
      value: formatCurrency(data.monthlyPayments.total),
      icon: PieChartIcon,
      bg: "bg-cyan-500",
      light: "bg-cyan-50",
      text: "text-cyan-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-500 mt-1">
          Vue d&apos;ensemble de votre établissement scolaire
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCardsRow1.map((card) => (
          <div
            key={card.label}
            className={`${card.light} rounded-xl p-5 border border-gray-100`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`${card.bg} w-12 h-12 rounded-xl flex items-center justify-center`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCardsRow2.map((card) => (
          <div
            key={card.label}
            className={`${card.light} rounded-xl p-5 border border-gray-100`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`${card.bg} w-12 h-12 rounded-xl flex items-center justify-center`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Paiements Mensuels
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyPaymentHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Montant"]}
                />
                <Bar dataKey="montant" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Élèves par Genre
          </h2>
          <div className="h-64">
            {data.studentsByGender.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.studentsByGender}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {data.studentsByGender.map((_, index) => (
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
              <div className="h-full flex items-center justify-center text-gray-400">
                Aucune donnée disponible
              </div>
            )}
          </div>
        </div>
      </div>

      {data.recentEnrollments.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Inscriptions Récentes
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-3 font-medium">Élève</th>
                  <th className="pb-3 font-medium">Matricule</th>
                  <th className="pb-3 font-medium">Classe</th>
                  <th className="pb-3 font-medium">Année</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {data.recentEnrollments.map((enrollment) => (
                  <tr
                    key={enrollment.id}
                    className="border-b border-gray-50 last:border-0"
                  >
                    <td className="py-3 font-medium text-gray-900">
                      {enrollment.student.firstName} {enrollment.student.lastName}
                    </td>
                    <td className="py-3 text-gray-500">
                      {enrollment.student.matricule}
                    </td>
                    <td className="py-3 text-gray-700">{enrollment.class.name}</td>
                    <td className="py-3 text-gray-500">
                      {enrollment.schoolYear.name}
                    </td>
                    <td className="py-3 text-gray-500">
                      {new Date(enrollment.enrollmentDate).toLocaleDateString(
                        "fr-FR"
                      )}
                    </td>
                    <td className="py-3">
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
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
