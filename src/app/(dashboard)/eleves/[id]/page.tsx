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
  Wallet,
  TrendingUp,
  Receipt,
  Banknote,
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
  { id: "ecolage", label: "Écolage", icon: CreditCard },
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

  const [ecolageData, setEcolageData] = useState<any>(null);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [ecolageLoading, setEcolageLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

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

  const fetchEcolage = useCallback(async () => {
    if (activeTab !== "ecolage") return;
    setEcolageLoading(true);
    try {
      const [ecolageRes, paymentsRes] = await Promise.all([
        fetch(`/api/ecolage?studentId=${id}`),
        fetch(`/api/paiements?studentId=${id}&limit=10`),
      ]);
      const ecolageJson = await ecolageRes.json();
      const paymentsJson = await paymentsRes.json();
      if (ecolageJson.data && ecolageJson.data.length > 0) {
        setEcolageData(ecolageJson.data[0]);
      }
      setRecentPayments(paymentsJson.data || []);
    } catch {
      setEcolageData(null);
      setRecentPayments([]);
    } finally {
      setEcolageLoading(false);
    }
  }, [activeTab, id]);

  useEffect(() => {
    fetchEcolage();
  }, [fetchEcolage]);

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

          {activeTab === "ecolage" && (
            <div className="space-y-6">
              {ecolageLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                  <span className="ml-2 text-sm text-gray-500">
                    Chargement des données d&apos;écolage...
                  </span>
                </div>
              ) : ecolageData ? (
                (() => {
                  const fmt = (v: number) =>
                    new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "MGA",
                      minimumFractionDigits: 0,
                    }).format(v);

                  const totalDue = ecolageData.totalDue as number;
                  const totalPaid = ecolageData.totalPaid as number;
                  const remaining = Math.max(0, totalDue - totalPaid);
                  const collectionRate =
                    totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;
                  const monthlyAmount = totalDue / 10;

                  const monthNames = [
                    "Septembre",
                    "Octobre",
                    "Novembre",
                    "Décembre",
                    "Janvier",
                    "Février",
                    "Mars",
                    "Avril",
                    "Mai",
                    "Juin",
                  ];
                  const monthKeys = [
                    "09",
                    "10",
                    "11",
                    "12",
                    "01",
                    "02",
                    "03",
                    "04",
                    "05",
                    "06",
                  ];

                  const studentPayments = (ecolageData.payments || []) as {
                    id: string;
                    amount: number;
                    paymentDate: string;
                    paymentType?: { id: string; name: string; amount: number };
                    paymentMethod: string;
                    reference?: string | null;
                  }[];

                  const monthlyData = monthNames.map((name, idx) => {
                    const key = monthKeys[idx];
                    const monthPayments = studentPayments.filter((p) => {
                      const d = new Date(p.paymentDate);
                      const m = String(d.getMonth() + 1).padStart(2, "0");
                      return m === key;
                    });
                    const paid = monthPayments.reduce(
                      (s, p) => s + p.amount,
                      0
                    );
                    const rest = Math.max(0, monthlyAmount - paid);
                    let status: "paye" | "partiel" | "impaye";
                    if (paid >= monthlyAmount) status = "paye";
                    else if (paid > 0) status = "partiel";
                    else status = "impaye";
                    return {
                      name,
                      key,
                      due: monthlyAmount,
                      paid,
                      rest,
                      status,
                      payments: monthPayments,
                    };
                  });

                  const handlePayMonth = (monthKey: string) => {
                    setSelectedMonth(monthKey);
                    setPaymentModalOpen(true);
                  };

                  return (
                    <>
                      {/* Summary Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">
                              Total annuel à payer
                            </p>
                            <p className="text-base font-bold text-gray-900">
                              {fmt(totalDue)}
                            </p>
                          </div>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                            <Banknote className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Total payé</p>
                            <p className="text-base font-bold text-green-600">
                              {fmt(totalPaid)}
                            </p>
                          </div>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                            <Receipt className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">
                              Reste à payer
                            </p>
                            <p className="text-base font-bold text-red-600">
                              {fmt(remaining)}
                            </p>
                          </div>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500">
                              Taux de recouvrement
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    collectionRate >= 80
                                      ? "bg-green-500"
                                      : collectionRate >= 50
                                        ? "bg-amber-500"
                                        : "bg-red-500"
                                  }`}
                                  style={{ width: `${Math.min(collectionRate, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm font-bold text-gray-900">
                                {collectionRate}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Payment Type Breakdown */}
                      {ecolageData.paymentTypeBreakdown &&
                        ecolageData.paymentTypeBreakdown.length > 0 && (
                          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                              <h4 className="text-sm font-medium text-gray-700">
                                Détail par type de frais
                              </h4>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-left text-gray-500 border-b border-gray-100">
                                    <th className="px-4 py-2 font-medium">
                                      Type
                                    </th>
                                    <th className="px-4 py-2 font-medium text-right">
                                      Montant dû
                                    </th>
                                    <th className="px-4 py-2 font-medium text-right">
                                      Payé
                                    </th>
                                    <th className="px-4 py-2 font-medium text-right">
                                      Reste
                                    </th>
                                    <th className="px-4 py-2 font-medium text-center">
                                      Statut
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ecolageData.paymentTypeBreakdown.map(
                                    (pt: any) => {
                                      const ptRemaining = Math.max(
                                        0,
                                        pt.totalDue - pt.totalPaid
                                      );
                                      const ptStatus =
                                        ptRemaining <= 0
                                          ? "paye"
                                          : pt.totalPaid > 0
                                            ? "partiel"
                                            : "impaye";
                                      return (
                                        <tr
                                          key={pt.paymentTypeId}
                                          className="border-b border-gray-50 last:border-0"
                                        >
                                          <td className="px-4 py-2 font-medium text-gray-900">
                                            {pt.name}
                                          </td>
                                          <td className="px-4 py-2 text-right text-gray-700">
                                            {fmt(pt.totalDue)}
                                          </td>
                                          <td className="px-4 py-2 text-right text-green-600 font-medium">
                                            {fmt(pt.totalPaid)}
                                          </td>
                                          <td className="px-4 py-2 text-right text-red-600 font-medium">
                                            {fmt(ptRemaining)}
                                          </td>
                                          <td className="px-4 py-2 text-center">
                                            <span
                                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                                ptStatus === "paye"
                                                  ? "bg-green-100 text-green-700"
                                                  : ptStatus === "partiel"
                                                    ? "bg-amber-100 text-amber-700"
                                                    : "bg-red-100 text-red-700"
                                              }`}
                                            >
                                              {ptStatus === "paye"
                                                ? "Payé"
                                                : ptStatus === "partiel"
                                                  ? "Partiel"
                                                  : "Impayé"}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    }
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                      {/* Monthly Payments Table */}
                      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                          <h4 className="text-sm font-medium text-gray-700">
                            Échéancier mensuel (Septembre - Juin)
                          </h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-gray-500 border-b border-gray-100">
                                <th className="px-4 py-3 font-medium">Mois</th>
                                <th className="px-4 py-3 font-medium text-right">
                                  Montant dû
                                </th>
                                <th className="px-4 py-3 font-medium text-right">
                                  Montant payé
                                </th>
                                <th className="px-4 py-3 font-medium text-right">
                                  Reste
                                </th>
                                <th className="px-4 py-3 font-medium text-center">
                                  Statut
                                </th>
                                <th className="px-4 py-3 font-medium text-center">
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {monthlyData.map((m) => (
                                <tr
                                  key={m.key}
                                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                                >
                                  <td className="px-4 py-3 font-medium text-gray-900">
                                    {m.name}
                                  </td>
                                  <td className="px-4 py-3 text-right text-gray-700">
                                    {fmt(m.due)}
                                  </td>
                                  <td className="px-4 py-3 text-right font-medium text-green-600">
                                    {fmt(m.paid)}
                                  </td>
                                  <td className="px-4 py-3 text-right font-medium text-red-600">
                                    {fmt(m.rest)}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                        m.status === "paye"
                                          ? "bg-green-100 text-green-700"
                                          : m.status === "partiel"
                                            ? "bg-amber-100 text-amber-700"
                                            : "bg-red-100 text-red-700"
                                      }`}
                                    >
                                      {m.status === "paye"
                                        ? "Payé"
                                        : m.status === "partiel"
                                          ? "Partiel"
                                          : "Impayé"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {m.status !== "paye" && (
                                      <button
                                        onClick={() => handlePayMonth(m.key)}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                                      >
                                        <Plus className="w-3 h-3" />
                                        Payer
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Recent Payments */}
                      {recentPayments.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                            <h4 className="text-sm font-medium text-gray-700">
                              Derniers paiements
                            </h4>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-gray-500 border-b border-gray-100">
                                  <th className="px-4 py-2 font-medium">
                                    Date
                                  </th>
                                  <th className="px-4 py-2 font-medium">
                                    Type
                                  </th>
                                  <th className="px-4 py-2 font-medium text-right">
                                    Montant
                                  </th>
                                  <th className="px-4 py-2 font-medium hidden sm:table-cell">
                                    Mode
                                  </th>
                                  <th className="px-4 py-2 font-medium hidden md:table-cell">
                                    Référence
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {recentPayments.map((p: any) => (
                                  <tr
                                    key={p.id}
                                    className="border-b border-gray-50 last:border-0"
                                  >
                                    <td className="px-4 py-2 text-gray-700">
                                      {new Date(
                                        p.paymentDate
                                      ).toLocaleDateString("fr-FR")}
                                    </td>
                                    <td className="px-4 py-2 font-medium text-gray-900">
                                      {p.paymentType?.name || "—"}
                                    </td>
                                    <td className="px-4 py-2 text-right font-semibold text-green-600">
                                      {fmt(p.amount)}
                                    </td>
                                    <td className="px-4 py-2 text-gray-500 hidden sm:table-cell">
                                      {paymentMethodLabels[p.paymentMethod] ||
                                        p.paymentMethod}
                                    </td>
                                    <td className="px-4 py-2 text-gray-500 hidden md:table-cell font-mono text-xs">
                                      {p.reference || "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Payment Modal */}
                      <PaymentModal
                        isOpen={paymentModalOpen}
                        onClose={() => {
                          setPaymentModalOpen(false);
                          setSelectedMonth(null);
                        }}
                        studentId={student.id}
                        onSuccess={() => {
                          fetchEcolage();
                          fetchStudent();
                        }}
                      />
                    </>
                  );
                })()
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <CreditCard className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-sm">
                    Aucune donnée d&apos;écolage disponible
                  </p>
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
