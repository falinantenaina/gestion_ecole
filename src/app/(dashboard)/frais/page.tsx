"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Coins,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Check,
  CheckSquare,
  Square,
  ChevronDown,
} from "lucide-react";

interface ClassFee {
  id: string;
  classId: string;
  paymentTypeId: string;
  amount: number;
  schoolYearId: string;
  class: {
    id: string;
    name: string;
    capacity: number;
    enrollments: { id: string }[];
  };
  paymentType: {
    id: string;
    name: string;
  };
}

interface ClassItem {
  id: string;
  name: string;
  capacity: number;
  enrollments: { id: string }[];
}

interface PaymentTypeItem {
  id: string;
  name: string;
}

interface SchoolYearItem {
  id: string;
  name: string;
  isCurrent: boolean;
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "MGA",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function FraisPage() {
  const [schoolYears, setSchoolYears] = useState<SchoolYearItem[]>([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentTypeItem[]>([]);
  const [classFees, setClassFees] = useState<ClassFee[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState<ClassFee | null>(null);

  const [newPaymentTypeId, setNewPaymentTypeId] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newClassIds, setNewClassIds] = useState<string[]>([]);
  const [applyToAll, setApplyToAll] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [showNewTypeInline, setShowNewTypeInline] = useState(false);

  const [editAmount, setEditAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchSchoolYears = useCallback(async () => {
    try {
      const res = await fetch("/api/school-years");
      const data = await res.json();
      setSchoolYears(data.data || []);
      const current = (data.data || []).find(
        (y: SchoolYearItem) => y.isCurrent
      );
      if (current) setSelectedYear(current.id);
      else if (data.data?.length) setSelectedYear(data.data[0].id);
    } catch {
      setSchoolYears([]);
    }
  }, []);

  const fetchClasses = useCallback(async () => {
    if (!selectedYear) return;
    try {
      const res = await fetch(`/api/classes?schoolYearId=${selectedYear}&limit=100`);
      const data = await res.json();
      setClasses(data.data || []);
    } catch {
      setClasses([]);
    }
  }, [selectedYear]);

  const fetchPaymentTypes = useCallback(async () => {
    try {
      const res = await fetch("/api/paiement-types?limit=100");
      const data = await res.json();
      setPaymentTypes(data.data || []);
    } catch {
      setPaymentTypes([]);
    }
  }, []);

  const fetchClassFees = useCallback(async () => {
    if (!selectedYear) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/class-fees?schoolYearId=${selectedYear}`);
      const data = await res.json();
      setClassFees(data.data || []);
    } catch {
      setClassFees([]);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchSchoolYears();
  }, [fetchSchoolYears]);

  useEffect(() => {
    if (selectedYear) {
      fetchClasses();
      fetchClassFees();
    }
  }, [selectedYear, fetchClasses, fetchClassFees]);

  useEffect(() => {
    fetchPaymentTypes();
  }, [fetchPaymentTypes]);

  const groupedByClass = classes.map((cls) => ({
    cls,
    fees: classFees.filter((f) => f.classId === cls.id),
    totalPerStudent: classFees
      .filter((f) => f.classId === cls.id)
      .reduce((sum, f) => sum + f.amount, 0),
  }));

  const availableClassesForNew = applyToAll
    ? classes
    : classes.filter((cls) => {
        if (newClassIds.includes(cls.id)) return true;
        return true;
      });

  function resetNewModal() {
    setNewPaymentTypeId("");
    setNewAmount("");
    setNewClassIds([]);
    setApplyToAll(false);
    setNewTypeName("");
    setShowNewTypeInline(false);
  }

  function openNewModal() {
    resetNewModal();
    setShowNewModal(true);
  }

  function toggleClassSelection(classId: string) {
    setNewClassIds((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    );
  }

  function selectAllClasses() {
    setNewClassIds(classes.map((c) => c.id));
  }

  async function handleCreate() {
    if (!newPaymentTypeId || !newAmount || !selectedYear) return;
    if (newClassIds.length === 0 && !applyToAll) return;

    setSubmitting(true);
    try {
      let typeId = newPaymentTypeId;

      if (showNewTypeInline && newTypeName.trim()) {
        const typeRes = await fetch("/api/paiement-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newTypeName.trim(),
            amount: parseFloat(newAmount),
          }),
        });

        if (!typeRes.ok) {
          const err = await typeRes.json();
          alert(err.error || "Erreur lors de la création du type");
          return;
        }

        const newType = await typeRes.json();
        typeId = newType.id;
        setPaymentTypes((prev) => [...prev, newType]);
      }

      const targetClassIds = applyToAll
        ? classes.map((c) => c.id)
        : newClassIds;

      const res = await fetch("/api/class-fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classIds: targetClassIds,
          paymentTypeId: typeId,
          amount: parseFloat(newAmount),
          schoolYearId: selectedYear,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erreur lors de la création");
        return;
      }

      await fetchClassFees();
      setShowNewModal(false);
      resetNewModal();
    } catch {
      alert("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  }

  function openEditModal(fee: ClassFee) {
    setSelectedFee(fee);
    setEditAmount(String(fee.amount));
    setShowEditModal(true);
  }

  async function handleUpdate() {
    if (!selectedFee || !editAmount) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/class-fees/${selectedFee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(editAmount) }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erreur lors de la mise à jour");
        return;
      }

      await fetchClassFees();
      setShowEditModal(false);
      setSelectedFee(null);
    } catch {
      alert("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  }

  function openDeleteModal(feeId: string) {
    setDeleteId(feeId);
    setShowDeleteModal(true);
  }

  async function handleDelete() {
    if (!deleteId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/class-fees/${deleteId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erreur lors de la suppression");
        return;
      }

      await fetchClassFees();
      setShowDeleteModal(false);
      setDeleteId(null);
    } catch {
      alert("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  }

  const feeCountByClass = (classId: string) =>
    classFees.filter((f) => f.classId === classId).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Coins className="w-7 h-7 text-indigo-600" />
            Gestion des Frais par Classe
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configurez les frais pour chaque classe et année scolaire
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Sélectionner une année</option>
            {schoolYears.map((sy) => (
              <option key={sy.id} value={sy.id}>
                {sy.name}
              </option>
            ))}
          </select>
          <button
            onClick={openNewModal}
            disabled={!selectedYear}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Nouveau Frais
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-4 bg-gray-100 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : !selectedYear ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Coins className="w-12 h-12 mb-3" />
          <p className="text-sm font-medium">Sélectionnez une année scolaire</p>
        </div>
      ) : classFees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-xl shadow-sm border border-gray-100">
          <Coins className="w-12 h-12 mb-3" />
          <p className="text-sm font-medium">Aucun frais configuré</p>
          <p className="text-xs mt-1 mb-4">
            Commencez par ajouter des frais pour vos classes
          </p>
          <button
            onClick={openNewModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter le premier frais
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByClass.map(({ cls, fees, totalPerStudent }) => (
            <div
              key={cls.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 bg-gray-50/80 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {cls.name}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Capacité: {cls.capacity} | Inscrits:{" "}
                    {cls.enrollments.length}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total par élève</p>
                  <p className="text-sm font-bold text-indigo-600">
                    {formatAmount(totalPerStudent)}
                  </p>
                </div>
              </div>

              {fees.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-50">
                      <th className="px-5 py-2.5 font-medium">Type de Frais</th>
                      <th className="px-5 py-2.5 font-medium text-right">
                        Montant
                      </th>
                      <th className="px-5 py-2.5 font-medium text-right w-24">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fees.map((fee) => (
                      <tr
                        key={fee.id}
                        className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                      >
                        <td className="px-5 py-3 text-gray-700">
                          {fee.paymentType.name}
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-gray-900">
                          {formatAmount(fee.amount)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(fee)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Modifier"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(fee.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-5 py-6 text-center text-sm text-gray-400">
                  Aucun frais configuré pour cette classe
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Nouveau Frais
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de Frais *
                </label>
                {showNewTypeInline ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      placeholder="Nom du nouveau type"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => {
                        if (newTypeName.trim()) {
                          setShowNewTypeInline(false);
                        }
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      Utiliser un type existant
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={newPaymentTypeId}
                      onChange={(e) => setNewPaymentTypeId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="">Sélectionner un type</option>
                      {paymentTypes.map((pt) => (
                        <option key={pt.id} value={pt.id}>
                          {pt.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowNewTypeInline(true)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Créer un nouveau type
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Montant (Ar) *
                </label>
                <input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="Ex: 50000"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {newAmount && parseFloat(newAmount) > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {formatAmount(parseFloat(newAmount))}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Classes *
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={applyToAll}
                      onChange={(e) => {
                        setApplyToAll(e.target.checked);
                        if (e.target.checked) setNewClassIds([]);
                      }}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Appliquer à toutes les classes ({classes.length})
                    </span>
                  </label>

                  {!applyToAll && (
                    <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50/50">
                        <button
                          onClick={selectAllClasses}
                          className="text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          Tout sélectionner
                        </button>
                        <button
                          onClick={() => setNewClassIds([])}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Tout désélectionner
                        </button>
                      </div>
                      {classes.map((cls) => (
                        <label
                          key={cls.id}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                        >
                          <input
                            type="checkbox"
                            checked={newClassIds.includes(cls.id)}
                            onChange={() => toggleClassSelection(cls.id)}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                          />
                          <div className="flex-1">
                            <span className="text-sm text-gray-700">
                              {cls.name}
                            </span>
                            <span className="text-xs text-gray-400 ml-2">
                              ({feeCountByClass(cls.id)} frais)
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {!applyToAll && newClassIds.length > 0 && (
                    <p className="text-xs text-gray-500">
                      {newClassIds.length} classe{newClassIds.length > 1 ? "s" : ""} sélectionnée{newClassIds.length > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 bg-gray-50/50">
              <button
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={
                  submitting ||
                  !newAmount ||
                  parseFloat(newAmount) <= 0 ||
                  (!showNewTypeInline && !newPaymentTypeId) ||
                  (showNewTypeInline && !newTypeName.trim()) ||
                  (!applyToAll && newClassIds.length === 0)
                }
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedFee && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Modifier le Frais
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedFee(null);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Classe</p>
                <p className="font-medium text-gray-900">
                  {selectedFee.class.name}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Type de frais</p>
                <p className="font-medium text-gray-900">
                  {selectedFee.paymentType.name}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nouveau montant (Ar)
                </label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {editAmount && parseFloat(editAmount) > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {formatAmount(parseFloat(editAmount))}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 bg-gray-50/50">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedFee(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleUpdate}
                disabled={
                  submitting || !editAmount || parseFloat(editAmount) <= 0
                }
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Confirmer la suppression
              </h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteId(null);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              <p className="text-sm text-gray-600">
                Êtes-vous sûr de vouloir supprimer ce frais ? Cette action est
                irréversible.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 bg-gray-50/50">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteId(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
