"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  BookOpen,
  Filter,
  Users,
  User,
  ChevronRight,
} from "lucide-react";
import ClassModal from "@/components/modals/class-modal";
import { useSchoolYear } from "@/components/providers/school-year-provider";
import type { Class, SchoolYear, PaginatedResponse } from "@/types";

type ClassCard = Class & {
  enrollments?: { status: string }[];
  schoolYear?: SchoolYear;
  teacherClasses?: { teacher?: { firstName: string; lastName: string } }[];
  enrollmentCount?: number;
};

const ITEMS_PER_PAGE = 20;

export default function ClassesPage() {
  const router = useRouter();
  const { selectedYear } = useSchoolYear();
  const [classes, setClasses] = useState<ClassCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: ITEMS_PER_PAGE,
    totalPages: 0,
  });

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(ITEMS_PER_PAGE),
      });
      if (search) params.set("search", search);
      if (selectedYear?.id) params.set("schoolYearId", selectedYear.id);

      const res = await fetch(`/api/classes?${params.toString()}`);
      const data = (await res.json()) as PaginatedResponse<ClassCard>;
      setClasses(data.data || []);
      setPagination(data.pagination);
    } catch {
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, selectedYear?.id]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  function handleEdit(e: React.MouseEvent, classe: ClassCard) {
    e.preventDefault();
    e.stopPropagation();
    setEditingClass(classe);
    setModalOpen(true);
  }

  function handleCreate() {
    setEditingClass(null);
    setModalOpen(true);
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette classe ?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/classes/${id}`, { method: "DELETE" });
      fetchClasses();
    } finally {
      setDeletingId(null);
    }
  }

  function getEnrolledCount(classe: ClassCard): number {
    return classe.enrollmentCount ?? classe.enrollments?.length ?? 0;
  }

  function getMainTeacher(classe: ClassCard): string | null {
    const tc = classe.teacherClasses?.[0];
    if (!tc?.teacher) return null;
    return `${tc.teacher.firstName} ${tc.teacher.lastName}`;
  }

  function getCapacityPercent(classe: ClassCard): number {
    const enrolled = getEnrolledCount(classe);
    if (!classe.capacity) return 0;
    return Math.min(100, Math.round((enrolled / classe.capacity) * 100));
  }

  const totalPages = pagination.totalPages;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-indigo-600" />
            Gestion des Classes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {pagination.total} classe{pagination.total !== 1 ? "s" : ""} au total
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Classe
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, niveau..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            <span className="ml-2 text-sm text-gray-500">Chargement...</span>
          </div>
        ) : classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <BookOpen className="w-14 h-14 mb-3" />
            <p className="text-sm font-medium">Aucune classe trouvée</p>
            <p className="text-xs mt-1">
              {search
                ? "Essayez de modifier vos filtres"
                : "Commencez par ajouter une classe"}
            </p>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {classes.map((classe) => {
              const enrolled = getEnrolledCount(classe);
              const capacityPct = getCapacityPercent(classe);
              const isFull = enrolled >= classe.capacity;
              const mainTeacher = getMainTeacher(classe);

              return (
                <Link
                  key={classe.id}
                  href={`/classes/${classe.id}`}
                  className="group block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-indigo-300 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                        {classe.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {classe.level}
                        {classe.section ? ` - ${classe.section}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <button
                        onClick={(e) => handleEdit(e, classe)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors opacity-0 group-hover:opacity-100"
                        title="Modifier"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, classe.id)}
                        disabled={deletingId === classe.id}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                        title="Supprimer"
                      >
                        {deletingId === classe.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {classe.schoolYear && (
                    <div className="text-xs text-gray-500 mb-3">
                      {classe.schoolYear.name}
                    </div>
                  )}

                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                      <span>Effectif</span>
                      <span className={`font-medium ${isFull ? "text-red-600" : "text-gray-700"}`}>
                        {enrolled}/{classe.capacity}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          capacityPct >= 90
                            ? "bg-red-500"
                            : capacityPct >= 70
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${capacityPct}%` }}
                      />
                    </div>
                  </div>

                  {mainTeacher && (
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                      <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{mainTeacher}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Users className="w-3.5 h-3.5" />
                      <span>{enrolled} élève{enrolled !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium text-indigo-600 group-hover:text-indigo-700">
                      <span>Voir</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Page {pagination.page} sur {totalPages}
            </p>
            <div className="flex items-center gap-1">
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
            </div>
          </div>
        )}
      </div>

      <ClassModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingClass(null);
        }}
        classe={editingClass}
        onSuccess={fetchClasses}
      />
    </div>
  );
}
