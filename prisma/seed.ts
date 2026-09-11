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

  // Create school year
  const schoolYear = await prisma.schoolYear.create({
    data: {
      name: "2026-2027",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2027-06-30"),
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
    prisma.subject.create({ data: { name: "Mathématiques", code: "MATH", coefficient: 4, description: "Mathématiques" } }),
    prisma.subject.create({ data: { name: "Français", code: "FRAN", coefficient: 3, description: "Français" } }),
    prisma.subject.create({ data: { name: "Anglais", code: "ANGL", coefficient: 2, description: "Anglais" } }),
    prisma.subject.create({ data: { name: "Histoire-Géographie", code: "HIST", coefficient: 2, description: "Histoire-Géographie" } }),
    prisma.subject.create({ data: { name: "Physique-Chimie", code: "PHYC", coefficient: 3, description: "Physique-Chimie" } }),
    prisma.subject.create({ data: { name: "SVT", code: "SVT", coefficient: 2, description: "Sciences de la Vie et de la Terre" } }),
    prisma.subject.create({ data: { name: "Informatique", code: "INFO", coefficient: 2, description: "Informatique" } }),
    prisma.subject.create({ data: { name: "EPS", code: "EPS", coefficient: 1, description: "Éducation Physique et Sportive" } }),
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

  // Assign subjects to classes
  for (const cls of classes) {
    for (const sub of subjects) {
      await prisma.classSubject.create({
        data: { classId: cls.id, subjectId: sub.id },
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
        classId: classes[sd.classIndex].id,/
        schoolYearId: schoolYear.id,
        status: EnrollmentStatus.VALIDATED,
      },
    });

    students.push(student);
  }

  // Create payment types
  const paymentTypes = await Promise.all([
    prisma.paymentType.create({ data: { name: "Frais de Scolarité", description: "Frais annuel de scolarité", amount: 50000 } }),
    prisma.paymentType.create({ data: { name: "Frais d'Inscription", description: "Frais d'inscription annuelle", amount: 10000 } }),
    prisma.paymentType.create({ data: { name: "Frais de Transport", description: "Transport scolaire", amount: 15000 } }),
    prisma.paymentType.create({ data: { name: "Frais de Cantine", description: "Restauration scolaire", amount: 20000 } }),
    prisma.paymentType.create({ data: { name: "Frais de Bibliothèque", description: "Accès à la bibliothèque", amount: 5000 } }),
  ]);

  // Create some payments
  const paymentMethods = ["CASH", "BANK_TRANSFER", "MOBILE_MONEY", "CREDIT_CARD"] as const;
  for (let i = 0; i < 8; i++) {
    const student = students[i % students.length];
    const pt = paymentTypes[i % paymentTypes.length];
    await prisma.payment.create({
      data: {
        studentId: student.id,
        paymentTypeId: pt.id,
        amount: pt.amount,
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
        await prisma.grade.create({
          data: {
            studentId: student.id,
            subjectId: sub.id,
            teacherId: teachers[0].id,
            schoolYearId: schoolYear.id,
            termId: term1.id,
            classId: classes[studentData[students.indexOf(student)]?.classIndex ?? 0].id,
            evaluationType: evalType as any,
            score,
            maxScore: 20,
            coefficient: sub.coefficient,
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
