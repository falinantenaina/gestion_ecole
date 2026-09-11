"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Plus,
  Eye,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  Filter,
  ArrowRightLeft,
  X,
} from "lucide-react";
import EnrollmentModal from "@/components/modals/enrollment-modal";
import { useSchoolYear } from "@/components/providers/school-year-provider";
import type { Enrollment, Class, SchoolYear, PaginatedResponse } from "@/types";

type EnrollmentRow = Enrollment & {
  student?: { firstName: string; lastName: string; matricule: string };
  class?: { name: string; level: string };
  schoolYear?: { name: string };
};

const ITEMS_PER_PAGE = 10;

const statusLabels: Record<string, string> = {
  PENDING: "En attente",
  VALIDATED: "Validée",
  CANCELLED: "Annulée",
  COMPLETED: "Terminée",
};

const statusStyles: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  VALIDATED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  COMPLETED: "bg-blue-100 text-blue-700",
};

export default function InscriptionsPage() {
  const { selectedYear } = useSchoolYear();
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: ITEMS_PER_PAGE,
    totalPages: 0,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [classes, setClasses] = useState<Class[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferEnrollment, setTransferEnrollment] =
    useState<EnrollmentRow | null>(null);
  const [transferClassId, setTransferClassId] = useState("");
  const [transferSchoolYearId, setTransferSchoolYearId] = useState("");
  const [transferring, setTransferring] = useState(false);

  const [summaryStats, setSummaryStats] = useState({
    pending: 0,
    validated: 0,
    total: 0,
  });

  const fetchFilters = useCallback(async () => {
    try {
      const [classesRes] = await Promise.all([
        fetch("/api/classes?limit=100"),
      ]);
      const classesData = await classesRes.json();
      setClasses(classesData.data || []);
    } catch {
      setClasses([]);
    }
  }, []);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const fetchEnrollments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(ITEMS_PER_PAGE),
      });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (classFilter) params.set("classId", classFilter);
      if (selectedYear?.id) params.set("schoolYearId", selectedYear.id);

      const res = await fetch(`/api/inscriptions?${params.toString()}`);
      const data = (await res.json()) as PaginatedResponse<EnrollmentRow>;
      setEnrollments(data.data || []);
      setPagination(data.pagination);

      const allParams = new URLSearchParams();
      if (selectedYear?.id) allParams.set("schoolYearId", selectedYear.id);
      const allRes = await fetch(`/api/inscriptions?limit=1000&${allParams.toString()}`);
      const allData = (await allRes.json()) as PaginatedResponse<EnrollmentRow>;
      const all = allData.data || [];
      setSummaryStats({
        pending: all.filter((e) => e.status === "PENDING").length,
        validated: all.filter((e) => e.status === "VALIDATED").length,
        total: allData.pagination.total,
      });
    } catch {
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, statusFilter, classFilter, selectedYear?.id]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, classFilter]);

  async function handleStatusChange(id: string, newStatus: string) {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/inscriptions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchEnrollments();
    } finally {
      setProcessingId(null);
    }
  }

  function openTransferModal(enrollment: EnrollmentRow) {
    setTransferEnrollment(enrollment);
    setTransferClassId("");
    setTransferSchoolYearId(enrollment.schoolYearId || "");
    setTransferModalOpen(true);
  }

  async function handleTransfer() {
    if (!transferEnrollment || !transferClassId || !transferSchoolYearId) return;
    setTransferring(true);
    try {
      const res = await fetch(`/api/inscriptions/${transferEnrollment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: transferClassId,
          schoolYearId: transferSchoolYearId,
        }),
      });
      if (res.ok) {
        setTransferModalOpen(false);
        setTransferEnrollment(null);
        fetchEnrollments();
      }
    } finally {
      setTransferring(false);
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
            <FileText className="w-7 h-7 text-indigo-600" />
            Gestion des Inscriptions
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {pagination.total} inscription{pagination.total !== 1 ? "s" : ""} au
            total
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Inscription
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">En attente</p>
              <p className="text-2xl font-bold text-yellow-600">
                {summaryStats.pending}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Validées</p>
              <p className="text-2xl font-bold text-green-600">
                {summaryStats.validated}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-2xl font-bold text-indigo-600">
                {summaryStats.total}
              </p>
            </div>
          </div>
        </div>
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
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="">Tous les statuts</option>
                <option value="PENDING">En attente</option>
                <option value="VALIDATED">Validée</option>
                <option value="CANCELLED">Annulée</option>
                <option value="COMPLETED">Terminée</option>
              </select>
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="">Toutes les classes</option>
                {classes.map((classe) => (
                  <option key={classe.id} value={classe.id}>
                    {classe.name}
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
        ) : enrollments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileText className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium">Aucune inscription trouvée</p>
            <p className="text-xs mt-1">
              {search || statusFilter || classFilter
                ? "Essayez de modifier vos filtres"
                : "Commencez par ajouter une inscription"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-3 font-medium">Élève</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">
                    Matricule
                  </th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">
                    Classe
                  </th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">
                    Année Scolaire
                  </th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">
                    Date Inscription
                  </th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enrollment) => (
                  <tr
                    key={enrollment.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {enrollment.student
                        ? `${enrollment.student.firstName} ${enrollment.student.lastName}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        {enrollment.student?.matricule || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      {enrollment.class?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                      {enrollment.schoolYear?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      {formatDate(enrollment.enrollmentDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusStyles[enrollment.status] ||
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {statusLabels[enrollment.status] || enrollment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {enrollment.status === "PENDING" && (
                          <>
                            <button
                              onClick={() =>
                                handleStatusChange(enrollment.id, "VALIDATED")
                              }
                              disabled={processingId === enrollment.id}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                              title="Valider"
                            >
                              {processingId === enrollment.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() =>
                                handleStatusChange(enrollment.id, "CANCELLED")
                              }
                              disabled={processingId === enrollment.id}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                              title="Annuler"
                            >
                              {processingId === enrollment.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                            </button>
                          </>
                        )}
                        {enrollment.status === "VALIDATED" && (
                          <button
                            onClick={() => openTransferModal(enrollment)}
                            disabled={processingId === enrollment.id}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                            title="Transférer"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                        )}
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

      {transferModalOpen && transferEnrollment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              if (!transferring) {
                setTransferModalOpen(false);
                setTransferEnrollment(null);
              }
            }}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Transférer l&apos;inscription
              </h2>
              <button
                onClick={() => {
                  setTransferModalOpen(false);
                  setTransferEnrollment(null);
                }}
                disabled={transferring}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="text-gray-500">Élève</p>
                <p className="font-medium text-gray-900">
                  {transferEnrollment.student?.firstName}{" "}
                  {transferEnrollment.student?.lastName}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Classe actuelle: {transferEnrollment.class?.name || "—"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nouvelle classe *
                </label>
                <select
                  value={transferClassId}
                  onChange={(e) => setTransferClassId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Sélectionner une classe...</option>
                  {classes.map((classe) => (
                    <option key={classe.id} value={classe.id}>
                      {classe.name} ({classe.level})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Année scolaire *
                </label>
                <select
                  value={transferSchoolYearId}
                  onChange={(e) => setTransferSchoolYearId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Sélectionner une année...</option>
                  {schoolYears.map((sy) => (
                    <option key={sy.id} value={sy.id}>
                      {sy.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setTransferModalOpen(false);
                    setTransferEnrollment(null);
                  }}
                  disabled={transferring}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleTransfer}
                  disabled={
                    transferring || !transferClassId || !transferSchoolYearId
                  }
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {transferring && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Confirmer le transfert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <EnrollmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchEnrollments}
      />
    </div>
  );
}
