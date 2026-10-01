export type PortfolioData = {
  about: {
    fullName: string;
    headline: string;
    intro: string;
    biography: string;
    email: string;
    location?: string | null;
    availability?: string | null;
    linkedInUrl?: string | null;
    githubUrl?: string | null;
    resumeUrl?: string | null;
  } | null;
  skills: { id: string; name: string; category: string }[];
  projects: { id: string; title: string; role?: string | null; summary: string; stack: string[]; websiteUrl?: string | null; sourceUrl?: string | null; imageUrl?: string | null }[];
  blogs: BlogPost[];
  experience: { id: string; title: string; company: string; startDate: string; endDate?: string | null; employment?: string | null; description: string }[];
  testimonials: { id: string; quote: string; author: string; role?: string | null; company?: string | null }[];
  services: { id: string; title: string; description: string }[];
};

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  coverImage?: string | null;
  publishedAt?: string | null;
};

export const fallbackBlogPosts: BlogPost[] = [
  {
    id: "aethercloud-file-lifecycle",
    title: "A file workflow is more than an upload button",
    slug: "aethercloud-file-lifecycle",
    category: "Product engineering",
    excerpt: "Building AetherCloud around the complete file lifecycle changed how I think about ownership, sharing, and recovery.",
    content: "The first version of a cloud drive can look deceptively simple: choose a file, upload it, show it in a list. But the useful product starts after that first request.\n\nWhile building AetherCloud, I organized the work around a longer lifecycle: capture, organize, find, share, and recover. Each verb introduces a different responsibility. A folder needs an owner and a place in a hierarchy. A shared item needs a clear permission. A public link needs an expiry policy. A delete action needs a recovery path.\n\nThinking in workflows helped me connect the interface to the data model and API rules instead of treating each screen as a separate feature. It also made edge cases visible earlier: what happens when access is revoked, a link expires, or a file moves to trash?\n\nThe lesson I keep carrying forward is simple: model the real lifecycle first. The upload control is only its first step.",
    publishedAt: "2026-10-01T09:00:00.000Z",
  },
  {
    id: "pulsequiz-two-workflows",
    title: "One assessment platform, two very different workflows",
    slug: "pulsequiz-two-workflows",
    category: "Product design",
    excerpt: "PulseQuiz taught me to design the student experience and the administrative workflow as parts of the same product.",
    content: "A quiz platform has at least two audiences with different jobs to do. Students need to discover an assessment, complete it, and understand their progress. Administrators need to organize questions, manage quizzes, and review how the platform is being used.\n\nFor PulseQuiz, keeping those workflows distinct shaped the navigation, permissions, and data model. A student-facing dashboard should not inherit admin controls by accident. Administrative tools should make account and content management understandable, not merely possible.\n\nAuthentication is part of that product design. HTTP-only cookies and role checks determine which actions are available, while the interface makes the current task visible. The backend and frontend have to agree on the same boundaries.\n\nI learned to map user roles and their everyday actions before polishing the dashboard. That gives the UI a clearer structure and makes security requirements easier to reason about.",
    publishedAt: "2026-10-01T09:00:00.000Z",
  },
  {
    id: "insurashield-visible-workflows",
    title: "Making the work visible in an insurance portal",
    slug: "insurashield-visible-workflows",
    category: "Full-stack development",
    excerpt: "A multi-role insurance system works when policy, claim, billing, and document tasks connect into one visible flow.",
    content: "Insurance operations are made of linked tasks rather than isolated forms. A policy connects to a customer. A claim needs supporting documents and a review decision. A premium payment needs a status people can understand later.\n\nIn InsuraShield, those connections shaped the roles and screens: customers manage policies and claims, agents handle customer and review workflows, and administrators monitor overall activity. Billing and document records belong alongside the business process they support.\n\nFor a full-stack developer, this is where interface, API, and data modeling meet. A button can change a claim status, but the application also needs to preserve who can make that change and what context should remain visible.\n\nWorking through this project helped me see how careful workflow boundaries make a complex portal easier to use and maintain.",
    publishedAt: "2026-10-01T09:00:00.000Z",
  },
];

export const fallbackPortfolio: PortfolioData = {
  about: {
    fullName: "Saurabh Pandey",
    headline: "Full-Stack Developer (MERN)",
    intro: "Full Stack Developer Trainee at AlmaBetter, building responsive React interfaces and robust Node.js APIs. Open to software engineering, frontend, and full-stack roles, including internships and associate positions.",
    biography: "I'm a full-stack developer trainee based in Madhya Pradesh, India, with a B.Tech in Electrical Engineering from AKS University. I build complete web applications with React, Node.js, Express, and MongoDB, and practice data structures and algorithms through coding platforms. My project work includes healthcare appointments, e-commerce, cloud file workflows, assessments, and insurance operations.",
    email: "developersaurabh04@gmail.com",
    location: "India",
    availability: "Open to entry-level, internship, and associate roles · Remote or on-site",
    linkedInUrl: "https://www.linkedin.com/in/saurabhpandey-/",
    githubUrl: "https://github.com/SaurabhPandey016",
    resumeUrl: "https://drive.google.com/file/d/1Uxc95FExlDoTApGnPHJVorrv4ZdLcKI4/view",
  },
  skills: [
    ...["C++", "JavaScript", "Java", "HTML5", "CSS3", "TypeScript (learning)"].map((name) => ({ id: name, name, category: "Languages" })),
    ...["React", "React Router", "Redux Toolkit", "Tailwind CSS", "Responsive UI", "Accessibility"].map((name) => ({ id: name, name, category: "Frontend" })),
    ...["Node.js", "Express", "REST APIs", "JWT", "bcrypt", "Multer"].map((name) => ({ id: name, name, category: "Backend" })),
    ...["MongoDB", "Mongoose", "PostgreSQL", "Prisma", "Supabase"].map((name) => ({ id: name, name, category: "Data" })),
    ...["Git", "GitHub", "Vercel", "Render", "API testing"].map((name) => ({ id: name, name, category: "Tools & delivery" })),
  ],
  projects: [
    {
      id: "aether-cloud",
      title: "AetherCloud",
      role: "Cloud file workspace",
      summary: "A full-stack drive for uploading, organizing, finding, sharing, and recovering files. Includes nested folders, permissioned sharing, expiring public links, and trash recovery.",
      stack: ["Next.js 16", "TypeScript", "Express 5", "Prisma", "PostgreSQL"],
      websiteUrl: "https://aether-cloud-app.vercel.app",
      sourceUrl: "https://github.com/SaurabhPandey016/Aether_cloud_app",
    },
    {
      id: "pulse-quiz",
      title: "PulseQuiz",
      role: "Quiz & assessment platform",
      summary: "A role-aware assessment app with quiz discovery, student progress, question and category management, admin controls, analytics, and password recovery.",
      stack: ["Next.js 16", "TypeScript", "Express 5", "Prisma", "PostgreSQL"],
      websiteUrl: "https://pulsequiz-ten.vercel.app",
      sourceUrl: "https://github.com/SaurabhPandey016/Quiz_and_online_assessment_app",
    },
    {
      id: "insurashield",
      title: "InsuraShield",
      role: "Insurance operations platform",
      summary: "A multi-role portal for customer records, policy issuance, claim review, installment billing, PDF receipts, document uploads, and business analytics.",
      stack: ["Next.js 16", "Express", "Prisma", "Supabase PostgreSQL", "Chart.js"],
      websiteUrl: "https://insurance-management-system-theta.vercel.app",
      sourceUrl: "https://github.com/SaurabhPandey016/Insurance_management_system",
    },
    {
      id: "medimeet",
      title: "MediMeet",
      role: "Doctor appointment platform",
      summary: "A healthcare app for browsing specialties, managing patient profiles, booking appointments, and handling medical documents.",
      stack: ["React 19", "Redux Toolkit", "Express 5", "MongoDB", "Multer"],
      websiteUrl: "https://doctor-appointment-app-navy-chi.vercel.app",
      sourceUrl: "https://github.com/SaurabhPandey016/Doctor-appointment-app",
    },
    {
      id: "zeptro",
      title: "Zeptro",
      role: "E-commerce storefront",
      summary: "An electronics storefront with product discovery, shopping cart, favorites, search, and a responsive shopping experience.",
      stack: ["React 19", "React Router", "Tailwind CSS", "Express", "MongoDB"],
      websiteUrl: "https://zeptro-ecommerce-app-blond.vercel.app",
      sourceUrl: "https://github.com/SaurabhPandey016/Zeptro-ecommerce-app",
    },
  ],
  blogs: fallbackBlogPosts,
  experience: [
    {
      id: "almabetter-trainee",
      title: "Full Stack Developer Trainee",
      company: "AlmaBetter",
      startDate: "June 2025",
      employment: "Training · Remote",
      description: "Full-stack development training and project work using React, Node.js, Express, MongoDB, REST APIs, authentication, and responsive interfaces. Resume projects include MediMeet and Zeptro.",
    },
    {
      id: "btech",
      title: "Bachelor of Technology · Electrical Engineering",
      company: "AKS University",
      startDate: "2018",
      endDate: "2022",
      employment: "Education",
      description: "Completed a B.Tech in Electrical Engineering with first-class standing.",
    },
    { id: "higher-secondary", title: "Senior Secondary Education", company: "Excellence No. 1, Rewa", startDate: "2016", endDate: "2018", employment: "Education", description: "Higher secondary education in Rewa, Madhya Pradesh." },
    { id: "school", title: "Higher Secondary School", company: "Doon Public School, Rewa", startDate: "2015", endDate: "2016", employment: "Education", description: "School education in Rewa, Madhya Pradesh." },
  ],
  testimonials: [],
  services: [
    { id: "frontend", title: "Responsive frontends", description: "React interfaces, reusable components, responsive layouts, and clear user flows." },
    { id: "apis", title: "Backend APIs", description: "Express services with validation, authentication, file handling, and structured error responses." },
    { id: "data", title: "Data-backed products", description: "MongoDB and PostgreSQL applications modeled around real workflows and user roles." },
    { id: "integration", title: "Full-stack integration", description: "Connect frontend and backend flows, handle sessions securely, and prepare applications for deployment." },
  ],
};

export async function getPortfolioData(): Promise<PortfolioData> {
  const apiUrl = process.env.CMS_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:10000/api";
  try {
    const response = await fetch(`${apiUrl}/portfolio`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return fallbackPortfolio;
    const content = (await response.json()) as Partial<PortfolioData>;
    return {
      ...fallbackPortfolio,
      ...content,
      about: content.about ?? fallbackPortfolio.about,
      skills: content.skills?.length ? content.skills : fallbackPortfolio.skills,
      projects: content.projects?.length ? content.projects : fallbackPortfolio.projects,
      blogs: content.blogs?.length ? content.blogs : fallbackPortfolio.blogs,
      experience: content.experience?.length ? content.experience : fallbackPortfolio.experience,
      testimonials: content.testimonials ?? [],
      services: content.services?.length ? content.services : fallbackPortfolio.services,
    };
  } catch {
    return fallbackPortfolio;
  }
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const portfolio = await getPortfolioData();
  return portfolio.blogs.find((post) => post.slug === slug) ?? null;
}