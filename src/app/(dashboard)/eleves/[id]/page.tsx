"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  GraduationCap,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  BookOpen,
  Users,
  AlertCircle,
  Loader2,
  ClipboardCheck,
  Award,
} from "lucide-react";
import type { Student, Enrollment, Grade, Payment, Attendance } from "@/types";

interface StudentDetail extends Student {
  enrollments?: (Enrollment & { class?: { name: string }; schoolYear?: { name: string } })[];
  grades?: (Grade & { subject?: { name: string }; term?: { name: string } })[];
  payments?: (Payment & { paymentType?: { name: string } })[];
  attendance?: Attendance[];
}

const genderLabels: Record<string, string> = {
  MALE: "Masculin",
  FEMALE: "Féminin",
};

const statusLabels: Record<string, string> = {
  PRESENT: "Présent",
  ABSENT: "Absent",
  LATE: "En retard",
  JUSTIFIED_ABSENT: "Absent justifié",
};

const statusColors: Record<string, string> = {
  PRESENT: "bg-green-100 text-green-700",
  ABSENT: "bg-red-100 text-red-700",
  LATE: "bg-yellow-100 text-yellow-700",
  JUSTIFIED_ABSENT: "bg-orange-100 text-orange-700",
};

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

export default function EleveDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchStudent() {
      try {
        const res = await fetch(`/api/eleves/${id}`);
        if (!res.ok) throw new Error("Élève non trouvé");
        const data = await res.json();
        setStudent(data);
      } catch {
        setError("Erreur lors du chargement des données de l'élève");
      } finally {
        setLoading(false);
      }
    }
    fetchStudent();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        <span className="ml-2 text-sm text-gray-500">Chargement...</span>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <AlertCircle className="w-12 h-12 mb-3 text-red-400" />
        <p className="text-sm font-medium">{error || "Élève non trouvé"}</p>
        <button
          onClick={() => router.push("/eleves")}
          className="mt-4 text-sm text-indigo-600 hover:underline"
        >
          Retour à la liste
        </button>
      </div>
    );
  }

  const latestEnrollment = student.enrollments?.[0];
  const recentGrades = student.grades?.slice(0, 10) || [];
  const recentPayments = student.payments?.slice(0, 10) || [];
  const attendanceList = student.attendance || [];

  const totalDays = attendanceList.length;
  const presentCount = attendanceList.filter((a) => a.status === "PRESENT").length;
  const absentCount = attendanceList.filter((a) => a.status === "ABSENT").length;
  const lateCount = attendanceList.filter((a) => a.status === "LATE").length;
  const attendanceRate =
    totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

  const totalPaid = recentPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/eleves")}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-indigo-600" />
            {student.firstName} {student.lastName}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Matricule : {student.matricule}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col items-center text-center">
              {student.photo ? (
                <img
                  src={student.photo}
                  alt={`${student.firstName} ${student.lastName}`}
                  className="w-24 h-24 rounded-full object-cover border-2 border-indigo-100"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600">
                  {student.firstName[0]}
                  {student.lastName[0]}
                </div>
              )}
              <h2 className="mt-4 text-lg font-semibold text-gray-900">
                {student.firstName} {student.lastName}
              </h2>
              <span
                className={`mt-1 inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  student.gender === "MALE"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-pink-100 text-pink-700"
                }`}
              >
                {genderLabels[student.gender]}
              </span>
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center gap-3 text-gray-600">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>
                  Né(e) le{" "}
                  {new Date(student.dateOfBirth).toLocaleDateString("fr-FR")}
                </span>
              </div>
              {student.phone && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{student.phone}</span>
                </div>
              )}
              {student.email && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{student.email}</span>
                </div>
              )}
              {student.address && (
                <div className="flex items-center gap-3 text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{student.address}</span>
                </div>
              )}
            </div>

            {latestEnrollment && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Classe actuelle
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {latestEnrollment.class?.name || "—"}
                </p>
                <p className="text-xs text-gray-500">
                  {latestEnrollment.schoolYear?.name || ""}
                </p>
              </div>
            )}
          </div>

          {(student.parentName || student.parentPhone) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-indigo-500" />
                Parent / Tuteur
              </h3>
              <div className="space-y-3 text-sm">
                {student.parentName && (
                  <div>
                    <p className="text-xs text-gray-500">Nom complet</p>
                    <p className="font-medium text-gray-900">
                      {student.parentName}
                    </p>
                  </div>
                )}
                {student.parentRelation && (
                  <div>
                    <p className="text-xs text-gray-500">Lien</p>
                    <p className="font-medium text-gray-900">
                      {student.parentRelation}
                    </p>
                  </div>
                )}
                {student.parentPhone && (
                  <div>
                    <p className="text-xs text-gray-500">Téléphone</p>
                    <p className="font-medium text-gray-900">
                      {student.parentPhone}
                    </p>
                  </div>
                )}
                {student.parentEmail && (
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">
                      {student.parentEmail}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">
                Taux de présence
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {attendanceRate}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {totalDays} jour{totalDays !== 1 ? "s" : ""} enregistré
                {totalDays !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">
                Notes récentes
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {recentGrades.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                évaluation{recentGrades.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">
                Total payé
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                   currency: "MGA",
                   maximumFractionDigits: 0,
                 }).format(totalPaid)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              Historique des inscriptions
            </h3>
            {student.enrollments && student.enrollments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-2 font-medium">Année</th>
                      <th className="pb-2 font-medium">Classe</th>
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {student.enrollments.map((enrollment) => (
                      <tr
                        key={enrollment.id}
                        className="border-b border-gray-50 last:border-0"
                      >
                        <td className="py-2.5 text-gray-700">
                          {enrollment.schoolYear?.name || "—"}
                        </td>
                        <td className="py-2.5 font-medium text-gray-900">
                          {enrollment.class?.name || "—"}
                        </td>
                        <td className="py-2.5 text-gray-500">
                          {new Date(
                            enrollment.enrollmentDate
                          ).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              enrollmentStatusColors[enrollment.status] || ""
                            }`}
                          >
                            {enrollmentStatusLabels[enrollment.status] ||
                              enrollment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                Aucune inscription enregistrée
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-4">
              <ClipboardCheck className="w-4 h-4 text-indigo-500" />
              Présence
            </h3>
            {totalDays > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-green-700">
                      {presentCount}
                    </p>
                    <p className="text-xs text-green-600">Présent</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-red-700">
                      {absentCount}
                    </p>
                    <p className="text-xs text-red-600">Absent</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-yellow-700">
                      {lateCount}
                    </p>
                    <p className="text-xs text-yellow-600">En retard</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-gray-700">
                      {attendanceRate}%
                    </p>
                    <p className="text-xs text-gray-600">Taux</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                Aucune donnée de présence
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-indigo-500" />
              Notes récentes
            </h3>
            {recentGrades.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-2 font-medium">Matière</th>
                      <th className="pb-2 font-medium">Note</th>
                      <th className="pb-2 font-medium">Coeff.</th>
                      <th className="pb-2 font-medium hidden sm:table-cell">
                        Trimestre
                      </th>
                      <th className="pb-2 font-medium hidden sm:table-cell">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentGrades.map((grade) => (
                      <tr
                        key={grade.id}
                        className="border-b border-gray-50 last:border-0"
                      >
                        <td className="py-2.5 font-medium text-gray-900">
                          {grade.subject?.name || "—"}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`font-semibold ${
                              grade.score >= grade.maxScore * 0.5
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {grade.score}/{grade.maxScore}
                          </span>
                        </td>
                        <td className="py-2.5 text-gray-500">
                          {grade.coefficient}
                        </td>
                        <td className="py-2.5 text-gray-500 hidden sm:table-cell">
                          {grade.term?.name || "—"}
                        </td>
                        <td className="py-2.5 text-gray-500 hidden sm:table-cell">
                          {new Date(
                            grade.evaluationDate
                          ).toLocaleDateString("fr-FR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                Aucune note enregistrée
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-indigo-500" />
              Historique des paiements
            </h3>
            {recentPayments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium">Montant</th>
                      <th className="pb-2 font-medium">Mode</th>
                      <th className="pb-2 font-medium hidden sm:table-cell">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="border-b border-gray-50 last:border-0"
                      >
                        <td className="py-2.5 font-medium text-gray-900">
                          {payment.paymentType?.name || "—"}
                        </td>
                        <td className="py-2.5 font-semibold text-green-600">
                          {new Intl.NumberFormat("fr-FR", {
                            style: "currency",
                             currency: "MGA",
                             maximumFractionDigits: 0,
                           }).format(payment.amount)}
                        </td>
                        <td className="py-2.5 text-gray-500">
                          {payment.paymentMethod}
                        </td>
                        <td className="py-2.5 text-gray-500 hidden sm:table-cell">
                          {new Date(
                            payment.paymentDate
                          ).toLocaleDateString("fr-FR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                Aucun paiement enregistré
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
