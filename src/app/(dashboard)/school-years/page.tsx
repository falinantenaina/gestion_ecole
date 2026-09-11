"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, Plus, Pencil, Trash2, Check, Loader2 } from "lucide-react";

const monthNames = [
  "", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

interface SchoolYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  startMonth: number;
  endMonth: number;
  isCurrent: boolean;
  terms: any[];
}

export default function SchoolYearsPage() {
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolYear | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    startMonth: 10,
    endMonth: 7,
    isCurrent: false,
  });

  const fetchSchoolYears = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/school-years");
      const data = await res.json();
      setSchoolYears(data.data || []);
    } catch {
      setSchoolYears([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSchoolYears(); }, [fetchSchoolYears]);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", startDate: "", endDate: "", startMonth: 10, endMonth: 7, isCurrent: false });
    setModalOpen(true);
  }

  function openEdit(sy: SchoolYear) {
    setEditing(sy);
    setForm({
      name: sy.name,
      startDate: sy.startDate.split("T")[0],
      endDate: sy.endDate.split("T")[0],
      startMonth: sy.startMonth,
      endMonth: sy.endMonth,
      isCurrent: sy.isCurrent,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const url = editing ? `/api/school-years/${editing.id}` : "/api/school-years";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setModalOpen(false);
        fetchSchoolYears();
      } else {
        const err = await res.json();
        alert(err.error || "Erreur");
      }
    } catch {
      alert("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette année scolaire ?")) return;
    try {
      await fetch(`/api/school-years/${id}`, { method: "DELETE" });
      fetchSchoolYears();
    } catch {
      alert("Erreur lors de la suppression");
    }
  }

  async function handleSetCurrent(id: string) {
    try {
      await fetch(`/api/school-years/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCurrent: true }),
      });
      fetchSchoolYears();
    } catch {
      alert("Erreur");
    }
  }

  const fmt = (v: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "MGA", minimumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Années Scolaires</h1>
          <p className="text-sm text-gray-500">Gérer les années scolaires et les mois d'écolage</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> Nouvelle Année
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
      ) : schoolYears.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucune année scolaire configurée</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {schoolYears.map((sy) => (
            <div key={sy.id} className={`bg-white rounded-xl border p-5 ${sy.isCurrent ? "border-indigo-300 ring-1 ring-indigo-100" : "border-gray-100"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">{sy.name}</h3>
                    {sy.isCurrent && (
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">Active</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Du {new Date(sy.startDate).toLocaleDateString("fr-FR")} au {new Date(sy.endDate).toLocaleDateString("fr-FR")}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Mois d&apos;écolage : <span className="font-medium">{monthNames[sy.startMonth]}</span> → <span className="font-medium">{monthNames[sy.endMonth]}</span> (10 mois)
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{sy.terms?.length || 0} trimestres</p>
                </div>
                <div className="flex items-center gap-2">
                  {!sy.isCurrent && (
                    <button onClick={() => handleSetCurrent(sy.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Définir comme active">
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => openEdit(sy)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                    <Pencil className="w-4 h-4" />
                  </button>
                  {!sy.isCurrent && (
                    <button onClick={() => handleDelete(sy.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">
              {editing ? "Modifier l'année scolaire" : "Nouvelle année scolaire"}
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="2026-2027" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date début *</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date fin *</label>
                <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mois début</label>
                <select value={form.startMonth} onChange={(e) => setForm({ ...form, startMonth: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                  {monthNames.slice(1).map((name, i) => (
                    <option key={i + 1} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mois fin</label>
                <select value={form.endMonth} onChange={(e) => setForm({ ...form, endMonth: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                  {monthNames.slice(1).map((name, i) => (
                    <option key={i + 1} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="isCurrent" checked={form.isCurrent} onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <label htmlFor="isCurrent" className="text-sm text-gray-700">Année scolaire active</label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
              <button onClick={handleSave} disabled={saving || !form.name || !form.startDate || !form.endDate}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? "Enregistrer" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
