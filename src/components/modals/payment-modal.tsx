"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2, Search } from "lucide-react";
import type { Payment, PaymentType, PaymentMethod, Student } from "@/types";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment?: Payment | null;
  studentId?: string;
  onSuccess: () => void;
}

const paymentMethodOptions: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Espèces" },
  { value: "BANK_TRANSFER", label: "Virement bancaire" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "CREDIT_CARD", label: "Carte bancaire" },
];

export default function PaymentModal({
  isOpen,
  onClose,
  payment,
  studentId,
  onSuccess,
}: PaymentModalProps) {
  const isEditing = !!payment;

  const [formData, setFormData] = useState({
    studentId: "",
    paymentTypeId: "",
    amount: "",
    paymentMethod: "CASH" as PaymentMethod,
    reference: "",
    notes: "",
    paymentDate: new Date().toISOString().slice(0, 16),
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);

  const [studentSearch, setStudentSearch] = useState("");
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [remainingBalance, setRemainingBalance] = useState<number | null>(null);

  useEffect(() => {
    if (formData.studentId && formData.paymentTypeId && !isEditing) {
      fetch(`/api/paiements/remaining?studentId=${formData.studentId}&paymentTypeId=${formData.paymentTypeId}`)
        .then((r) => r.json())
        .then((d) => setRemainingBalance(d.remaining ?? null))
        .catch(() => setRemainingBalance(null));
    } else {
      setRemainingBalance(null);
    }
  }, [formData.studentId, formData.paymentTypeId, isEditing]);

  const fetchDropdowns = useCallback(async () => {
    setLoadingDropdowns(true);
    try {
      const [studentsRes, typesRes] = await Promise.all([
        fetch("/api/eleves?limit=100"),
        fetch("/api/paiement-types?limit=100"),
      ]);
      const studentsData = await studentsRes.json();
      const typesData = await typesRes.json();
      setStudents(studentsData.data || []);
      setPaymentTypes(typesData.data || []);
    } catch {
      setStudents([]);
      setPaymentTypes([]);
    } finally {
      setLoadingDropdowns(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchDropdowns();
    }
  }, [isOpen, fetchDropdowns]);

  useEffect(() => {
    if (payment) {
      const student = payment.student;
      setFormData({
        studentId: payment.studentId,
        paymentTypeId: payment.paymentTypeId,
        amount: String(payment.amount),
        paymentMethod: payment.paymentMethod,
        reference: payment.reference || "",
        notes: payment.notes || "",
        paymentDate: payment.paymentDate
          ? new Date(payment.paymentDate).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
      });
      if (student) {
        setStudentSearch(`${student.firstName} ${student.lastName}`);
      }
    } else if (studentId) {
      setFormData((prev) => ({
        ...prev,
        studentId,
        paymentTypeId: "",
        amount: "",
        paymentMethod: "CASH",
        reference: "",
        notes: "",
        paymentDate: new Date().toISOString().slice(0, 16),
      }));
      const found = students.find((s) => s.id === studentId);
      if (found) {
        setStudentSearch(`${found.firstName} ${found.lastName}`);
      } else {
        setStudentSearch("");
      }
    } else {
      setFormData({
        studentId: "",
        paymentTypeId: "",
        amount: "",
        paymentMethod: "CASH",
        reference: "",
        notes: "",
        paymentDate: new Date().toISOString().slice(0, 16),
      });
      setStudentSearch("");
    }
    setErrors({});
    setSubmitError("");
  }, [payment, isOpen, studentId, students]);

  const filteredStudents = students.filter((s) => {
    const query = studentSearch.toLowerCase();
    return (
      s.firstName.toLowerCase().includes(query) ||
      s.lastName.toLowerCase().includes(query) ||
      s.matricule.toLowerCase().includes(query)
    );
  });

  const selectedStudent = students.find((s) => s.id === formData.studentId);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!formData.studentId) {
      newErrors.studentId = "L'élève est requis";
    }
    if (!formData.paymentTypeId) {
      newErrors.paymentTypeId = "Le type de frais est requis";
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = "Le montant doit être supérieur à 0";
    } else if (remainingBalance !== null && parseFloat(formData.amount) > remainingBalance) {
      newErrors.amount = `Maximum autorisé : ${remainingBalance.toLocaleString("fr-FR")} Ar`;
    }
    if (!formData.paymentDate) {
      newErrors.paymentDate = "La date de paiement est requise";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const url = isEditing ? `/api/paiements/${payment.id}` : "/api/paiements";
      const method = isEditing ? "PUT" : "POST";

      const body = {
        studentId: formData.studentId,
        paymentTypeId: formData.paymentTypeId,
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        reference: formData.reference.trim() || null,
        notes: formData.notes.trim() || null,
        paymentDate: formData.paymentDate,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Une erreur est survenue");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "Une erreur est survenue"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    let value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      let numVal = parseFloat(value);
      if (remainingBalance !== null && !isNaN(numVal) && numVal > remainingBalance) {
        numVal = remainingBalance;
        value = String(numVal);
      }
      setFormData((prev) => ({ ...prev, amount: value }));
      if (errors.amount) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.amount;
          return next;
        });
      }
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={!submitting ? onClose : undefined}
      />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? "Modifier le paiement" : "Nouveau Paiement"}
          </h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {submitError}
            </div>
          )}

          {loadingDropdowns ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
              <span className="ml-2 text-sm text-gray-500">
                Chargement des données...
              </span>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Élève *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={
                      selectedStudent
                        ? `${selectedStudent.firstName} ${selectedStudent.lastName} (${selectedStudent.matricule})`
                        : "Rechercher un élève..."
                    }
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setShowStudentDropdown(true);
                      if (formData.studentId) {
                        setFormData((prev) => ({ ...prev, studentId: "" }));
                      }
                    }}
                    onFocus={() => setShowStudentDropdown(true)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.studentId ? "border-red-300" : "border-gray-300"
                    }`}
                  />
                  {showStudentDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredStudents.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          Aucun élève trouvé
                        </div>
                      ) : (
                        filteredStudents.map((student) => (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                studentId: student.id,
                              }));
                              setStudentSearch(
                                `${student.firstName} ${student.lastName}`
                              );
                              setShowStudentDropdown(false);
                              if (errors.studentId) {
                                setErrors((prev) => {
                                  const next = { ...prev };
                                  delete next.studentId;
                                  return next;
                                });
                              }
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 transition-colors flex justify-between items-center"
                          >
                            <span className="font-medium text-gray-900">
                              {student.firstName} {student.lastName}
                            </span>
                            <span className="text-xs text-gray-500 font-mono">
                              {student.matricule}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {errors.studentId && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.studentId}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type de Frais *
                  </label>
                  <select
                    value={formData.paymentTypeId}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        paymentTypeId: e.target.value,
                      }));
                      if (errors.paymentTypeId) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.paymentTypeId;
                          return next;
                        });
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.paymentTypeId ? "border-red-300" : "border-gray-300"
                    }`}
                  >
                    <option value="">Sélectionner...</option>
                    {paymentTypes.map((pt) => (
                      <option key={pt.id} value={pt.id}>
                        {pt.name} - {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "MGA", minimumFractionDigits: 0 }).format(pt.amount)}
                      </option>
                    ))}
                  </select>
                  {errors.paymentTypeId && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.paymentTypeId}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Montant (Ar) *
                  </label>
                  <input
                    type="text"
                    value={formData.amount}
                    onChange={handleAmountChange}
                    placeholder={remainingBalance !== null ? `Max: ${remainingBalance.toLocaleString("fr-FR")}` : "0"}
                    max={remainingBalance !== undefined && remainingBalance !== null ? remainingBalance : undefined}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.amount ? "border-red-300" : "border-gray-300"
                    }`}
                  />
                  {remainingBalance !== null && (
                    <p className={`text-xs mt-1 ${remainingBalance === 0 ? "text-green-600 font-medium" : "text-gray-500"}`}>
                      {remainingBalance === 0
                        ? "Entièrement payé"
                        : `Reste à payer : ${remainingBalance.toLocaleString("fr-FR")} Ar`}
                    </p>
                  )}
                  {errors.amount && (
                    <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mode de Paiement *
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentMethod: e.target.value as PaymentMethod,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {paymentMethodOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date et Heure de Paiement *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.paymentDate}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        paymentDate: e.target.value,
                      }));
                      if (errors.paymentDate) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.paymentDate;
                          return next;
                        });
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.paymentDate ? "border-red-300" : "border-gray-300"
                    }`}
                  />
                  {errors.paymentDate && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.paymentDate}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Référence
                </label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      reference: e.target.value,
                    }))
                  }
                  placeholder="Numéro de chèque, de transaction..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  rows={3}
                  placeholder="Notes optionnelles..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || loadingDropdowns}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? "Enregistrer" : "Enregistrer le paiement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
