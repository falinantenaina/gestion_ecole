"use client";

import { SessionProvider } from "next-auth/react";
import { SchoolYearProvider } from "@/components/providers/school-year-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SchoolYearProvider>{children}</SchoolYearProvider>
    </SessionProvider>
  );
}
