"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Filter,
  X,
  Download,
  Printer,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  CreditCard,
} from "lucide-react";
import PaymentModal from "@/components/modals/payment-modal";
import { useSchoolYear } from "@/components/providers/school-year-provider";
import type { PaymentType, PaymentMethod, PaginatedResponse } from "@/types";

interface StudentFees {
  student: { id: string; firstName: string; lastName: string; matricule: string };
  class: { id: string; name: string; level: string };
  enrollmentId: string;
  paymentTypeBreakdown: {
    paymentTypeId: string;
    name: string;
    totalDue: number;
    totalPaid: number;
    remaining: number;
  }[];
  totalDue: number;
  totalPaid: number;
  remaining: number;
  status: "paid" | "unpaid" | "partial";
  lastPaymentDate: string | null;
  payments: {
    id: string;
    amount: number;
    paymentMethod: string;
    reference: string | null;
    notes: string | null;
    paymentDate: string;
    paymentType: { id: string; name: string; amount: number };
  }[];
}

interface EcolageStats {
  totalDue: number;
  totalPaid: number;
  totalUnpaid: number;
  collectionRate: number;
  paidCount: number;
  unpaidCount: number;
  partialCount: number;
  totalCount: number;
}

interface EcolageResponse {
  data: StudentFees[];
  stats: EcolageStats;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const ITEMS_PER_PAGE = 20;

const statusLabels: Record<string, string> = {
  paid: "Payé",
  unpaid: "Impayé",
  partial: "Partiel",
};

const statusStyles: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  unpaid: "bg-red-100 text-red-700",
  partial: "bg-orange-100 text-orange-700",
};

const paymentMethodLabels: Record<string, string> = {
  CASH: "Espèces",
  BANK_TRANSFER: "Virement",
  MOBILE_MONEY: "Mobile Money",
  CREDIT_CARD: "Carte",
};

const paymentMethodStyles: Record<string, string> = {
  CASH: "bg-green-100 text-green-700",
  BANK_TRANSFER: "bg-blue-100 text-blue-700",
  MOBILE_MONEY: "bg-purple-100 text-purple-700",
  CREDIT_CARD: "bg-orange-100 text-orange-700",
};

function formatAmount(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "MGA",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR");
}

function getMonthOptions(startMonth: number = 10, endMonth: number = 7, year?: number) {
  const months: { value: string; label: string }[] = [];
  const sy = year || new Date().getFullYear();

  // Generate months from startMonth to endMonth across the school year
  let m = startMonth;
  for (let i = 0; i < 12; i++) {
    const monthYear = m >= startMonth ? sy : sy + 1;
    const value = `${monthYear}-${String(m).padStart(2, "0")}`;
    const d = new Date(monthYear, m - 1, 1);
    const label = d.toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
    months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    if (m === endMonth) break;
    m = m >= 12 ? 1 : m + 1;
  }
  return months;
}

export default function EcolagePage() {
  const { selectedYear } = useSchoolYear();
  const [data, setData] = useState<StudentFees[]>([]);
  const [stats, setStats] = useState<EcolageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: ITEMS_PER_PAGE,
    totalPages: 0,
  });

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [monthFilter, setMonthFilter] = useState(currentMonth);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>("lastName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);

  const [selectedStudent, setSelectedStudent] = useState<StudentFees | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentStudentId, setPaymentStudentId] = useState<string>("");

  const months = useRef(getMonthOptions(selectedYear?.startMonth || 10, selectedYear?.endMonth || 7));

  const fetchDropdowns = useCallback(async () => {
    try {
      const [classesRes, typesRes] = await Promise.all([
        fetch("/api/classes?limit=100"),
        fetch("/api/paiement-types?limit=100"),
      ]);
      const classesData = await classesRes.json();
      const typesData = await typesRes.json();
      setClasses(classesData.data || []);
      setPaymentTypes(typesData.data || []);
    } catch {
      setClasses([]);
      setPaymentTypes([]);
    }
  }, []);

  useEffect(() => {
    fetchDropdowns();
  }, [fetchDropdowns]);

  useEffect(() => {
    if (selectedYear) {
      months.current = getMonthOptions(selectedYear.startMonth || 10, selectedYear.endMonth || 7);
    }
  }, [selectedYear]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (classFilter) params.set("classId", classFilter);
      if (selectedYear?.id) params.set("schoolYearId", selectedYear.id);
      if (monthFilter) params.set("month", monthFilter);
      if (search) params.set("search", search);
      params.set("page", String(currentPage));
      params.set("limit", String(ITEMS_PER_PAGE));

      const res = await fetch(`/api/ecolage?${params.toString()}`);
      const result: EcolageResponse = await res.json();

      let sortedData = [...(result.data || [])];
      sortedData.sort((a, b) => {
        let aVal: any;
        let bVal: any;
        switch (sortField) {
          case "lastName":
            aVal = a.student.lastName;
            bVal = b.student.lastName;
            break;
          case "matricule":
            aVal = a.student.matricule;
            bVal = b.student.matricule;
            break;
          case "className":
            aVal = a.class.name;
            bVal = b.class.name;
            break;
          case "totalDue":
            aVal = a.totalDue;
            bVal = b.totalDue;
            break;
          case "totalPaid":
            aVal = a.totalPaid;
            bVal = b.totalPaid;
            break;
          case "remaining":
            aVal = a.remaining;
            bVal = b.remaining;
            break;
          case "status":
            const order = { paid: 0, partial: 1, unpaid: 2 };
            aVal = order[a.status];
            bVal = order[b.status];
            break;
          case "lastPaymentDate":
            aVal = a.lastPaymentDate || "";
            bVal = b.lastPaymentDate || "";
            break;
          default:
            aVal = a.student.lastName;
            bVal = b.student.lastName;
        }
        if (typeof aVal === "string") {
          return sortDir === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      });

      setData(sortedData);
      setStats(result.stats);
      setPagination(result.pagination);
    } catch {
      setData([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    search,
    classFilter,
    statusFilter,
    monthFilter,
    selectedYear?.id,
    sortField,
    sortDir,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, classFilter, statusFilter, monthFilter]);

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function SortIcon({ field }: { field: string }) {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3" />
    );
  }

  function clearFilters() {
    setSearch("");
    setClassFilter("");
    setStatusFilter("all");
    setMonthFilter("");
    setCurrentPage(1);
  }

  const hasFilters = search || classFilter || statusFilter !== "all" || monthFilter;

  function handlePayStudent(studentId: string) {
    setPaymentStudentId(studentId);
    setPaymentModalOpen(true);
  }

  function handlePrintList() {
    window.print();
  }

  function handleExportCSV() {
    if (data.length === 0) return;

    const headers = [
      "Élève",
      "Matricule",
      "Classe",
      "Frais Total",
      "Montant Payé",
      "Reste à Payer",
      "Statut",
      "Dernier Paiement",
    ];

    const rows = data.map((sf) => [
      `${sf.student.firstName} ${sf.student.lastName}`,
      sf.student.matricule,
      sf.class.name,
      sf.totalDue,
      sf.totalPaid,
      sf.remaining,
      statusLabels[sf.status],
      sf.lastPaymentDate ? formatDate(sf.lastPaymentDate) : "",
    ]);

    const csvContent =
      headers.join(";") +
      "\n" +
      rows.map((r) => r.join(";")).join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ecolage_export_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  }

  const totalPages = pagination.totalPages;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-indigo-600" />
            Gestion des Écolages
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {stats?.totalCount || 0} élève{stats?.totalCount !== 1 ? "s" : ""} inscrit{stats?.totalCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exporter CSV</span>
          </button>
          <button
            onClick={handlePrintList}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Imprimer</span>
          </button>
        </div>
      </div>

      {/* Stats Cards - Monthly only */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Payés ce mois</p>
                <p className="text-lg font-bold text-green-600">{stats.paidCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Impayés ce mois</p>
                <p className="text-lg font-bold text-orange-600">{stats.unpaidCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Partiels</p>
                <p className="text-lg font-bold text-yellow-600">{stats.partialCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total élèves</p>
                <p className="text-lg font-bold text-blue-600">{stats.totalCount}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
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
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="">Toutes les classes</option>
                {classes.map((cl) => (
                  <option key={cl.id} value={cl.id}>
                    {cl.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">Tous les statuts</option>
                <option value="paid">Payé</option>
                <option value="partial">Partiel</option>
                <option value="unpaid">Impayé</option>
              </select>
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="">Tous les mois</option>
                {months.current.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Effacer
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-gray-50 last:border-0">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/6" />
                </div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                <div className="h-6 bg-gray-200 rounded-full animate-pulse w-16" />
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <DollarSign className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium">Aucun écolage trouvé</p>
            <p className="text-xs mt-1">
              {hasFilters
                ? "Essayez de modifier vos filtres"
                : "Aucune donnée disponible pour cette année scolaire"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/50">
                  {[
                    { field: "lastName", label: "Élève" },
                    { field: "matricule", label: "Matricule" },
                    { field: "className", label: "Classe" },
                    { field: "totalDue", label: "Frais Total" },
                    { field: "totalPaid", label: "Montant Payé" },
                    { field: "remaining", label: "Reste à Payer" },
                    { field: "status", label: "Statut" },
                    { field: "lastPaymentDate", label: "Dernier Paiement" },
                  ].map(({ field, label }) => (
                    <th
                      key={field}
                      onClick={() => handleSort(field)}
                      className={`px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-900 transition-colors ${
                        ["matricule", "className", "lastPaymentDate"].includes(field)
                          ? "hidden md:table-cell"
                          : ""
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        {label}
                        <SortIcon field={field} />
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((sf) => (
                  <tr
                    key={sf.student.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedStudent(selectedStudent?.student.id === sf.student.id ? null : sf)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {sf.student.firstName} {sf.student.lastName}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        {sf.student.matricule}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      {sf.class.name}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {formatAmount(sf.totalDue)}
                    </td>
                    <td className="px-4 py-3 font-medium text-green-600">
                      {formatAmount(sf.totalPaid)}
                    </td>
                    <td className="px-4 py-3 font-medium text-red-600">
                      {formatAmount(sf.remaining)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[sf.status]}`}>
                        {statusLabels[sf.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      {sf.lastPaymentDate ? formatDate(sf.lastPaymentDate) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {sf.status !== "paid" && (
                          <button
                            onClick={() => handlePayStudent(sf.student.id)}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
                            title="Enregistrer un paiement"
                          >
                            <CreditCard className="w-3 h-3" />
                            Payer
                          </button>
                        )}
                        <button
                          onClick={() =>
                            setSelectedStudent(selectedStudent?.student.id === sf.student.id ? null : sf)
                          }
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Voir détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
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
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Student Detail Panel */}
      {selectedStudent && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50/50">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-600" />
                Détail des frais — {selectedStudent.student.firstName} {selectedStudent.student.lastName}
              </h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                <span className="font-mono text-xs bg-gray-200 px-2 py-0.5 rounded">
                  {selectedStudent.student.matricule}
                </span>
                <span>Classe : {selectedStudent.class.name}</span>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[selectedStudent.status]}`}>
                  {statusLabels[selectedStudent.status]}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedStudent.status !== "paid" && (
                <button
                  onClick={() => handlePayStudent(selectedStudent.student.id)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  Enregistrer un paiement
                </button>
              )}
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Payment Breakdown by Type */}
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Répartition par type de frais</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedStudent.paymentTypeBreakdown.map((ptb) => (
                <div
                  key={ptb.paymentTypeId}
                  className={`p-3 rounded-lg border ${
                    ptb.remaining <= 0
                      ? "border-green-200 bg-green-50"
                      : ptb.totalPaid > 0
                      ? "border-orange-200 bg-orange-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900">{ptb.name}</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Dû :</span>
                      <span className="font-medium">{formatAmount(ptb.totalDue)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Payé :</span>
                      <span className="font-medium text-green-600">{formatAmount(ptb.totalPaid)}</span>
                    </div>
                    {ptb.remaining > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Reste :</span>
                        <span className="font-medium text-red-600">{formatAmount(ptb.remaining)}</span>
                      </div>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          ptb.remaining <= 0 ? "bg-green-500" : ptb.totalPaid > 0 ? "bg-orange-500" : "bg-gray-300"
                        }`}
                        style={{
                          width: `${ptb.totalDue > 0 ? Math.min(100, (ptb.totalPaid / ptb.totalDue) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals Summary */}
            <div className="mt-4 p-3 bg-indigo-50 rounded-lg flex flex-wrap gap-6">
              <div>
                <p className="text-xs text-gray-500">Total dû</p>
                <p className="text-sm font-bold text-gray-900">{formatAmount(selectedStudent.totalDue)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total payé</p>
                <p className="text-sm font-bold text-green-600">{formatAmount(selectedStudent.totalPaid)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Reste à payer</p>
                <p className="text-sm font-bold text-red-600">{formatAmount(selectedStudent.remaining)}</p>
              </div>
            </div>
          </div>

          {/* Payment History */}
          {selectedStudent.payments.length > 0 && (
            <div className="px-5 pb-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Historique des paiements</h3>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/50">
                      <th className="px-4 py-2.5 font-medium">Date</th>
                      <th className="px-4 py-2.5 font-medium">Type</th>
                      <th className="px-4 py-2.5 font-medium">Montant</th>
                      <th className="px-4 py-2.5 font-medium">Mode</th>
                      <th className="px-4 py-2.5 font-medium hidden md:table-cell">Référence</th>
                      <th className="px-4 py-2.5 font-medium hidden lg:table-cell">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStudent.payments.map((payment) => (
                      <tr key={payment.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-4 py-2.5 text-gray-700">{formatDate(payment.paymentDate)}</td>
                        <td className="px-4 py-2.5 text-gray-700">{payment.paymentType.name}</td>
                        <td className="px-4 py-2.5 font-medium text-green-600">{formatAmount(payment.amount)}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              paymentMethodStyles[payment.paymentMethod] || "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 hidden md:table-cell">
                          {payment.reference || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 hidden lg:table-cell">
                          {payment.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedStudent.payments.length === 0 && (
            <div className="px-5 pb-5">
              <div className="p-4 bg-gray-50 rounded-lg text-center text-sm text-gray-500">
                Aucun paiement enregistré pour cet élève
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setPaymentStudentId("");
        }}
        studentId={paymentStudentId || undefined}
        onSuccess={fetchData}
      />
    </div>
  );
}
