"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BookOpen,
  Filter,
} from "lucide-react";
import ClassModal from "@/components/modals/class-modal";
import type { Class, SchoolYear, PaginatedResponse } from "@/types";

type ClassRow = Class & {
  enrollments?: { status: string }[];
  schoolYear?: SchoolYear;
};

const ITEMS_PER_PAGE = 10;

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: ITEMS_PER_PAGE,
    totalPages: 0,
  });

  const [search, setSearch] = useState("");
  const [schoolYearFilter, setSchoolYearFilter] = useState("");
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSchoolYears = useCallback(async () => {
    try {
      const res = await fetch("/api/school-years");
      const data = await res.json();
      setSchoolYears(data.data || []);
    } catch {
      setSchoolYears([]);
    }
  }, []);

  useEffect(() => {
    fetchSchoolYears();
  }, [fetchSchoolYears]);

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(ITEMS_PER_PAGE),
      });
      if (search) params.set("search", search);
      if (schoolYearFilter) params.set("schoolYearId", schoolYearFilter);

      const res = await fetch(`/api/classes?${params.toString()}`);
      const data = (await res.json()) as PaginatedResponse<ClassRow>;
      setClasses(data.data || []);
      setPagination(data.pagination);
    } catch {
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, schoolYearFilter]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, schoolYearFilter]);

  function handleEdit(classe: ClassRow) {
    setEditingClass(classe);
    setModalOpen(true);
  }

  function handleCreate() {
    setEditingClass(null);
    setModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette classe ?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/classes/${id}`, { method: "DELETE" });
      fetchClasses();
    } finally {
      setDeletingId(null);
    }
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
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={schoolYearFilter}
                onChange={(e) => setSchoolYearFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="">Toutes les années</option>
                {schoolYears.map((sy) => (
                  <option key={sy.id} value={sy.id}>
                    {sy.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            <span className="ml-2 text-sm text-gray-500">Chargement...</span>
          </div>
        ) : classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <BookOpen className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium">Aucune classe trouvée</p>
            <p className="text-xs mt-1">
              {search || schoolYearFilter
                ? "Essayez de modifier vos filtres"
                : "Commencez par ajouter une classe"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-3 font-medium">Nom</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">
                    Niveau
                  </th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">
                    Section
                  </th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">
                    Capacité
                  </th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">
                    Effectif
                  </th>
                  <th className="px-4 py-3 font-medium hidden xl:table-cell">
                    Année Scolaire
                  </th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((classe) => {
                  const effectif = classe.enrollments?.length || 0;
                  const isFull = effectif >= classe.capacity;
                  return (
                    <tr
                      key={classe.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {classe.name}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                        {classe.level}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                        {classe.section || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                        {classe.capacity}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            isFull
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {effectif}/{classe.capacity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden xl:table-cell">
                        {classe.schoolYear?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(classe)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Modifier"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(classe.id)}
                            disabled={deletingId === classe.id}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                            title="Supprimer"
                          >
                            {deletingId === classe.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
