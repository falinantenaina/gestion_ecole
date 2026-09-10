"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Users,
  Library,
  FileText,
  Award,
  CreditCard,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Banknote,
} from "lucide-react";
import type { Role } from "@/types";

interface SidebarProps {
  user: {
    name: string;
    email: string;
    role: Role;
  };
}

const allNavigation = [
  { name: "Tableau de bord", href: "/", icon: LayoutDashboard, roles: ["ADMIN", "DIRECTOR", "SECRETARY", "TEACHER", "PARENT", "STUDENT", "ACCOUNTANT"] as Role[] },
  { name: "Élèves", href: "/eleves", icon: GraduationCap, roles: ["ADMIN", "DIRECTOR", "SECRETARY", "TEACHER"] as Role[] },
  { name: "Enseignants", href: "/enseignants", icon: BookOpen, roles: ["ADMIN", "DIRECTOR", "SECRETARY"] as Role[] },
  { name: "Classes", href: "/classes", icon: Users, roles: ["ADMIN", "DIRECTOR", "SECRETARY", "TEACHER"] as Role[] },
  { name: "Matières", href: "/matieres", icon: Library, roles: ["ADMIN", "DIRECTOR", "SECRETARY"] as Role[] },
  { name: "Inscriptions", href: "/inscriptions", icon: FileText, roles: ["ADMIN", "DIRECTOR", "SECRETARY"] as Role[] },
  { name: "Notes", href: "/notes", icon: Award, roles: ["ADMIN", "DIRECTOR", "TEACHER", "STUDENT", "PARENT"] as Role[] },
  { name: "Écolage", href: "/ecolage", icon: Banknote, roles: ["ADMIN", "DIRECTOR", "SECRETARY", "ACCOUNTANT"] as Role[] },
  { name: "Paiements", href: "/paiements", icon: CreditCard, roles: ["ADMIN", "DIRECTOR", "SECRETARY", "ACCOUNTANT", "STUDENT", "PARENT"] as Role[] },
  { name: "Rapports", href: "/rapports", icon: BarChart3, roles: ["ADMIN", "DIRECTOR"] as Role[] },
];

const roleLabels: Record<Role, string> = {
  ADMIN: "Administrateur",
  DIRECTOR: "Directeur",
  SECRETARY: "Secrétaire",
  TEACHER: "Enseignant",
  PARENT: "Parent",
  STUDENT: "Élève",
  ACCOUNTANT: "Comptable",
};

const roleBadgeColors: Record<Role, string> = {
  ADMIN: "bg-red-500/20 text-red-200",
  DIRECTOR: "bg-purple-500/20 text-purple-200",
  SECRETARY: "bg-blue-500/20 text-blue-200",
  TEACHER: "bg-green-500/20 text-green-200",
  PARENT: "bg-orange-500/20 text-orange-200",
  STUDENT: "bg-cyan-500/20 text-cyan-200",
  ACCOUNTANT: "bg-yellow-500/20 text-yellow-200",
};

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div
        className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-4 py-5 border-b border-indigo-700`}
      >
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-indigo-700" />
            </div>
            <span className="text-lg font-bold text-white truncate">
              GestionÉcole
            </span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-indigo-700" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`hidden lg:flex p-1 rounded-md text-indigo-300 hover:text-white hover:bg-indigo-600 transition-colors ${collapsed ? "absolute top-5 right-2" : ""}`}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {allNavigation
          .filter((item) => item.roles.includes(user.role))
          .map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-indigo-200 hover:bg-white/10 hover:text-white"
                } ${collapsed ? "justify-center" : ""}`}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
      </nav>

      <div className="border-t border-indigo-700 p-3">
        {!collapsed && (
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.name}
              </p>
              <span
                className={`inline-block text-xs px-2 py-0.5 rounded-full mt-0.5 ${roleBadgeColors[user.role]}`}
              >
                {roleLabels[user.role]}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-indigo-200 hover:bg-white/10 hover:text-white transition-colors ${collapsed ? "justify-center" : ""}`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-indigo-700 rounded-lg text-white hover:bg-indigo-600 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full bg-indigo-800 z-50 transition-all duration-300 lg:relative ${
          collapsed ? "w-20" : "w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden absolute top-4 right-3 p-1 text-indigo-300 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        {sidebarContent}
      </aside>
    </>
  );
}
