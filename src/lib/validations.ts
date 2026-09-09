import { z } from "zod";

// ──────────────────────────────────────────────
// AUTH
// ──────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("Adresse email invalide"),
  password: z
    .string()
    .min(1, "Le mot de passe est requis")
    .min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ──────────────────────────────────────────────
// STUDENT
// ──────────────────────────────────────────────

export const studentSchema = z.object({
  userId: z.string().uuid("Identifiant utilisateur invalide").optional(),
  matricule: z
    .string()
    .min(1, "Le matricule est requis")
    .max(50, "Le matricule ne peut dépasser 50 caractères"),
  firstName: z
    .string()
    .min(1, "Le prénom est requis")
    .max(100, "Le prénom ne peut dépasser 100 caractères"),
  lastName: z
    .string()
    .min(1, "Le nom est requis")
    .max(100, "Le nom ne peut dépasser 100 caractères"),
  dateOfBirth: z.coerce.date({ message: "Date de naissance invalide" }),
  gender: z.enum(["MALE", "FEMALE"], {
    message: "Le genre est requis",
  }),
  address: z.string().max(255).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email("Adresse email invalide").optional().nullable(),
  photo: z.string().url().optional().nullable(),
  placeOfBirth: z.string().max(100).optional().nullable(),
  nationality: z.string().max(100).optional().nullable(),
  bloodGroup: z.string().max(10).optional().nullable(),
  medicalNotes: z.string().max(500).optional().nullable(),
  parentName: z.string().max(200).optional().nullable(),
  parentPhone: z.string().max(20).optional().nullable(),
  parentEmail: z.string().email("Adresse email invalide").optional().nullable(),
  parentRelation: z.string().max(50).optional().nullable(),
});

export type StudentInput = z.infer<typeof studentSchema>;

// ──────────────────────────────────────────────
// TEACHER
// ──────────────────────────────────────────────

export const teacherSchema = z.object({
  userId: z.string().uuid("Identifiant utilisateur invalide").optional(),
  employeeId: z
    .string()
    .min(1, "L'identifiant employé est requis")
    .max(50, "L'identifiant employé ne peut dépasser 50 caractères"),
  firstName: z
    .string()
    .min(1, "Le prénom est requis")
    .max(100, "Le prénom ne peut dépasser 100 caractères"),
  lastName: z
    .string()
    .min(1, "Le nom est requis")
    .max(100, "Le nom ne peut dépasser 100 caractères"),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email("Adresse email invalide").optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  hireDate: z.coerce.date().optional().nullable(),
  qualification: z.string().max(200).optional().nullable(),
  specialization: z.string().max(200).optional().nullable(),
  isActive: z.boolean().default(true),
});

export type TeacherInput = z.infer<typeof teacherSchema>;

// ──────────────────────────────────────────────
// CLASS
// ──────────────────────────────────────────────

export const classSchema = z.object({
  name: z
    .string()
    .min(1, "Le nom de la classe est requis")
    .max(50, "Le nom ne peut dépasser 50 caractères"),
  level: z
    .string()
    .min(1, "Le niveau est requis")
    .max(50, "Le niveau ne peut dépasser 50 caractères"),
  section: z.string().max(50).optional().nullable(),
  capacity: z
    .number()
    .int("La capacité doit être un nombre entier")
    .min(1, "La capacité doit être d'au moins 1")
    .default(40),
  schoolYearId: z.string().uuid("Identifiant année scolaire invalide"),
  description: z.string().max(500).optional().nullable(),
});

export type ClassInput = z.infer<typeof classSchema>;

// ──────────────────────────────────────────────
// SUBJECT
// ──────────────────────────────────────────────

export const subjectSchema = z.object({
  name: z
    .string()
    .min(1, "Le nom de la matière est requis")
    .max(100, "Le nom ne peut dépasser 100 caractères"),
  code: z
    .string()
    .min(1, "Le code est requis")
    .max(20, "Le code ne peut dépasser 20 caractères"),
  description: z.string().max(500).optional().nullable(),
  coefficient: z
    .number()
    .min(0.1, "Le coefficient doit être supérieur à 0")
    .max(10, "Le coefficient ne peut dépasser 10")
    .default(1),
});

export type SubjectInput = z.infer<typeof subjectSchema>;

// ──────────────────────────────────────────────
// ENROLLMENT
// ──────────────────────────────────────────────

export const enrollmentSchema = z.object({
  studentId: z.string().uuid("Identifiant étudiant invalide"),
  classId: z.string().uuid("Identifiant classe invalide"),
  schoolYearId: z.string().uuid("Identifiant année scolaire invalide"),
  status: z
    .enum(["PENDING", "VALIDATED", "CANCELLED", "COMPLETED"], {
      message: "Statut invalide",
    })
    .default("PENDING"),
  enrollmentDate: z.coerce.date().optional(),
  notes: z.string().max(500).optional().nullable(),
});

export type EnrollmentInput = z.infer<typeof enrollmentSchema>;

// ──────────────────────────────────────────────
// GRADE
// ──────────────────────────────────────────────

export const gradeSchema = z.object({
  studentId: z.string().uuid("Identifiant étudiant invalide"),
  subjectId: z.string().uuid("Identifiant matière invalide"),
  teacherId: z.string().uuid("Identifiant enseignant invalide"),
  schoolYearId: z.string().uuid("Identifiant année scolaire invalide"),
  termId: z.string().uuid("Identifiant trimestre invalide"),
  classId: z.string().uuid("Identifiant classe invalide"),
  evaluationType: z.enum(
    ["HOMEWORK", "QUIZ", "EXAM", "PARTICIPATION", "PROJECT"],
    { message: "Type d'évaluation invalide" }
  ),
  score: z
    .number()
    .min(0, "La note ne peut être négative")
    .max(20, "La note ne peut dépasser 20"),
  maxScore: z
    .number()
    .min(1, "La note maximale doit être d'au moins 1")
    .default(20),
  coefficient: z
    .number()
    .min(0.1, "Le coefficient doit être supérieur à 0")
    .max(10, "Le coefficient ne peut dépasser 10")
    .default(1),
  comment: z.string().max(500).optional().nullable(),
  evaluationName: z.string().max(200).optional().nullable(),
  evaluationDate: z.coerce.date().optional(),
});

export type GradeInput = z.infer<typeof gradeSchema>;

// ──────────────────────────────────────────────
// PAYMENT
// ──────────────────────────────────────────────

export const paymentSchema = z.object({
  studentId: z.string().uuid("Identifiant étudiant invalide"),
  paymentTypeId: z.string().uuid("Identifiant type de paiement invalide"),
  amount: z
    .number()
    .min(0.01, "Le montant doit être supérieur à 0"),
  paymentMethod: z.enum(
    ["CASH", "BANK_TRANSFER", "MOBILE_MONEY", "CREDIT_CARD"],
    { message: "Mode de paiement invalide" }
  ),
  reference: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  paymentDate: z.coerce.date().optional(),
});

export type PaymentInput = z.infer<typeof paymentSchema>;

// ──────────────────────────────────────────────
// PAYMENT TYPE
// ──────────────────────────────────────────────

export const paymentTypeSchema = z.object({
  name: z
    .string()
    .min(1, "Le nom est requis")
    .max(100, "Le nom ne peut dépasser 100 caractères"),
  description: z.string().max(500).optional().nullable(),
  amount: z.number().min(0, "Le montant ne peut être négatif"),
});

export type PaymentTypeInput = z.infer<typeof paymentTypeSchema>;

// ──────────────────────────────────────────────
// SCHOOL YEAR
// ──────────────────────────────────────────────

export const schoolYearSchema = z
  .object({
    name: z
      .string()
      .min(1, "Le nom est requis")
      .max(20, "Le nom ne peut dépasser 20 caractères"),
    startDate: z.coerce.date({ message: "Date de début invalide" }),
    endDate: z.coerce.date({ message: "Date de fin invalide" }),
    isCurrent: z.boolean().default(false),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "La date de fin doit être après la date de début",
    path: ["endDate"],
  });

export type SchoolYearInput = z.infer<typeof schoolYearSchema>;

// ──────────────────────────────────────────────
// TERM
// ──────────────────────────────────────────────

export const termSchema = z
  .object({
    name: z
      .string()
      .min(1, "Le nom est requis")
      .max(100, "Le nom ne peut dépasser 100 caractères"),
    period: z.enum(
      ["TRIMESTER_1", "TRIMESTER_2", "TRIMESTER_3", "SEMESTER_1", "SEMESTER_2"],
      { message: "Période invalide" }
    ),
    startDate: z.coerce.date({ message: "Date de début invalide" }),
    endDate: z.coerce.date({ message: "Date de fin invalide" }),
    schoolYearId: z.string().uuid("Identifiant année scolaire invalide"),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "La date de fin doit être après la date de début",
    path: ["endDate"],
  });

export type TermInput = z.infer<typeof termSchema>;

// ──────────────────────────────────────────────
// ATTENDANCE
// ──────────────────────────────────────────────

export const attendanceSchema = z.object({
  studentId: z.string().uuid("Identifiant étudiant invalide"),
  classId: z.string().uuid("Identifiant classe invalide"),
  teacherId: z.string().uuid("Identifiant enseignant invalide"),
  date: z.coerce.date({ message: "Date invalide" }),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "JUSTIFIED_ABSENT"], {
    message: "Statut de présence invalide",
  }),
  reason: z.string().max(500).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export type AttendanceInput = z.infer<typeof attendanceSchema>;

// ──────────────────────────────────────────────
// USER
// ──────────────────────────────────────────────

export const userSchema = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("Adresse email invalide"),
  password: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  role: z.enum(
    ["ADMIN", "DIRECTOR", "SECRETARY", "TEACHER", "PARENT", "STUDENT", "ACCOUNTANT"],
    { message: "Rôle invalide" }
  ),
  firstName: z
    .string()
    .min(1, "Le prénom est requis")
    .max(100, "Le prénom ne peut dépasser 100 caractères"),
  lastName: z
    .string()
    .min(1, "Le nom est requis")
    .max(100, "Le nom ne peut dépasser 100 caractères"),
  phone: z.string().max(20).optional().nullable(),
  avatar: z.string().url().optional().nullable(),
  isActive: z.boolean().default(true),
});

export type UserInput = z.infer<typeof userSchema>;

// ──────────────────────────────────────────────
// ANNOUNCEMENT
// ──────────────────────────────────────────────

export const announcementSchema = z.object({
  title: z
    .string()
    .min(1, "Le titre est requis")
    .max(200, "Le titre ne peut dépasser 200 caractères"),
  content: z.string().min(1, "Le contenu est requis"),
  authorId: z.string().uuid("Identifiant auteur invalide"),
  target: z.string().max(50).optional().nullable(),
  isActive: z.boolean().default(true),
  publishAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional().nullable(),
});

export type AnnouncementInput = z.infer<typeof announcementSchema>;

// ──────────────────────────────────────────────
// SCHEDULE
// ──────────────────────────────────────────────

export const scheduleSchema = z.object({
  classId: z.string().uuid("Identifiant classe invalide"),
  subjectId: z.string().uuid("Identifiant matière invalide"),
  teacherId: z.string().uuid("Identifiant enseignant invalide"),
  dayOfWeek: z
    .number()
    .int("Le jour doit être un nombre entier")
    .min(0, "Le jour doit être entre 0 et 6")
    .max(6, "Le jour doit être entre 0 et 6"),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Format d'heure invalide (HH:MM)"),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Format d'heure invalide (HH:MM)"),
  room: z.string().max(50).optional().nullable(),
});

export type ScheduleInput = z.infer<typeof scheduleSchema>;

// ──────────────────────────────────────────────
// PARENT
// ──────────────────────────────────────────────

export const parentSchema = z.object({
  userId: z.string().uuid("Identifiant utilisateur invalide").optional(),
  firstName: z
    .string()
    .min(1, "Le prénom est requis")
    .max(100, "Le prénom ne peut dépasser 100 caractères"),
  lastName: z
    .string()
    .min(1, "Le nom est requis")
    .max(100, "Le nom ne peut dépasser 100 caractères"),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email("Adresse email invalide").optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  occupation: z.string().max(100).optional().nullable(),
});

export type ParentInput = z.infer<typeof parentSchema>;
