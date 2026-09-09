// ──────────────────────────────────────────────
// ENUMS
// ──────────────────────────────────────────────

export type Role =
  | "ADMIN"
  | "DIRECTOR"
  | "SECRETARY"
  | "TEACHER"
  | "PARENT"
  | "STUDENT"
  | "ACCOUNTANT";

export type Gender = "MALE" | "FEMALE";

export type EnrollmentStatus =
  | "PENDING"
  | "VALIDATED"
  | "CANCELLED"
  | "COMPLETED";

export type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "JUSTIFIED_ABSENT";

export type PaymentMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "MOBILE_MONEY"
  | "CREDIT_CARD";

export type EvaluationType =
  | "HOMEWORK"
  | "QUIZ"
  | "EXAM"
  | "PARTICIPATION"
  | "PROJECT";

export type TermPeriod =
  | "TRIMESTER_1"
  | "TRIMESTER_2"
  | "TRIMESTER_3"
  | "SEMESTER_1"
  | "SEMESTER_2";

// ──────────────────────────────────────────────
// MODELS
// ──────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatar?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  userId: string;
  user?: User;
  matricule: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  photo?: string | null;
  placeOfBirth?: string | null;
  nationality?: string | null;
  bloodGroup?: string | null;
  medicalNotes?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  parentEmail?: string | null;
  parentRelation?: string | null;
  enrollments?: Enrollment[];
  grades?: Grade[];
  attendance?: Attendance[];
  payments?: Payment[];
  createdAt: string;
  updatedAt: string;
}

export interface Teacher {
  id: string;
  userId: string;
  user?: User;
  employeeId: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  hireDate?: string | null;
  qualification?: string | null;
  specialization?: string | null;
  isActive: boolean;
  teacherSubjects?: TeacherSubject[];
  teacherClasses?: TeacherClass[];
  grades?: Grade[];
  attendance?: Attendance[];
  createdAt: string;
  updatedAt: string;
}

export interface Parent {
  id: string;
  userId: string;
  user?: User;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  occupation?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  terms?: Term[];
  classes?: Class[];
  enrollments?: Enrollment[];
  grades?: Grade[];
  createdAt: string;
  updatedAt: string;
}

export interface Term {
  id: string;
  name: string;
  period: TermPeriod;
  startDate: string;
  endDate: string;
  schoolYearId: string;
  schoolYear?: SchoolYear;
  grades?: Grade[];
  createdAt: string;
  updatedAt: string;
}

export interface Class {
  id: string;
  name: string;
  level: string;
  section?: string | null;
  capacity: number;
  schoolYearId: string;
  schoolYear?: SchoolYear;
  description?: string | null;
  enrollments?: Enrollment[];
  teacherClasses?: TeacherClass[];
  subjects?: ClassSubject[];
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  coefficient: number;
  teacherSubjects?: TeacherSubject[];
  classSubjects?: ClassSubject[];
  grades?: Grade[];
  createdAt: string;
  updatedAt: string;
}

export interface TeacherSubject {
  id: string;
  teacherId: string;
  subjectId: string;
  teacher?: Teacher;
  subject?: Subject;
  createdAt: string;
}

export interface TeacherClass {
  id: string;
  teacherId: string;
  classId: string;
  teacher?: Teacher;
  class?: Class;
  createdAt: string;
}

export interface ClassSubject {
  id: string;
  classId: string;
  subjectId: string;
  class?: Class;
  subject?: Subject;
  createdAt: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  classId: string;
  schoolYearId: string;
  status: EnrollmentStatus;
  enrollmentDate: string;
  notes?: string | null;
  student?: Student;
  class?: Class;
  schoolYear?: SchoolYear;
  createdAt: string;
  updatedAt: string;
}

export interface Grade {
  id: string;
  studentId: string;
  subjectId: string;
  teacherId: string;
  schoolYearId: string;
  termId: string;
  classId: string;
  evaluationType: EvaluationType;
  score: number;
  maxScore: number;
  coefficient: number;
  comment?: string | null;
  evaluationName?: string | null;
  evaluationDate: string;
  student?: Student;
  subject?: Subject;
  teacher?: Teacher;
  schoolYear?: SchoolYear;
  term?: Term;
  class?: Class;
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  classId: string;
  teacherId: string;
  date: string;
  status: AttendanceStatus;
  reason?: string | null;
  notes?: string | null;
  student?: Student;
  class?: Class;
  teacher?: Teacher;
  createdAt: string;
}

export interface PaymentType {
  id: string;
  name: string;
  description?: string | null;
  amount: number;
  payments?: Payment[];
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  studentId: string;
  paymentTypeId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  paymentDate: string;
  student?: Student;
  paymentType?: PaymentType;
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  target?: string | null;
  isActive: boolean;
  publishAt: string;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

// ──────────────────────────────────────────────
// API RESPONSES
// ──────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, string>;
}

// ──────────────────────────────────────────────
// DASHBOARD
// ──────────────────────────────────────────────

export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalEnrollments: number;
  activeEnrollments: number;
  pendingEnrollments: number;
  totalPayments: number;
  totalPaymentAmount: number;
  recentPayments: Payment[];
  recentEnrollments: Enrollment[];
  attendanceToday: {
    present: number;
    absent: number;
    late: number;
  };
  gradeAverages: {
    subjectName: string;
    average: number;
  }[];
  monthlyEnrollments: {
    month: string;
    count: number;
  }[];
  monthlyPayments: {
    month: string;
    total: number;
  }[];
}

export interface StudentDashboard {
  student: Student;
  currentEnrollment?: Enrollment;
  recentGrades: Grade[];
  averageBySubject: {
    subject: Subject;
    average: number;
    coefficient: number;
  }[];
  overallAverage: number;
  attendanceSummary: {
    total: number;
    present: number;
    absent: number;
    late: number;
  };
  recentPayments: Payment[];
  upcomingPayments: {
    paymentType: PaymentType;
    amount: number;
  }[];
}

export interface TeacherDashboard {
  teacher: Teacher;
  classes: Class[];
  subjects: Subject[];
  studentsCount: number;
  todayAttendance: {
    classId: string;
    className: string;
    present: number;
    absent: number;
    late: number;
  }[];
  recentGrades: Grade[];
}

// ──────────────────────────────────────────────
// REPORTS
// ──────────────────────────────────────────────

export interface StudentReport {
  student: Student;
  schoolYear: SchoolYear;
  term: Term;
  class: Class;
  grades: Grade[];
  subjectAverages: {
    subject: Subject;
    scores: { score: number; maxScore: number; coefficient: number }[];
    average: number;
    rank: number;
  }[];
  overallAverage: number;
  overallRank: number;
  attendanceSummary: {
    totalDays: number;
    present: number;
    absent: number;
    late: number;
    justified: number;
    percentage: number;
  };
  decision: "PASS" | "FAIL" | "PENDING";
  mention?: string;
}

export interface ClassReport {
  class: Class;
  schoolYear: SchoolYear;
  term: Term;
  studentCount: number;
  averageScore: number;
  passRate: number;
  topStudents: {
    student: Student;
    average: number;
    rank: number;
  }[];
  subjectAverages: {
    subject: Subject;
    average: number;
  }[];
  gradeDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
}

export interface SchoolReport {
  schoolYear: SchoolYear;
  term?: Term;
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  averageScore: number;
  passRate: number;
  classReports: ClassReport[];
  paymentSummary: {
    totalCollected: number;
    totalExpected: number;
    collectionRate: number;
    byType: {
      paymentType: PaymentType;
      collected: number;
      expected: number;
    }[];
  };
}

// ──────────────────────────────────────────────
// SESSION EXTENSION
// ──────────────────────────────────────────────

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
    };
  }

  interface User {
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    id: string;
  }
}
