"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface SchoolYear {
  id: string;
  name: string;
  startMonth: number;
  endMonth: number;
  isCurrent: boolean;
}

interface SchoolYearContextType {
  schoolYears: SchoolYear[];
  selectedYear: SchoolYear | null;
  setSelectedYear: (sy: SchoolYear) => void;
  loading: boolean;
}

const SchoolYearContext = createContext<SchoolYearContextType>({
  schoolYears: [],
  selectedYear: null,
  setSelectedYear: () => {},
  loading: true,
});

export function useSchoolYear() {
  return useContext(SchoolYearContext);
}

export function SchoolYearProvider({ children }: { children: ReactNode }) {
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [selectedYear, setSelectedYearState] = useState<SchoolYear | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchYears = useCallback(async () => {
    try {
      const res = await fetch("/api/school-years");
      const data = await res.json();
      const years = data.data || [];
      setSchoolYears(years);

      // Restore from localStorage or use current
      const savedId = typeof window !== "undefined" ? localStorage.getItem("selectedSchoolYearId") : null;
      const saved = years.find((y: SchoolYear) => y.id === savedId);
      const current = years.find((y: SchoolYear) => y.isCurrent);

      setSelectedYearState(saved || current || years[0] || null);
    } catch {
      setSchoolYears([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchYears();
  }, [fetchYears]);

  const setSelectedYear = useCallback((sy: SchoolYear) => {
    setSelectedYearState(sy);
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedSchoolYearId", sy.id);
    }
  }, []);

  return (
    <SchoolYearContext.Provider value={{ schoolYears, selectedYear, setSelectedYear, loading }}>
      {children}
    </SchoolYearContext.Provider>
  );
}
