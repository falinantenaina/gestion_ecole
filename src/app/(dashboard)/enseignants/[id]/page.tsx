"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
} from "lucide-react";
import type { Teacher, Grade, TeacherSubject, TeacherClass, User } from "@/types";

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

  const [teacher, setTeacher] = useState<TeacherDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchTeacher() {
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
    }
    fetchTeacher();
  }, [id]);

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

          {classes.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-indigo-500" />
                Classes assignées
              </h3>
              <div className="space-y-2">
                {classes.map((cls) => (
                  <div
                    key={cls?.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm font-medium text-gray-900">
                      {cls?.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {cls?.level}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
    </div>
  );
}
