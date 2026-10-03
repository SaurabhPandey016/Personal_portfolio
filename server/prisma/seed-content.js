import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const projects = [
  {
    id: "aether-cloud",
    title: "AetherCloud",
    slug: "aether-cloud",
    role: "Cloud file workspace",
    summary: "A full-stack drive for uploading, organizing, finding, sharing, and recovering files. Includes nested folders, permissioned sharing, expiring public links, and trash recovery.",
    stack: ["Next.js 16", "TypeScript", "Express 5", "Prisma", "PostgreSQL"],
    websiteUrl: "https://aether-cloud-app.vercel.app",
    sourceUrl: "https://github.com/SaurabhPandey016/Aether_cloud_app",
    featured: true,
    published: true,
    sortOrder: 1,
  },
  {
    id: "pulse-quiz",
    title: "PulseQuiz",
    slug: "pulse-quiz",
    role: "Quiz & assessment platform",
    summary: "A role-aware assessment app with quiz discovery, student progress, question and category management, admin controls, analytics, and password recovery.",
    stack: ["Next.js 16", "TypeScript", "Express 5", "Prisma", "PostgreSQL"],
    websiteUrl: "https://pulsequiz-ten.vercel.app",
    sourceUrl: "https://github.com/SaurabhPandey016/Quiz_and_online_assessment_app",
    featured: true,
    published: true,
    sortOrder: 2,
  },
  {
    id: "insurashield",
    title: "InsuraShield",
    slug: "insurashield",
    role: "Insurance operations platform",
    summary: "A multi-role portal for customer records, policy issuance, claim review, installment billing, PDF receipts, document uploads, and business analytics.",
    stack: ["Next.js 16", "Express", "Prisma", "Supabase PostgreSQL", "Chart.js"],
    websiteUrl: "https://insurance-management-system-theta.vercel.app",
    sourceUrl: "https://github.com/SaurabhPandey016/Insurance_management_system",
    featured: true,
    published: true,
    sortOrder: 3,
  },
  {
    id: "medimeet",
    title: "MediMeet",
    slug: "medimeet",
    role: "Doctor appointment platform",
    summary: "A healthcare app for browsing specialties, managing patient profiles, booking appointments, and handling medical documents.",
    stack: ["React 19", "Redux Toolkit", "Express 5", "MongoDB", "Multer"],
    websiteUrl: "https://doctor-appointment-app-navy-chi.vercel.app",
    sourceUrl: "https://github.com/SaurabhPandey016/Doctor-appointment-app",
    featured: true,
    published: true,
    sortOrder: 4,
  },
  {
    id: "zeptro",
    title: "Zeptro",
    slug: "zeptro",
    role: "E-commerce storefront",
    summary: "An electronics storefront with product discovery, shopping cart, favorites, search, and a responsive shopping experience.",
    stack: ["React 19", "React Router", "Tailwind CSS", "Express", "MongoDB"],
    websiteUrl: "https://zeptro-ecommerce-app-blond.vercel.app",
    sourceUrl: "https://github.com/SaurabhPandey016/Zeptro-ecommerce-app",
    featured: true,
    published: true,
    sortOrder: 5,
  },
];

const skillGroups = {
  Languages: ["C++", "JavaScript", "HTML5", "CSS3", "TypeScript (learning)"],
  Frontend: ["React", "React Router", "Redux Toolkit", "Tailwind CSS", "Responsive UI", "Accessibility"],
  Backend: ["Node.js", "Express", "REST APIs", "JWT", "bcrypt", "Multer"],
  Data: ["MongoDB", "Mongoose", "PostgreSQL", "Prisma", "Supabase"],
  "Tools & delivery": ["Git", "GitHub", "Vercel", "Render", "API testing"],
};

const experiences = [
  {
    id: "almabetter-trainee",
    title: "Full Stack Developer Trainee",
    company: "AlmaBetter",
    startDate: "June 2025",
    employment: "Training · Remote",
    description: "Full-stack development training and project work using React, Node.js, Express, MongoDB, REST APIs, authentication, and responsive interfaces. Resume projects include MediMeet and Zeptro.",
    sortOrder: 1,
    published: true,
  },
  {
    id: "btech",
    title: "Bachelor of Technology · Electrical Engineering",
    company: "AKS University",
    startDate: "2018",
    endDate: "2022",
    employment: "Education",
    description: "Completed a B.Tech in Electrical Engineering with first-class standing.",
    sortOrder: 1,
    published: true,
  },
  {
    id: "self-taught-development",
    title: "Self-taught full-stack development",
    company: "Independent learning & project work",
    startDate: "Project-based",
    employment: "Ongoing",
    description: "Learning through end-to-end applications, REST API design, React state management, authentication, databases, deployment, and regular problem-solving practice.",
    sortOrder: 2,
    published: true,
  },
  {
    id: "higher-secondary",
    title: "Senior Secondary Education",
    company: "Excellence No. 1, Rewa",
    startDate: "2016",
    endDate: "2018",
    employment: "Education",
    description: "Higher secondary education in Rewa, Madhya Pradesh.",
    sortOrder: 3,
    published: true,
  },
  {
    id: "school",
    title: "Higher Secondary School",
    company: "Doon Public School, Rewa",
    startDate: "2015",
    endDate: "2016",
    employment: "Education",
    description: "School education in Rewa, Madhya Pradesh.",
    sortOrder: 4,
    published: true,
  },
];

const blogs = [
  {
    id: "aethercloud-file-lifecycle",
    title: "A file workflow is more than an upload button",
    slug: "aethercloud-file-lifecycle",
    category: "Product engineering",
    excerpt: "Building AetherCloud around the complete file lifecycle changed how I think about ownership, sharing, and recovery.",
    content: "The first version of a cloud drive can look deceptively simple: choose a file, upload it, show it in a list. But the useful product starts after that first request.\n\nWhile building AetherCloud, I organized the work around a longer lifecycle: capture, organize, find, share, and recover. Each verb introduces a different responsibility. A folder needs an owner and a place in a hierarchy. A shared item needs a clear permission. A public link needs an expiry policy. A delete action needs a recovery path.\n\nThinking in workflows helped me connect the interface to the data model and API rules instead of treating each screen as a separate feature. It also made edge cases visible earlier: what happens when access is revoked, a link expires, or a file moves to trash?\n\nThe lesson I keep carrying forward is simple: model the real lifecycle first. The upload control is only its first step.",
    published: true,
    publishedAt: new Date("2026-10-01T09:00:00.000Z"),
  },
  {
    id: "pulsequiz-two-workflows",
    title: "One assessment platform, two very different workflows",
    slug: "pulsequiz-two-workflows",
    category: "Product design",
    excerpt: "PulseQuiz taught me to design the student experience and the administrative workflow as parts of the same product.",
    content: "A quiz platform has at least two audiences with different jobs to do. Students need to discover an assessment, complete it, and understand their progress. Administrators need to organize questions, manage quizzes, and review how the platform is being used.\n\nFor PulseQuiz, keeping those workflows distinct shaped the navigation, permissions, and data model. A student-facing dashboard should not inherit admin controls by accident. Administrative tools should make account and content management understandable, not merely possible.\n\nAuthentication is part of that product design. HTTP-only cookies and role checks determine which actions are available, while the interface makes the current task visible. The backend and frontend have to agree on the same boundaries.\n\nI learned to map user roles and their everyday actions before polishing the dashboard. That gives the UI a clearer structure and makes security requirements easier to reason about.",
    published: true,
    publishedAt: new Date("2026-10-01T09:00:00.000Z"),
  },
  {
    id: "insurashield-visible-workflows",
    title: "Making the work visible in an insurance portal",
    slug: "insurashield-visible-workflows",
    category: "Full-stack development",
    excerpt: "A multi-role insurance system works when policy, claim, billing, and document tasks connect into one visible flow.",
    content: "Insurance operations are made of linked tasks rather than isolated forms. A policy connects to a customer. A claim needs supporting documents and a review decision. A premium payment needs a status people can understand later.\n\nIn InsuraShield, those connections shaped the roles and screens: customers manage policies and claims, agents handle customer and review workflows, and administrators monitor overall activity. Billing and document records belong alongside the business process they support.\n\nFor a full-stack developer, this is where interface, API, and data modeling meet. A button can change a claim status, but the application also needs to preserve who can make that change and what context should remain visible.\n\nWorking through this project helped me see how careful workflow boundaries make a complex portal easier to use and maintain.",
    published: true,
    publishedAt: new Date("2026-10-01T09:00:00.000Z"),
  },
];

const services = [
  { id: "responsive-frontends", title: "Responsive frontends", description: "React interfaces, reusable components, responsive layouts, and clear user flows.", icon: "Monitor", sortOrder: 1, published: true },
  { id: "backend-apis", title: "Backend APIs", description: "Express services with validation, authentication, file handling, and structured error responses.", icon: "Server", sortOrder: 2, published: true },
  { id: "data-products", title: "Data-backed products", description: "MongoDB and PostgreSQL applications modeled around real workflows and user roles.", icon: "Database", sortOrder: 3, published: true },
  { id: "full-stack-integration", title: "Full-stack integration", description: "Connect frontend and backend flows, handle sessions securely, and prepare applications for deployment.", icon: "Layers", sortOrder: 4, published: true },
];

try {
  await prisma.about.upsert({
    where: { id: "portfolio" },
    create: {
      id: "portfolio",
      fullName: "Saurabh Pandey",
      headline: "Full-Stack Developer (MERN)",
      intro: "Full Stack Developer Trainee at AlmaBetter, building responsive React interfaces and robust Node.js APIs. Open to software engineering, frontend, and full-stack roles, including internships and associate positions.",
      biography: "I'm a full-stack developer trainee based in Madhya Pradesh, India, with a B.Tech in Electrical Engineering from AKS University. I build complete web applications with React, Node.js, Express, and MongoDB, and practice data structures and algorithms through coding platforms. My project work includes healthcare appointments, e-commerce, cloud file workflows, assessments, and insurance operations.",
      email: "developersaurabh001@gmail.com",
      location: "Madhya Pradesh, India",
      availability: "Open to entry-level, internship, and associate roles · Remote or on-site",
      linkedInUrl: "https://www.linkedin.com/in/saurabhpandey-/",
      githubUrl: "https://github.com/SaurabhPandey016",
      resumeUrl: "https://drive.google.com/file/d/1Uxc95FExlDoTApGnPHJVorrv4ZdLcKI4/view",
    },
    update: {
      fullName: "Saurabh Pandey",
      headline: "Full-Stack Developer (MERN)",
      intro: "Full Stack Developer Trainee at AlmaBetter, building responsive React interfaces and robust Node.js APIs. Open to software engineering, frontend, and full-stack roles, including internships and associate positions.",
      biography: "I'm a full-stack developer trainee based in Madhya Pradesh, India, with a B.Tech in Electrical Engineering from AKS University. I build complete web applications with React, Node.js, Express, and MongoDB, and practice data structures and algorithms through coding platforms. My project work includes healthcare appointments, e-commerce, cloud file workflows, assessments, and insurance operations.",
      email: "developersaurabh04@gmail.com",
      location: "Madhya Pradesh, India",
      availability: "Open to entry-level, internship, and associate roles · Remote or on-site",
      linkedInUrl: "https://www.linkedin.com/in/saurabhpandey-/",
      githubUrl: "https://github.com/SaurabhPandey016",
      resumeUrl: "https://drive.google.com/file/d/1Uxc95FExlDoTApGnPHJVorrv4ZdLcKI4/view",
    },
  });

  for (const [category, names] of Object.entries(skillGroups)) {
    for (const [index, name] of names.entries()) {
      const id = `skill-${category.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-${index + 1}`;
      await prisma.skill.upsert({ where: { id }, create: { id, name, category, sortOrder: index + 1, published: true }, update: { name, category, sortOrder: index + 1, published: true } });
    }
  }

  for (const project of projects) {
    await prisma.project.upsert({ where: { slug: project.slug }, create: project, update: project });
  }
  for (const experience of experiences) {
    await prisma.experience.upsert({ where: { id: experience.id }, create: experience, update: experience });
  }
  for (const blog of blogs) {
    const { id, ...data } = blog;
    await prisma.blog.upsert({ where: { slug: blog.slug }, create: { ...data, id }, update: data });
  }
  for (const service of services) {
    await prisma.service.upsert({ where: { id: service.id }, create: service, update: service });
  }

  console.info(`Seeded profile, ${Object.values(skillGroups).flat().length} skills, ${projects.length} projects, ${experiences.length} experience/education entries, ${blogs.length} articles, and ${services.length} services.`);
} finally {
  await prisma.$disconnect();
}