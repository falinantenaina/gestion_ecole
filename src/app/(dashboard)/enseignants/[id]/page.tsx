"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Users,
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  Calendar,
  BookOpen,
  Award,
  Loader2,
  AlertCircle,
  Briefcase,
  Plus,
  X,
} from "lucide-react";
import type { Teacher, Grade, TeacherSubject, TeacherClass, User, Class } from "@/types";

interface TeacherDetail extends Omit<Teacher, "user"> {
  user?: User;
  teacherSubjects?: (TeacherSubject & { subject?: { name: string; code: string } })[];
  teacherClasses?: (TeacherClass & { class?: { name: string; level: string } })[];
  grades?: (Grade & { student?: { firstName: string; lastName: string }; subject?: { name: string } })[];
}

export default function EnseignantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: session } = useSession();

  const [teacher, setTeacher] = useState<TeacherDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Class assignment
  const [showClassModal, setShowClassModal] = useState(false);
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [assigningClass, setAssigningClass] = useState(false);
  const [removingClassId, setRemovingClassId] = useState<string | null>(null);

  const fetchTeacher = async () => {
    try {
      const res = await fetch(`/api/enseignants/${id}`);
      if (!res.ok) throw new Error("Enseignant non trouvé");
      const data = await res.json();
      setTeacher(data);
    } catch {
      setError("Erreur lors du chargement des données de l'enseignant");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacher();
  }, [id]);

  const fetchAllClasses = async () => {
    try {
      const res = await fetch("/api/classes?limit=500");
      const data = await res.json();
      setAllClasses(data.data || []);
    } catch {
      setAllClasses([]);
    }
  };

  useEffect(() => {
    if (showClassModal) {
      fetchAllClasses();
    }
  }, [showClassModal]);

  async function handleAssignClass() {
    if (!selectedClassId) return;
    setAssigningClass(true);
    try {
      const res = await fetch("/api/teacher-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId: id, classId: selectedClassId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erreur lors de l'assignation");
        return;
      }
      setShowClassModal(false);
      setSelectedClassId("");
      fetchTeacher();
    } finally {
      setAssigningClass(false);
    }
  }

  async function handleRemoveClass(classId: string) {
    if (!confirm("Êtes-vous sûr de vouloir retirer cette classe ?")) return;
    setRemovingClassId(classId);
    try {
      const res = await fetch(
        `/api/teacher-classes?teacherId=${id}&classId=${classId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erreur lors du retrait");
        return;
      }
      fetchTeacher();
    } finally {
      setRemovingClassId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        <span className="ml-2 text-sm text-gray-500">Chargement...</span>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <AlertCircle className="w-12 h-12 mb-3 text-red-400" />
        <p className="text-sm font-medium">{error || "Enseignant non trouvé"}</p>
        <button
          onClick={() => router.push("/enseignants")}
          className="mt-4 text-sm text-indigo-600 hover:underline"
        >
          Retour à la liste
        </button>
      </div>
    );
  }

  const subjects = teacher.teacherSubjects?.map((ts) => ts.subject).filter(Boolean) || [];
  const classes = teacher.teacherClasses?.map((tc) => tc.class).filter(Boolean) || [];
  const recentGrades = teacher.grades?.slice(0, 10) || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/enseignants")}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600" />
            {teacher.firstName} {teacher.lastName}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Matricule : {teacher.employeeId}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col items-center text-center">
              {teacher.user?.avatar ? (
                <img
                  src={teacher.user.avatar}
                  alt={`${teacher.firstName} ${teacher.lastName}`}
                  className="w-24 h-24 rounded-full object-cover border-2 border-indigo-100"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600">
                  {teacher.firstName[0]}
                  {teacher.lastName[0]}
                </div>
              )}
              <h2 className="mt-4 text-lg font-semibold text-gray-900">
                {teacher.firstName} {teacher.lastName}
              </h2>
              <span
                className={`mt-1 inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  teacher.user?.isActive
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {teacher.user?.isActive ? "Actif" : "Inactif"}
              </span>
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center gap-3 text-gray-600">
                <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{teacher.employeeId}</span>
              </div>
              {teacher.phone && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{teacher.phone}</span>
                </div>
              )}
              {teacher.email && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{teacher.email}</span>
                </div>
              )}
              {teacher.address && (
                <div className="flex items-center gap-3 text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{teacher.address}</span>
                </div>
              )}
              {teacher.hireDate && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>
                    Embauché le{" "}
                    {new Date(teacher.hireDate).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              )}
            </div>

            {teacher.qualification && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Qualification
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {teacher.qualification}
                </p>
              </div>
            )}

            {teacher.specialization && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Spécialisation
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {teacher.specialization}
                </p>
              </div>
            )}
          </div>

          {subjects.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                Matières enseignées
              </h3>
              <div className="space-y-2">
                {subjects.map((subject) => (
                  <div
                    key={subject?.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm font-medium text-gray-900">
                      {subject?.name}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">
                      {subject?.code}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                Classes assignées
              </h3>
              {(session?.user?.role === "ADMIN" || session?.user?.role === "SECRETARY") && (
                <button
                  onClick={() => setShowClassModal(true)}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Assigner
                </button>
              )}
            </div>
            {classes.length > 0 ? (
              <div className="space-y-2">
                {classes.map((cls) => (
                  <div
                    key={cls?.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group"
                  >
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {cls?.name}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {cls?.level}
                      </span>
                    </div>
                    {(session?.user?.role === "ADMIN" || session?.user?.role === "SECRETARY") && (
                      <button
                        onClick={() => handleRemoveClass(cls!.id)}
                        disabled={removingClassId === cls?.id}
                        className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                        title="Retirer la classe"
                      >
                        {removingClassId === cls?.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <X className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Aucune classe assignée</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">
                Matières
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {subjects.length}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">
                Classes
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {classes.length}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-indigo-500" />
              Notes récentes attribuées
            </h3>
            {recentGrades.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-2 font-medium">Élève</th>
                      <th className="pb-2 font-medium">Matière</th>
                      <th className="pb-2 font-medium">Note</th>
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
                          {grade.student?.firstName} {grade.student?.lastName}
                        </td>
                        <td className="py-2.5 text-gray-700">
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
        </div>
      </div>

      {/* Assign class modal */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowClassModal(false);
              setSelectedClassId("");
            }}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Assigner une classe
              </h2>
              <button
                onClick={() => {
                  setShowClassModal(false);
                  setSelectedClassId("");
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {allClasses.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <p className="text-sm">Aucune classe disponible</p>
                </div>
              ) : (
                <>
                  <div className="text-sm text-gray-500">
                    {allClasses.length} classe{allClasses.length > 1 ? "s" : ""} disponible{allClasses.length > 1 ? "s" : ""}
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {allClasses.map((cls) => {
                      const isAssigned = classes.some((tc) => tc?.id === cls.id);
                      return (
                        <button
                          key={cls.id}
                          onClick={() => !isAssigned && setSelectedClassId(cls.id)}
                          disabled={isAssigned}
                          className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                            isAssigned
                              ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                              : selectedClassId === cls.id
                              ? "border-indigo-500 bg-indigo-50"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{cls.name}</p>
                              <p className="text-xs text-gray-500">{cls.level}{cls.section ? ` - ${cls.section}` : ""}</p>
                            </div>
                            {isAssigned && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                                Assignée
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowClassModal(false);
                  setSelectedClassId("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAssignClass}
                disabled={!selectedClassId || assigningClass}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {assigningClass && <Loader2 className="w-4 h-4 animate-spin" />}
                Assigner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
