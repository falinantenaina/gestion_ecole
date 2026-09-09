"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  Filter,
} from "lucide-react";
import StudentModal from "@/components/modals/student-modal";
import type { Student, PaginatedResponse } from "@/types";

type StudentRow = Student & {
  enrollments?: { class?: { name: string } }[];
  user?: { isActive: boolean };
};

const ITEMS_PER_PAGE = 10;

export default function ElevesPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: ITEMS_PER_PAGE,
    totalPages: 0,
  });

  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(ITEMS_PER_PAGE),
      });
      if (search) params.set("search", search);
      if (genderFilter) params.set("gender", genderFilter);

      const res = await fetch(`/api/eleves?${params.toString()}`);
      const data = (await res.json()) as PaginatedResponse<StudentRow>;
      setStudents(data.data || []);
      setPagination(data.pagination);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, genderFilter]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, genderFilter]);

  function handleEdit(student: StudentRow) {
    setEditingStudent(student);
    setModalOpen(true);
  }

  function handleCreate() {
    setEditingStudent(null);
    setModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Êtes-vous sûr de vouloir désactiver cet élève ?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/eleves/${id}`, { method: "DELETE" });
      fetchStudents();
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("fr-FR");
  }

  const totalPages = pagination.totalPages;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-indigo-600" />
            Gestion des Élèves
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {pagination.total} élève{pagination.total !== 1 ? "s" : ""} au total
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvel Élève
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, matricule..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="">Tous les genres</option>
                <option value="MALE">Masculin</option>
                <option value="FEMALE">Féminin</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            <span className="ml-2 text-sm text-gray-500">Chargement...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Users className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium">Aucun élève trouvé</p>
            <p className="text-xs mt-1">
              {search || genderFilter
                ? "Essayez de modifier vos filtres"
                : "Commencez par ajouter un élève"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-3 font-medium">Matricule</th>
                  <th className="px-4 py-3 font-medium">Nom</th>
                  <th className="px-4 py-3 font-medium">Prénom</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">
                    Sexe
                  </th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">
                    Classe
                  </th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">
                    Date Naissance
                  </th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        {student.matricule}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {student.lastName}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {student.firstName}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          student.gender === "MALE"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-pink-100 text-pink-700"
                        }`}
                      >
                        {student.gender === "MALE" ? "M" : "F"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      {student.enrollments?.[0]?.class?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                      {formatDate(student.dateOfBirth)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/eleves/${student.id}`}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Voir détails"
                        >
                          <GraduationCap className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleEdit(student)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          disabled={deletingId === student.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Désactiver"
                        >
                          {deletingId === student.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Page {pagination.page} sur {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                      currentPage === pageNum
                        ? "bg-indigo-600 text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <StudentModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingStudent(null);
        }}
        student={editingStudent}
        onSuccess={fetchStudents}
      />
    </div>
  );
}
