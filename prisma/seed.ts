import { PrismaClient, Role, Gender, EnrollmentStatus, TermPeriod } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.paymentType.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.classSubject.deleteMany();
  await prisma.teacherClass.deleteMany();
  await prisma.teacherSubject.deleteMany();
  await prisma.term.deleteMany();
  await prisma.class.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.schoolYear.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.student.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash("password123", 12);

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: "admin@ecole.fr",
      password,
      role: Role.ADMIN,
      firstName: "Admin",
      lastName: "Système",
      isActive: true,
    },
  });

  // Create secretary
  await prisma.user.create({
    data: {
      email: "secretaire@ecole.fr",
      password,
      role: Role.SECRETARY,
      firstName: "Rasoa",
      lastName: "Andria",
      isActive: true,
    },
  });

  // Create comptable
  await prisma.user.create({
    data: {
      email: "comptable@ecole.fr",
      password,
      role: Role.ACCOUNTANT,
      firstName: "Hery",
      lastName: "Ramananarivo",
      isActive: true,
    },
  });

  // Create school year (Oct 2026 - July 2027)
  const schoolYear = await prisma.schoolYear.create({
    data: {
      name: "2026-2027",
      startDate: new Date("2026-10-01"),
      endDate: new Date("2027-07-31"),
      startMonth: 10, // Octobre
      endMonth: 7,    // Juillet
      isCurrent: true,
    },
  });

  // Create terms
  const term1 = await prisma.term.create({
    data: {
      name: "Trimestre 1",
      period: TermPeriod.TRIMESTER_1,
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-12-20"),
      schoolYearId: schoolYear.id,
    },
  });

  const term2 = await prisma.term.create({
    data: {
      name: "Trimestre 2",
      period: TermPeriod.TRIMESTER_2,
      startDate: new Date("2027-01-05"),
      endDate: new Date("2027-03-31"),
      schoolYearId: schoolYear.id,
    },
  });

  const term3 = await prisma.term.create({
    data: {
      name: "Trimestre 3",
      period: TermPeriod.TRIMESTER_3,
      startDate: new Date("2027-04-01"),
      endDate: new Date("2027-06-30"),
      schoolYearId: schoolYear.id,
    },
  });

  // Create subjects
  const subjects = await Promise.all([
    prisma.subject.create({ data: { name: "Mathématiques", code: "MATH", description: "Mathématiques" } }),
    prisma.subject.create({ data: { name: "Français", code: "FRAN", description: "Français" } }),
    prisma.subject.create({ data: { name: "Anglais", code: "ANGL", description: "Anglais" } }),
    prisma.subject.create({ data: { name: "Histoire-Géographie", code: "HIST", description: "Histoire-Géographie" } }),
    prisma.subject.create({ data: { name: "Physique-Chimie", code: "PHYC", description: "Physique-Chimie" } }),
    prisma.subject.create({ data: { name: "SVT", code: "SVT", description: "Sciences de la Vie et de la Terre" } }),
    prisma.subject.create({ data: { name: "Informatique", code: "INFO", description: "Informatique" } }),
    prisma.subject.create({ data: { name: "EPS", code: "EPS", description: "Éducation Physique et Sportive" } }),
  ]);

  // Create classes
  const classes = await Promise.all([
    prisma.class.create({ data: { name: "6ème A", level: "Collège", section: "A", capacity: 40, schoolYearId: schoolYear.id } }),
    prisma.class.create({ data: { name: "5ème A", level: "Collège", section: "A", capacity: 40, schoolYearId: schoolYear.id } }),
    prisma.class.create({ data: { name: "4ème A", level: "Collège", section: "A", capacity: 35, schoolYearId: schoolYear.id } }),
    prisma.class.create({ data: { name: "3ème A", level: "Collège", section: "A", capacity: 35, schoolYearId: schoolYear.id } }),
    prisma.class.create({ data: { name: "Seconde A", level: "Lycée", section: "A", capacity: 30, schoolYearId: schoolYear.id } }),
    prisma.class.create({ data: { name: "Première A", level: "Lycée", section: "A", capacity: 30, schoolYearId: schoolYear.id } }),
    prisma.class.create({ data: { name: "Terminale A", level: "Lycée", section: "A", capacity: 30, schoolYearId: schoolYear.id } }),
  ]);

  // Create teachers
  const teacherData = [
    { firstName: "Marie", lastName: "Dupont", email: "m.dupont@ecole.fr", subjects: [0, 4], classes: [0, 1, 2] },
    { firstName: "Pierre", lastName: "Martin", email: "p.martin@ecole.fr", subjects: [1, 3], classes: [0, 1, 2, 3] },
    { firstName: "Sophie", lastName: "Bernard", email: "s.bernard@ecole.fr", subjects: [2], classes: [3, 4, 5] },
    { firstName: "Jean", lastName: "Petit", email: "j.petit@ecole.fr", subjects: [4, 5], classes: [4, 5, 6] },
    { firstName: "Claire", lastName: "Moreau", email: "c.moreau@ecole.fr", subjects: [6], classes: [0, 1, 2, 3, 4, 5, 6] },
    { firstName: "Thomas", lastName: "Leroy", email: "t.leroy@ecole.fr", subjects: [7], classes: [0, 1, 2, 3, 4, 5, 6] },
  ];

  const teachers = [];
  for (let i = 0; i < teacherData.length; i++) {
    const td = teacherData[i];
    const user = await prisma.user.create({
      data: {
        email: td.email,
        password,
        role: Role.TEACHER,
        firstName: td.firstName,
        lastName: td.lastName,
        isActive: true,
      },
    });

    const teacher = await prisma.teacher.create({
      data: {
        userId: user.id,
        employeeId: `ENS-2026-${String(i + 1).padStart(4, "0")}`,
        firstName: td.firstName,
        lastName: td.lastName,
        email: td.email,
        isActive: true,
      },
    });

    // Assign subjects
    for (const si of td.subjects) {
      await prisma.teacherSubject.create({
        data: { teacherId: teacher.id, subjectId: subjects[si].id },
      });
    }

    // Assign classes
    for (const ci of td.classes) {
      await prisma.teacherClass.create({
        data: { teacherId: teacher.id, classId: classes[ci].id },
      });
    }

    teachers.push(teacher);
  }

  // Assign subjects to classes with coefficients per class level
  // Coefficients vary: Collège < Lycée, and by subject importance
  const coefficientMap: Record<string, Record<string, number>> = {
    // Collège: coefficients généralement plus bas
    "Collège": { MATH: 4, FRAN: 4, ANGL: 3, HIST: 3, PHYC: 2, SVT: 2, INFO: 1, EPS: 1 },
    // Lycée: coefficients plus élevés pour les matières principales
    "Lycée":   { MATH: 7, FRAN: 5, ANGL: 4, HIST: 3, PHYC: 5, SVT: 4, INFO: 3, EPS: 1 },
  };

  for (const cls of classes) {
    const coeffs = coefficientMap[cls.level] || coefficientMap["Collège"];
    for (const sub of subjects) {
      await prisma.classSubject.create({
        data: {
          classId: cls.id,
          subjectId: sub.id,
          coefficient: coeffs[sub.code] || 1,
        },
      });
    }
  }

  // Create students
  const studentData = [
    { firstName: "Ahmed", lastName: "Ali", gender: Gender.MALE, classIndex: 0 },
    { firstName: "Fatima", lastName: "Benali", gender: Gender.FEMALE, classIndex: 0 },
    { firstName: "Karim", lastName: "Bouzid", gender: Gender.MALE, classIndex: 0 },
    { firstName: "Amina", lastName: "Charef", gender: Gender.FEMALE, classIndex: 1 },
    { firstName: "Youssef", lastName: "Djaballah", gender: Gender.MALE, classIndex: 1 },
    { firstName: "Nadia", lastName: "Ferhat", gender: Gender.FEMALE, classIndex: 1 },
    { firstName: "Mohamed", lastName: "Guedjali", gender: Gender.MALE, classIndex: 2 },
    { firstName: "Sarah", lastName: "Hadj", gender: Gender.FEMALE, classIndex: 2 },
    { firstName: "Omar", lastName: "Ibrahim", gender: Gender.MALE, classIndex: 3 },
    { firstName: "Leila", lastName: "Khelifi", gender: Gender.FEMALE, classIndex: 3 },
    { firstName: "Rachid", lastName: "Lalaoui", gender: Gender.MALE, classIndex: 4 },
    { firstName: "Meriem", lastName: "Mansouri", gender: Gender.FEMALE, classIndex: 4 },
    { firstName: "Samir", lastName: "Noui", gender: Gender.MALE, classIndex: 5 },
    { firstName: "Zineb", lastName: "Ouali", gender: Gender.FEMALE, classIndex: 5 },
    { firstName: "Hamza", lastName: "Rezgui", gender: Gender.MALE, classIndex: 6 },
    { firstName: "Ines", lastName: "Saadi", gender: Gender.FEMALE, classIndex: 6 },
  ];

  const students = [];
  for (let i = 0; i < studentData.length; i++) {
    const sd = studentData[i];
    const user = await prisma.user.create({
      data: {
        email: `${sd.firstName.toLowerCase()}.${sd.lastName.toLowerCase()}@ecole.fr`,
        password,
        role: Role.STUDENT,
        firstName: sd.firstName,
        lastName: sd.lastName,
        isActive: true,
      },
    });

    const student = await prisma.student.create({
      data: {
        userId: user.id,
        matricule: `ELV-2026-${String(i + 1).padStart(4, "0")}`,
        firstName: sd.firstName,
        lastName: sd.lastName,
        dateOfBirth: new Date(2010 - (classes[sd.classIndex].level === "Lycée" ? 4 : 0), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        gender: sd.gender,
        email: `${sd.firstName.toLowerCase()}.${sd.lastName.toLowerCase()}@ecole.fr`,
        parentName: `Parent de ${sd.firstName}`,
        parentPhone: `+213${String(Math.floor(Math.random() * 9000000000) + 1000000000)}`,
      },
    });

    // Create enrollment
    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        classId: classes[sd.classIndex].id,
        schoolYearId: schoolYear.id,
        status: EnrollmentStatus.VALIDATED,
      },
    });

    students.push(student);
  }

  // Create payment types
  const paymentTypes = await Promise.all([
    prisma.paymentType.create({ data: { name: "Frais de Scolarité", description: "Frais annuel de scolarité", amount: 50000 } }),
    prisma.paymentType.create({ data: { name: "Frais d'Inscription", description: "Frais d'inscription annuelle", amount: 15000 } }),
  ]);

  // Create class fees per class
  const feeConfigs = [
    // Collège classes (0-3)
    { classIndex: 0, fees: [
      { typeIndex: 0, amount: 45000 }, // Scolarité
      { typeIndex: 1, amount: 15000 }, // Inscription
    ]},
    { classIndex: 1, fees: [
      { typeIndex: 0, amount: 48000 },
      { typeIndex: 1, amount: 15000 },
    ]},
    { classIndex: 2, fees: [
      { typeIndex: 0, amount: 50000 },
      { typeIndex: 1, amount: 18000 },
    ]},
    { classIndex: 3, fees: [
      { typeIndex: 0, amount: 52000 },
      { typeIndex: 1, amount: 18000 },
    ]},
    // Lycée classes (4-6)
    { classIndex: 4, fees: [
      { typeIndex: 0, amount: 60000 },
      { typeIndex: 1, amount: 20000 },
    ]},
    { classIndex: 5, fees: [
      { typeIndex: 0, amount: 65000 },
      { typeIndex: 1, amount: 22000 },
    ]},
    { classIndex: 6, fees: [
      { typeIndex: 0, amount: 70000 },
      { typeIndex: 1, amount: 25000 },
    ]},
  ];

  for (const config of feeConfigs) {
    for (const fee of config.fees) {
      await prisma.classFee.create({
        data: {
          classId: classes[config.classIndex].id,
          paymentTypeId: paymentTypes[fee.typeIndex].id,
          amount: fee.amount,
          schoolYearId: schoolYear.id,
        },
      });
    }
  }

  // Create some payments (using class fee amounts)
  const paymentMethods = ["CASH", "BANK_TRANSFER", "MOBILE_MONEY", "CREDIT_CARD"] as const;
  for (let i = 0; i < 8; i++) {
    const student = students[i % students.length];
    const pt = paymentTypes[i % paymentTypes.length];
    // Get the class fee amount for this student's class
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId: student.id, status: "VALIDATED" },
    });
    const classFee = enrollment
      ? await prisma.classFee.findFirst({
          where: { classId: enrollment.classId, paymentTypeId: pt.id, schoolYearId: schoolYear.id },
        })
      : null;
    const amount = classFee?.amount || pt.amount;
    await prisma.payment.create({
      data: {
        studentId: student.id,
        paymentTypeId: pt.id,
        amount,
        paymentMethod: paymentMethods[i % paymentMethods.length],
        paymentDate: new Date(2026, 8, Math.floor(Math.random() * 28) + 1),
        notes: `Paiement ${pt.name}`,
      },
    });
  }

  // Create some grades
  const evalTypes = ["HOMEWORK", "QUIZ", "EXAM"] as const;
  for (const student of students.slice(0, 8)) {
    for (const sub of subjects.slice(0, 5)) {
      for (const evalType of evalTypes) {
        const score = Math.floor(Math.random() * 15) + 5;
        const studentClassIndex = studentData[students.indexOf(student)]?.classIndex ?? 0;
        const cls = classes[studentClassIndex];
        // Look up coefficient from ClassSubject
        const classSubject = await prisma.classSubject.findUnique({
          where: { classId_subjectId: { classId: cls.id, subjectId: sub.id } },
        });
        await prisma.grade.create({
          data: {
            studentId: student.id,
            subjectId: sub.id,
            teacherId: teachers[0].id,
            schoolYearId: schoolYear.id,
            termId: term1.id,
            classId: cls.id,
            evaluationType: evalType as any,
            score,
            maxScore: 20,
            coefficient: classSubject?.coefficient || 1,
            evaluationName: `${evalType} ${sub.name}`,
          },
        });
      }
    }
  }

  // Create announcements
  await prisma.announcement.create({
    data: {
      title: "Bienvenue pour l'année 2026-2027",
      content: "Bienvenue à tous les élèves et enseignants pour cette nouvelle année scolaire. Nous vous souhaitons une excellente année.",
      authorId: admin.id,
      target: "ALL",
    },
  });

  console.log("✅ Database seeded successfully!");
  console.log(`   - 1 Admin`);
  console.log(`   - ${teachers.length} Teachers`);
  console.log(`   - ${students.length} Students`);
  console.log(`   - ${classes.length} Classes`);
  console.log(`   - ${subjects.length} Subjects`);
  console.log(`   - ${paymentTypes.length} Payment Types`);
  console.log(`   - School Year: ${schoolYear.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
