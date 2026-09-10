"use client";

import { useEffect, useState, useCallback } from "react";
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
  Pencil,
  Plus,
  FileText,
} from "lucide-react";
import StudentModal from "@/components/modals/student-modal";
import PaymentModal from "@/components/modals/payment-modal";
import type { Student, Enrollment, Grade, Payment, Attendance } from "@/types";

interface StudentDetail extends Student {
  enrollments?: (Enrollment & {
    class?: { name: string };
    schoolYear?: { name: string };
  })[];
  grades?: (Grade & {
    subject?: { name: string };
    term?: { name: string };
  })[];
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

const paymentMethodLabels: Record<string, string> = {
  CASH: "Espèces",
  BANK_TRANSFER: "Virement",
  MOBILE_MONEY: "Mobile Money",
  CREDIT_CARD: "Carte bancaire",
};

const evaluationTypeLabels: Record<string, string> = {
  HOMEWORK: "Devoir",
  QUIZ: "Contrôle",
  EXAM: "Examen",
  PARTICIPATION: "Participation",
  PROJECT: "Projet",
};

const tabs = [
  { id: "info", label: "Informations", icon: User },
  { id: "notes", label: "Notes", icon: Award },
  { id: "paiements", label: "Paiements", icon: CreditCard },
  { id: "absences", label: "Absences", icon: ClipboardCheck },
  { id: "inscriptions", label: "Inscriptions", icon: FileText },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function EleveDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<TabId>("info");
  const [termFilter, setTermFilter] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const fetchStudent = useCallback(async () => {
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
  }, [id]);

  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

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
  const allGrades = student.grades || [];
  const allPayments = student.payments || [];
  const attendanceList = student.attendance || [];

  const filteredGrades = termFilter
    ? allGrades.filter((g) => g.termId === termFilter)
    : allGrades;

  const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

  const presentCount = attendanceList.filter(
    (a) => a.status === "PRESENT"
  ).length;
  const absentCount = attendanceList.filter(
    (a) => a.status === "ABSENT"
  ).length;
  const lateCount = attendanceList.filter((a) => a.status === "LATE").length;
  const attendanceRate =
    attendanceList.length > 0
      ? Math.round((presentCount / attendanceList.length) * 100)
      : 0;

  const uniqueTerms = Array.from(
    new Set(allGrades.map((g) => g.termId).filter(Boolean))
  ).map((termId) => {
    const grade = allGrades.find((g) => g.termId === termId);
    return { id: termId, name: grade?.term?.name || termId };
  });

  const groupedGrades: {
    subjectName: string;
    grades: Grade[];
    average: number;
  }[] = [];
  const subjectMap = new Map<string, Grade[]>();
  for (const g of filteredGrades) {
    const key = g.subjectId;
    if (!subjectMap.has(key)) subjectMap.set(key, []);
    subjectMap.get(key)!.push(g);
  }
  for (const [, grades] of subjectMap) {
    const subjectName = grades[0]?.subject?.name || "—";
    const totalCoeff = grades.reduce((s, g) => s + g.coefficient, 0);
    const weightedSum = grades.reduce(
      (s, g) => s + (g.score / g.maxScore) * 20 * g.coefficient,
      0
    );
    const average = totalCoeff > 0 ? weightedSum / totalCoeff : 0;
    groupedGrades.push({ subjectName, grades, average });
  }

  const overallAverage =
    groupedGrades.length > 0
      ? groupedGrades.reduce((s, g) => s + g.average, 0) / groupedGrades.length
      : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/eleves")}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            {student.photo ? (
              <img
                src={student.photo}
                alt={`${student.firstName} ${student.lastName}`}
                className="w-14 h-14 rounded-full object-cover border-2 border-indigo-100"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-600">
                {student.firstName[0]}
                {student.lastName[0]}
              </div>
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  {student.firstName} {student.lastName}
                </h1>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {student.matricule}
                </span>
                {latestEnrollment?.class?.name && (
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                    {latestEnrollment.class.name}
                  </span>
                )}
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    student.user?.isActive !== false
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {student.user?.isActive !== false ? "Actif" : "Inactif"}
                </span>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => setEditModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Pencil className="w-4 h-4" />
          Modifier
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Date de naissance</p>
            <p className="text-sm font-medium text-gray-900">
              {new Date(student.dateOfBirth).toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center">
            <User className="w-5 h-5 text-pink-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Sexe</p>
            <p className="text-sm font-medium text-gray-900">
              {genderLabels[student.gender]}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Adresse</p>
            <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
              {student.address || "—"}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <Phone className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Téléphone</p>
            <p className="text-sm font-medium text-gray-900">
              {student.phone || "—"}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
            <Mail className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Email</p>
            <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
              {student.email || "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "text-indigo-600 border-b-2 border-indigo-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === "info" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Informations personnelles
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Nom complet</p>
                    <p className="font-medium text-gray-900">
                      {student.firstName} {student.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Matricule</p>
                    <p className="font-medium text-gray-900 font-mono">
                      {student.matricule}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Date de naissance</p>
                    <p className="font-medium text-gray-900">
                      {new Date(student.dateOfBirth).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Sexe</p>
                    <p className="font-medium text-gray-900">
                      {genderLabels[student.gender]}
                    </p>
                  </div>
                  {student.placeOfBirth && (
                    <div>
                      <p className="text-xs text-gray-500">Lieu de naissance</p>
                      <p className="font-medium text-gray-900">
                        {student.placeOfBirth}
                      </p>
                    </div>
                  )}
                  {student.nationality && (
                    <div>
                      <p className="text-xs text-gray-500">Nationalité</p>
                      <p className="font-medium text-gray-900">
                        {student.nationality}
                      </p>
                    </div>
                  )}
                  {student.bloodGroup && (
                    <div>
                      <p className="text-xs text-gray-500">Groupe sanguin</p>
                      <p className="font-medium text-gray-900">
                        {student.bloodGroup}
                      </p>
                    </div>
                  )}
                  {student.phone && (
                    <div>
                      <p className="text-xs text-gray-500">Téléphone</p>
                      <p className="font-medium text-gray-900">
                        {student.phone}
                      </p>
                    </div>
                  )}
                  {student.email && (
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="font-medium text-gray-900">
                        {student.email}
                      </p>
                    </div>
                  )}
                  {student.address && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-gray-500">Adresse</p>
                      <p className="font-medium text-gray-900">
                        {student.address}
                      </p>
                    </div>
                  )}
                  {student.medicalNotes && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-gray-500">Notes médicales</p>
                      <p className="font-medium text-gray-900">
                        {student.medicalNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-indigo-500" />
                  Parent / Tuteur
                </h3>
                {student.parentName || student.parentPhone ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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
                        <p className="text-xs text-gray-500">Lien de parenté</p>
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
                ) : (
                  <p className="text-sm text-gray-400">
                    Aucune information parent/tuteur enregistrée
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === "notes" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-medium text-gray-700">
                    Notes et évaluations
                  </h3>
                  {uniqueTerms.length > 0 && (
                    <select
                      value={termFilter}
                      onChange={(e) => setTermFilter(e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Tous les trimestres</option>
                      {uniqueTerms.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Moyenne générale</p>
                  <p
                    className={`text-lg font-bold ${
                      overallAverage >= 10 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {overallAverage.toFixed(2)}/20
                  </p>
                </div>
              </div>

              {filteredGrades.length > 0 ? (
                <div className="space-y-4">
                  {groupedGrades.map((group) => (
                    <div
                      key={group.subjectName}
                      className="border border-gray-100 rounded-lg overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-700">
                          {group.subjectName}
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            group.average >= 10
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          Moy: {group.average.toFixed(2)}/20
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-500 border-b border-gray-50">
                              <th className="px-4 py-2 font-medium">Type</th>
                              <th className="px-4 py-2 font-medium">Note</th>
                              <th className="px-4 py-2 font-medium">Coeff</th>
                              <th className="px-4 py-2 font-medium hidden sm:table-cell">
                                Moyenne
                              </th>
                              <th className="px-4 py-2 font-medium hidden md:table-cell">
                                Date
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.grades.map((grade) => (
                              <tr
                                key={grade.id}
                                className="border-b border-gray-50 last:border-0"
                              >
                                <td className="px-4 py-2 text-gray-700">
                                  {evaluationTypeLabels[grade.evaluationType] ||
                                    grade.evaluationType}
                                  {grade.evaluationName && (
                                    <span className="text-gray-400 ml-1">
                                      - {grade.evaluationName}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2">
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
                                <td className="px-4 py-2 text-gray-500">
                                  {grade.coefficient}
                                </td>
                                <td className="px-4 py-2 font-medium text-gray-900 hidden sm:table-cell">
                                  {(
                                    (grade.score / grade.maxScore) *
                                    20
                                  ).toFixed(2)}
                                  /20
                                </td>
                                <td className="px-4 py-2 text-gray-500 hidden md:table-cell">
                                  {new Date(
                                    grade.evaluationDate
                                  ).toLocaleDateString("fr-FR")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <Award className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-sm">Aucune note enregistrée</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "paiements" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-green-50 rounded-lg px-4 py-2">
                    <p className="text-xs text-green-600">Total payé</p>
                    <p className="text-lg font-bold text-green-700">
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "MGA",
                        maximumFractionDigits: 0,
                      }).format(totalPaid)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-4 py-2">
                    <p className="text-xs text-gray-500">Nombre de paiements</p>
                    <p className="text-lg font-bold text-gray-700">
                      {allPayments.length}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPaymentModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un paiement
                </button>
              </div>

              {allPayments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/50">
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Montant</th>
                        <th className="px-4 py-3 font-medium hidden sm:table-cell">
                          Date
                        </th>
                        <th className="px-4 py-3 font-medium hidden md:table-cell">
                          Mode
                        </th>
                        <th className="px-4 py-3 font-medium hidden lg:table-cell">
                          Référence
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {allPayments.map((payment) => (
                        <tr
                          key={payment.id}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {payment.paymentType?.name || "—"}
                          </td>
                          <td className="px-4 py-3 font-semibold text-green-600">
                            {new Intl.NumberFormat("fr-FR", {
                              style: "currency",
                              currency: "MGA",
                              maximumFractionDigits: 0,
                            }).format(payment.amount)}
                          </td>
                          <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                            {new Date(
                              payment.paymentDate
                            ).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                            {paymentMethodLabels[payment.paymentMethod] ||
                              payment.paymentMethod}
                          </td>
                          <td className="px-4 py-3 text-gray-500 hidden lg:table-cell font-mono text-xs">
                            {payment.reference || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <CreditCard className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-sm">Aucun paiement enregistré</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "absences" && (
            <div className="space-y-4">
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
                  <p className="text-xs text-gray-600">Taux de présence</p>
                </div>
              </div>

              {attendanceList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/50">
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Statut</th>
                        <th className="px-4 py-3 font-medium hidden sm:table-cell">
                          Motif
                        </th>
                        <th className="px-4 py-3 font-medium hidden md:table-cell">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceList.map((att) => (
                        <tr
                          key={att.id}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                        >
                          <td className="px-4 py-3 text-gray-700">
                            {new Date(att.date).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                statusColors[att.status] || ""
                              }`}
                            >
                              {statusLabels[att.status] || att.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                            {att.reason || "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                            {att.notes || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <ClipboardCheck className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-sm">Aucune donnée de présence</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "inscriptions" && (
            <div className="space-y-4">
              {student.enrollments && student.enrollments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/50">
                        <th className="px-4 py-3 font-medium">Année Scolaire</th>
                        <th className="px-4 py-3 font-medium">Classe</th>
                        <th className="px-4 py-3 font-medium hidden sm:table-cell">
                          Date Inscription
                        </th>
                        <th className="px-4 py-3 font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {student.enrollments.map((enrollment) => (
                        <tr
                          key={enrollment.id}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                        >
                          <td className="px-4 py-3 text-gray-700">
                            {enrollment.schoolYear?.name || "—"}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {enrollment.class?.name || "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                            {new Date(
                              enrollment.enrollmentDate
                            ).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="px-4 py-3">
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
                <div className="text-center py-10 text-gray-400">
                  <FileText className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-sm">Aucune inscription enregistrée</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <StudentModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        student={student}
        onSuccess={fetchStudent}
      />
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        studentId={student.id}
        onSuccess={fetchStudent}
      />
    </div>
  );
}
