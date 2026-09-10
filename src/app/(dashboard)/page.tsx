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
  Award,
  CreditCard,
  Clock,
  CheckCircle,
} from "lucide-react";

import { useSession } from "next-auth/react";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "MGA",
    maximumFractionDigits: 0,
  }).format(amount);
}

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

function StatCard({ label, value, icon: Icon, bg, light }: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  bg: string;
  light: string;
}) {
  return (
    <div className={`${light} rounded-xl p-5 border border-gray-100`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`${bg} w-12 h-12 rounded-xl flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ data }: { data: any }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Élèves" value={data.totalStudents || 0} icon={GraduationCap} bg="bg-blue-500" light="bg-blue-50" />
        <StatCard label="Total Enseignants" value={data.totalTeachers || 0} icon={Users} bg="bg-green-500" light="bg-green-50" />
        <StatCard label="Total Classes" value={data.totalClasses || 0} icon={BookOpen} bg="bg-purple-500" light="bg-purple-50" />
        <StatCard label="Absences Aujourd'hui" value={data.todayAbsences || 0} icon={AlertTriangle} bg="bg-red-500" light="bg-red-50" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Paiements Reçus" value={formatCurrency(data.totalPayments || 0)} icon={DollarSign} bg="bg-emerald-500" light="bg-emerald-50" />
        <StatCard label="Montant Impayés" value={formatCurrency(data.unpaidAmount || 0)} icon={TrendingUp} bg="bg-orange-500" light="bg-orange-50" />
        <StatCard label="Inscriptions Récentes" value={(data.recentEnrollments || []).length} icon={FileText} bg="bg-indigo-500" light="bg-indigo-50" />
        <StatCard label="Paiements ce Mois" value={formatCurrency(data.monthlyPayments?.total || 0)} icon={CreditCard} bg="bg-cyan-500" light="bg-cyan-50" />
      </div>
      {data.recentEnrollments && data.recentEnrollments.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Inscriptions Récentes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-3 font-medium">Élève</th>
                  <th className="pb-3 font-medium">Matricule</th>
                  <th className="pb-3 font-medium">Classe</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {data.recentEnrollments.map((e: any) => (
                  <tr key={e.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 font-medium text-gray-900">{e.student?.firstName} {e.student?.lastName}</td>
                    <td className="py-3 text-gray-500">{e.student?.matricule}</td>
                    <td className="py-3 text-gray-700">{e.class?.name}</td>
                    <td className="py-3 text-gray-500">{new Date(e.enrollmentDate).toLocaleDateString("fr-FR")}</td>
                    <td className="py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        e.status === "VALIDATED" ? "bg-green-100 text-green-700" :
                        e.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {e.status === "VALIDATED" ? "Validée" : e.status === "PENDING" ? "En attente" : e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

function TeacherDashboard({ data }: { data: any }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Mes Classes" value={data.totalClasses || 0} icon={BookOpen} bg="bg-blue-500" light="bg-blue-50" />
        <StatCard label="Mes Élèves" value={data.totalStudents || 0} icon={GraduationCap} bg="bg-green-500" light="bg-green-50" />
        <StatCard label="Notes Saisies" value={data.totalGrades || 0} icon={Award} bg="bg-purple-500" light="bg-purple-50" />
        <StatCard label="Moyenne Générale" value={data.averageScore ? `${Number(data.averageScore).toFixed(1)}/20` : "-"} icon={TrendingUp} bg="bg-orange-500" light="bg-orange-50" />
      </div>
      {data.recentGrades && data.recentGrades.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dernières Notes Saisies</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-3 font-medium">Élève</th>
                  <th className="pb-3 font-medium">Matière</th>
                  <th className="pb-3 font-medium">Note</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentGrades.map((g: any) => (
                  <tr key={g.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 font-medium text-gray-900">{g.student?.firstName} {g.student?.lastName}</td>
                    <td className="py-3 text-gray-700">{g.subject?.name}</td>
                    <td className="py-3">
                      <span className={`font-semibold ${g.score >= 10 ? "text-green-600" : "text-red-600"}`}>
                        {g.score}/{g.maxScore || 20}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500">{new Date(g.evaluationDate).toLocaleDateString("fr-FR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

function StudentDashboard({ data }: { data: any }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Moyenne Générale" value={data.averageScore ? `${Number(data.averageScore).toFixed(1)}/20` : "-"} icon={Award} bg="bg-blue-500" light="bg-blue-50" />
        <StatCard label="Nombre de Notes" value={data.totalGrades || 0} icon={FileText} bg="bg-green-500" light="bg-green-50" />
        <StatCard label="Absences" value={data.absencesCount || 0} icon={AlertTriangle} bg="bg-red-500" light="bg-red-50" />
        <StatCard label="Derniers Paiements" value={(data.recentPayments || []).length} icon={CreditCard} bg="bg-purple-500" light="bg-purple-50" />
      </div>
      {data.grades && data.grades.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Mes Dernières Notes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-3 font-medium">Matière</th>
                  <th className="pb-3 font-medium">Note</th>
                  <th className="pb-3 font-medium">Trimestre</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.grades.map((g: any) => (
                  <tr key={g.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 font-medium text-gray-900">{g.subject?.name}</td>
                    <td className="py-3">
                      <span className={`font-semibold ${g.score >= 10 ? "text-green-600" : "text-red-600"}`}>
                        {g.score}/{g.maxScore || 20}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500">{g.term?.name}</td>
                    <td className="py-3 text-gray-500">{new Date(g.evaluationDate).toLocaleDateString("fr-FR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

function SecretaryDashboard({ data }: { data: any }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Élèves" value={data.totalStudents || 0} icon={GraduationCap} bg="bg-blue-500" light="bg-blue-50" />
        <StatCard label="Inscriptions En Attente" value={data.pendingEnrollments || 0} icon={Clock} bg="bg-yellow-500" light="bg-yellow-50" />
        <StatCard label="Inscriptions Validées" value={data.validatedEnrollments || 0} icon={CheckCircle} bg="bg-green-500" light="bg-green-50" />
        <StatCard label="Inscriptions Récentes" value={(data.recentEnrollments || []).length} icon={FileText} bg="bg-purple-500" light="bg-purple-50" />
      </div>
      {data.recentEnrollments && data.recentEnrollments.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dernières Inscriptions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-3 font-medium">Élève</th>
                  <th className="pb-3 font-medium">Matricule</th>
                  <th className="pb-3 font-medium">Classe</th>
                  <th className="pb-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {data.recentEnrollments.map((e: any) => (
                  <tr key={e.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 font-medium text-gray-900">{e.student?.firstName} {e.student?.lastName}</td>
                    <td className="py-3 text-gray-500">{e.student?.matricule}</td>
                    <td className="py-3 text-gray-700">{e.class?.name}</td>
                    <td className="py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        e.status === "VALIDATED" ? "bg-green-100 text-green-700" :
                        e.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {e.status === "VALIDATED" ? "Validée" : e.status === "PENDING" ? "En attente" : e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

function AccountantDashboard({ data }: { data: any }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Perçu" value={formatCurrency(data.totalPaid || 0)} icon={DollarSign} bg="bg-green-500" light="bg-green-50" />
        <StatCard label="Transactions" value={data.totalTransactions || 0} icon={CreditCard} bg="bg-blue-500" light="bg-blue-50" />
        <StatCard label="Ce Mois" value={formatCurrency(data.monthlyTotal || 0)} icon={TrendingUp} bg="bg-purple-500" light="bg-purple-50" />
        <StatCard label="Nb Paiements Mois" value={data.monthlyCount || 0} icon={FileText} bg="bg-orange-500" light="bg-orange-50" />
      </div>
      {data.paymentTypeSummary && data.paymentTypeSummary.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recettes par Type</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-3 font-medium">Type de Frais</th>
                  <th className="pb-3 font-medium">Montant Reçu</th>
                  <th className="pb-3 font-medium">Nombre</th>
                </tr>
              </thead>
              <tbody>
                {data.paymentTypeSummary.map((pt: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 font-medium text-gray-900">{pt.name}</td>
                    <td className="py-3 text-green-600 font-semibold">{formatCurrency(pt.totalReceived)}</td>
                    <td className="py-3 text-gray-500">{pt.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
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

  const role = (session?.user as any)?.role;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-500 mt-1">
          {role === "TEACHER" && "Vue d'ensemble de vos classes et enseignements"}
          {role === "STUDENT" && "Vue d'ensemble de vos résultats et paiements"}
          {role === "SECRETARY" && "Gestion des inscriptions et des élèves"}
          {role === "ACCOUNTANT" && "Suivi des paiements et finances"}
          {(role === "ADMIN" || role === "DIRECTOR") && "Vue d'ensemble de votre établissement scolaire"}
        </p>
      </div>

      {role === "ADMIN" || role === "DIRECTOR" ? <AdminDashboard data={data} /> : null}
      {role === "TEACHER" ? <TeacherDashboard data={data} /> : null}
      {role === "STUDENT" ? <StudentDashboard data={data} /> : null}
      {role === "SECRETARY" ? <SecretaryDashboard data={data} /> : null}
      {role === "ACCOUNTANT" ? <AccountantDashboard data={data} /> : null}
    </div>
  );
}
