"use client";

import { useState, useEffect } from "react";
import { X, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { Student, Class, PaymentMethod } from "@/types";

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: Student | null;
  onSuccess: () => void;
}

interface ClassFeeData {
  id: string;
  classId: string;
  paymentTypeId: string;
  amount: number;
  schoolYearId: string;
  paymentType: { id: string; name: string; description?: string | null; amount: number };
}

const genderLabels: Record<string, string> = {
  MALE: "Masculin",
  FEMALE: "Féminin",
};

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Espèces" },
  { value: "BANK_TRANSFER", label: "Virement bancaire" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "CREDIT_CARD", label: "Carte bancaire" },
];

export default function StudentModal({
  isOpen,
  onClose,
  student,
  onSuccess,
}: StudentModalProps) {
  const isEditing = !!student;

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "MALE" as "MALE" | "FEMALE",
    address: "",
    phone: "",
    photo: "",
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    parentRelation: "",
    classId: "",
  });

  const [inscriptionPaid, setInscriptionPaid] = useState(false);
  const [inscriptionAmount, setInscriptionAmount] = useState("");
  const [inscriptionMethod, setInscriptionMethod] = useState<PaymentMethod>("CASH");
  const [inscriptionDate, setInscriptionDate] = useState("");

  const [firstEcolagePaid, setFirstEcolagePaid] = useState(false);
  const [firstEcolageAmount, setFirstEcolageAmount] = useState("");
  const [firstEcolageMethod, setFirstEcolageMethod] = useState<PaymentMethod>("CASH");
  const [firstEcolageDate, setFirstEcolageDate] = useState("");

  const [showInscriptionSection, setShowInscriptionSection] = useState(false);
  const [showEcolageSection, setShowEcolageSection] = useState(false);

  const [classes, setClasses] = useState<Class[]>([]);
  const [classFees, setClassFees] = useState<ClassFeeData[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (student) {
      setFormData({
        firstName: student.firstName || "",
        lastName: student.lastName || "",
        dateOfBirth: student.dateOfBirth
          ? new Date(student.dateOfBirth).toISOString().split("T")[0]
          : "",
        gender: student.gender || "MALE",
        address: student.address || "",
        phone: student.phone || "",
        photo: student.photo || "",
        parentName: student.parentName || "",
        parentPhone: student.parentPhone || "",
        parentEmail: student.parentEmail || "",
        parentRelation: student.parentRelation || "",
        classId: "",
      });
    } else {
      setFormData({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "MALE",
        address: "",
        phone: "",
        photo: "",
        parentName: "",
        parentPhone: "",
        parentEmail: "",
        parentRelation: "",
        classId: "",
      });
      setInscriptionPaid(false);
      setInscriptionAmount("");
      setInscriptionMethod("CASH");
      setInscriptionDate("");
      setFirstEcolagePaid(false);
      setFirstEcolageAmount("");
      setFirstEcolageMethod("CASH");
      setFirstEcolageDate("");
      setShowInscriptionSection(false);
      setShowEcolageSection(false);
    }
    setErrors({});
    setSubmitError("");
  }, [student, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingClasses(true);
    fetch("/api/classes?limit=100")
      .then((res) => res.json())
      .then((data) => {
        setClasses(data.data || []);
      })
      .catch(() => {})
      .finally(() => setLoadingClasses(false));
  }, [isOpen]);

  useEffect(() => {
    if (!formData.classId || !isOpen) {
      setClassFees([]);
      return;
    }
    const classe = classes.find((c) => c.id === formData.classId);
    if (!classe) return;
    fetch(`/api/class-fees?schoolYearId=${classe.schoolYearId}&classId=${formData.classId}`)
      .then((res) => res.json())
      .then((data) => {
        setClassFees(data.data || []);
      })
      .catch(() => {});
  }, [formData.classId, classes, isOpen]);

  useEffect(() => {
    const inscriptionFee = classFees.find((f) =>
      f.paymentType.name.toLowerCase().includes("inscription")
    );
    const scolariteFee = classFees.find((f) =>
      f.paymentType.name.toLowerCase().includes("scolarit")
    );
    if (inscriptionFee) {
      setInscriptionAmount(inscriptionFee.amount.toString());
    }
    if (scolariteFee) {
      setFirstEcolageAmount(scolariteFee.amount.toString());
    }
  }, [classFees]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "Le prénom est requis";
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Le nom est requis";
    }
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "La date de naissance est requise";
    }
    if (!isEditing && !formData.classId) {
      newErrors.classId = "La classe est requise";
    }
    if (inscriptionPaid && !inscriptionAmount) {
      newErrors.inscriptionAmount = "Le montant est requis";
    }
    if (firstEcolagePaid && !firstEcolageAmount) {
      newErrors.firstEcolageAmount = "Le montant est requis";
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
      const studentUrl = isEditing ? `/api/eleves/${student.id}` : "/api/eleves";
      const studentMethod = isEditing ? "PUT" : "POST";

      const studentBody: Record<string, unknown> = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        address: formData.address.trim() || null,
        phone: formData.phone.trim() || null,
        photo: formData.photo.trim() || null,
        parentName: formData.parentName.trim() || null,
        parentPhone: formData.parentPhone.trim() || null,
        parentEmail: formData.parentEmail.trim() || null,
        parentRelation: formData.parentRelation.trim() || null,
      };

      const studentRes = await fetch(studentUrl, {
        method: studentMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentBody),
      });

      const studentData = await studentRes.json();

      if (!studentRes.ok) {
        throw new Error(studentData.error || "Une erreur est survenue lors de la création de l'élève");
      }

      const createdStudentId: string = studentData.id;

      if (!isEditing && formData.classId) {
        const inscriptionRes = await fetch("/api/inscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: createdStudentId,
            classId: formData.classId,
            schoolYearId: classes.find((c) => c.id === formData.classId)?.schoolYearId,
          }),
        });

        const inscriptionData = await inscriptionRes.json();
        if (!inscriptionRes.ok) {
          throw new Error(inscriptionData.error || "Erreur lors de l'inscription");
        }

        const inscriptionFee = classFees.find((f) =>
          f.paymentType.name.toLowerCase().includes("inscription")
        );

        if (inscriptionPaid && inscriptionFee && inscriptionAmount) {
          const paymentRes = await fetch("/api/paiements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentId: createdStudentId,
              paymentTypeId: inscriptionFee.paymentTypeId,
              amount: parseFloat(inscriptionAmount),
              paymentMethod: inscriptionMethod,
              reference: null,
              notes: "Paiement des frais d'inscription",
            }),
          });

          const paymentData = await paymentRes.json();
          if (!paymentRes.ok) {
            throw new Error(paymentData.error || "Erreur lors du paiement des frais d'inscription");
          }
        }

        const scolariteFee = classFees.find((f) =>
          f.paymentType.name.toLowerCase().includes("scolarit")
        );

        if (firstEcolagePaid && scolariteFee && firstEcolageAmount) {
          const paymentRes = await fetch("/api/paiements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentId: createdStudentId,
              paymentTypeId: scolariteFee.paymentTypeId,
              amount: parseFloat(firstEcolageAmount),
              paymentMethod: firstEcolageMethod,
              reference: null,
              notes: "Premier paiement de scolarité",
            }),
          });

          const paymentData = await paymentRes.json();
          if (!paymentRes.ok) {
            throw new Error(paymentData.error || "Erreur lors du paiement de scolarité");
          }
        }
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

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  function formatMGA(amount: string): string {
    const num = parseFloat(amount);
    if (isNaN(num)) return "";
    return num.toLocaleString("fr-FR") + " Ar";
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={!submitting ? onClose : undefined}
      />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? "Modifier l&apos;élève" : "Nouvel Élève"}
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

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Informations personnelles
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prénom *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.firstName ? "border-red-300" : "border-gray-300"
                  }`}
                />
                {errors.firstName && (
                  <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.lastName ? "border-red-300" : "border-gray-300"
                  }`}
                />
                {errors.lastName && (
                  <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de naissance *
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.dateOfBirth ? "border-red-300" : "border-gray-300"
                  }`}
                />
                {errors.dateOfBirth && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.dateOfBirth}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Genre *
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="MALE">Masculin</option>
                  <option value="FEMALE">Féminin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {!isEditing && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Inscription en classe
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Classe *
                  </label>
                  <select
                    name="classId"
                    value={formData.classId}
                    onChange={handleChange}
                    disabled={loadingClasses}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.classId ? "border-red-300" : "border-gray-300"
                    }`}
                  >
                    <option value="">
                      {loadingClasses ? "Chargement..." : "Sélectionner une classe"}
                    </option>
                    {classes.map((classe) => (
                      <option key={classe.id} value={classe.id}>
                        {classe.name} - {classe.level}
                      </option>
                    ))}
                  </select>
                  {errors.classId && (
                    <p className="text-xs text-red-500 mt-1">{errors.classId}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {!isEditing && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Photo
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL de la photo
                  </label>
                  <input
                    type="url"
                    name="photo"
                    value={formData.photo}
                    onChange={handleChange}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {!isEditing && formData.classId && (
            <>
              <div>
                <button
                  type="button"
                  onClick={() => setShowInscriptionSection(!showInscriptionSection)}
                  className="flex items-center justify-between w-full text-sm font-medium text-gray-700 mb-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span>Frais d&apos;inscription</span>
                  {showInscriptionSection ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {showInscriptionSection && (
                  <div className="space-y-4 pl-2 border-l-2 border-gray-200 ml-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="inscriptionPaid"
                        checked={inscriptionPaid}
                        onChange={(e) => setInscriptionPaid(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <label htmlFor="inscriptionPaid" className="text-sm text-gray-700">
                        Frais d&apos;inscription payés
                      </label>
                    </div>
                    {inscriptionPaid && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Montant (Ar)
                          </label>
                          <input
                            type="number"
                            value={inscriptionAmount}
                            onChange={(e) => setInscriptionAmount(e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              errors.inscriptionAmount ? "border-red-300" : "border-gray-300"
                            }`}
                          />
                          {inscriptionAmount && (
                            <p className="text-xs text-gray-500 mt-1">{formatMGA(inscriptionAmount)}</p>
                          )}
                          {errors.inscriptionAmount && (
                            <p className="text-xs text-red-500 mt-1">{errors.inscriptionAmount}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mode de paiement
                          </label>
                          <select
                            value={inscriptionMethod}
                            onChange={(e) => setInscriptionMethod(e.target.value as PaymentMethod)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {paymentMethods.map((m) => (
                              <option key={m.value} value={m.value}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date
                          </label>
                          <input
                            type="date"
                            value={inscriptionDate}
                            onChange={(e) => setInscriptionDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowEcolageSection(!showEcolageSection)}
                  className="flex items-center justify-between w-full text-sm font-medium text-gray-700 mb-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span>Premier paiement de scolarité</span>
                  {showEcolageSection ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {showEcolageSection && (
                  <div className="space-y-4 pl-2 border-l-2 border-gray-200 ml-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="firstEcolagePaid"
                        checked={firstEcolagePaid}
                        onChange={(e) => setFirstEcolagePaid(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <label htmlFor="firstEcolagePaid" className="text-sm text-gray-700">
                        Payer le premier mois de scolarité
                      </label>
                    </div>
                    {firstEcolagePaid && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Montant (Ar)
                          </label>
                          <input
                            type="number"
                            value={firstEcolageAmount}
                            onChange={(e) => setFirstEcolageAmount(e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              errors.firstEcolageAmount ? "border-red-300" : "border-gray-300"
                            }`}
                          />
                          {firstEcolageAmount && (
                            <p className="text-xs text-gray-500 mt-1">{formatMGA(firstEcolageAmount)}</p>
                          )}
                          {errors.firstEcolageAmount && (
                            <p className="text-xs text-red-500 mt-1">{errors.firstEcolageAmount}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mode de paiement
                          </label>
                          <select
                            value={firstEcolageMethod}
                            onChange={(e) => setFirstEcolageMethod(e.target.value as PaymentMethod)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {paymentMethods.map((m) => (
                              <option key={m.value} value={m.value}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date
                          </label>
                          <input
                            type="date"
                            value={firstEcolageDate}
                            onChange={(e) => setFirstEcolageDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Parent / Tuteur
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom complet
                </label>
                <input
                  type="text"
                  name="parentName"
                  value={formData.parentName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lien de parenté
                </label>
                <input
                  type="text"
                  name="parentRelation"
                  value={formData.parentRelation}
                  onChange={handleChange}
                  placeholder="Père, Mère, Tuteur..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="text"
                  name="parentPhone"
                  value={formData.parentPhone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="parentEmail"
                  value={formData.parentEmail}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

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
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? "Enregistrer" : "Créer l'élève"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
