"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ClipboardCheck,
  Cloud,
  CodeXml,
  Download,
  HeartPulse,
  Menu,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Send,
  Trophy,
  X,
} from "lucide-react";
import type { PortfolioData } from "@/lib/portfolio-data";
import Link from "next/link";

const navigation = [
  ["About", "about"],
  ["Work", "projects"],
  ["Skills", "skills"],
  ["Experience", "experience"],
  ["Contact", "contact"],
] as const;

const projectIcons = [Cloud, ClipboardCheck, ShieldCheck, HeartPulse, ShoppingBag];
const codingProfiles = [
  { label: "LeetCode", value: "1474", detail: "Highest rating", href: "https://leetcode.com/u/Saurabh8720/" },
  { label: "CodeChef", value: "2★", detail: "1435 highest rating", href: "https://www.codechef.com/users/saurabhhere1" },
  { label: "Problem solving", value: "300+", detail: "DSA problems solved", href: "https://leetcode.com/u/Saurabh8720/" },
];

export default function Portfolio({ content }: { content: PortfolioData }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [formStatus, setFormStatus] = useState("");
  const displayName = content.about?.fullName || "Saurabh Pandey";
  const contactEmail = content.about?.email || "";
  const location = content.about?.location || "India";
  const resumeUrl = content.about?.resumeUrl || "https://drive.google.com/file/d/1Uxc95FExlDoTApGnPHJVorrv4ZdLcKI4/view";
  const resumeId = resumeUrl.match(/\/file\/d\/([^/]+)/)?.[1];
  const resumeDownloadUrl = resumeId ? `https://drive.google.com/uc?export=download&id=${resumeId}` : resumeUrl;
  const visibleProjects = content.projects.map((project) => ({
    name: project.title,
    type: project.role || project.stack.join(" · ") || "Selected project",
    description: project.summary,
    href: project.websiteUrl || "#contact",
    sourceUrl: project.sourceUrl,
    stack: project.stack,
  }));
  const visibleServices = content.services;
  const visibleSkills = Object.entries(Object.groupBy(content.skills, (skill) => skill.category)).map(([label, items]) => ({
    label,
    skills: items?.map((skill) => skill.name) ?? [],
  }));
  const visibleRoles = content.experience.map((role) => ({
    dates: `${role.startDate}${role.endDate ? ` — ${role.endDate}` : ""}`,
    role: role.title,
    company: role.company,
    type: role.employment || "Education",
    detail: role.description,
  }));
  const visibleArticles = content.blogs.map((article) => ({
    category: article.category,
    date: article.publishedAt ? new Date(article.publishedAt).toLocaleDateString("en", { month: "short", year: "numeric" }) : "LATEST",
    title: article.title,
    slug: article.slug,
  }));
  const visibleTestimonials = content.testimonials;

  async function handleContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSending(true);
    setFormStatus("");
    const message = Object.fromEntries(new FormData(formElement).entries());

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:10000/api"}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });
      if (!response.ok) throw new Error("The message could not be sent.");
      formElement.reset();
      setFormStatus("Thanks for reaching out. Your note is on its way.");
    } catch {
      setFormStatus("The message API is unavailable. Please reach me through LinkedIn or GitHub.");
    } finally {
      setSending(false);
    }
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="wrap header-inner">
          <a className="brand" href="#home" aria-label={`${displayName} home`} onClick={closeMenu}>
            <span className="brand-mark"><CodeXml aria-hidden="true" /></span>
            <span>{displayName.toUpperCase()}<span className="brand-caption">{content.about?.headline || "FULL-STACK DEVELOPER"}</span></span>
          </a>
          <nav className={`nav-list${menuOpen ? " is-open" : ""}`} aria-label="Main navigation">
            {navigation.map(([label, id]) => <a className="nav-link" href={`#${id}`} key={id} onClick={closeMenu}>{label}</a>)}
          </nav>
          <a className="header-contact" href={content.about?.githubUrl || "https://github.com/SaurabhPandey016"} target="_blank" rel="noreferrer">GitHub profile <ArrowUpRight aria-hidden="true" /></a>
          <button className="mobile-toggle" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <main>
        <section className="hero wrap" id="home">
          <div className="hero-topline"><span className="eyebrow">Saurabh Pandey · India</span><span className="availability"><span className="availability-dot" /> Open to entry-level roles</span></div>
          <div className="hero-grid">
            <div className="reveal">
              <h1>Building for<br />the <em>real world.</em></h1>
              <p className="hero-copy">{content.about?.intro}</p>
              <div className="hero-actions"><a className="primary-link" href="#projects">Explore my work <ArrowDown aria-hidden="true" /></a><a className="arrow-link" href={resumeDownloadUrl} target="_blank" rel="noreferrer">Download resume <Download aria-hidden="true" /></a></div>
            </div>
            <div className="hero-art">
              <div className="art-grid" /><div className="art-orbit" />
              <Image className="hero-avatar" src="https://lh3.googleusercontent.com/d/1ZGdcVOGRoQ03LZqP_opTnUrX3wWIS5SO=w1200" alt="Saurabh Pandey" width={1200} height={1200} sizes="(max-width: 650px) 150px, 184px" quality={88} priority />
              <div className="art-panel"><div className="art-panel-top"><span className="art-panel-label">Currently seeking</span><span className="art-panel-status">Open</span></div><div className="art-panel-title">Software engineering roles</div><div className="art-panel-meta"><span>Entry-level</span><span>Intern</span><span>Associate</span></div></div>
            </div>
          </div>
          <div className="hero-bottom"><p>Based in <span>{location}</span></p><p>Open to <span>remote or on-site</span></p><p>Focus <span>MERN stack</span></p><p>Also learning <span>TypeScript</span></p></div>
        </section>

        <section className="section" id="about"><div className="wrap about-grid">
          <div className="about-aside"><span className="eyebrow">About me</span><span className="about-mark" aria-hidden="true"><CodeXml /></span><p>Full-stack development, learned by building complete applications and solving practical problems.</p></div>
          <div className="about-copy"><h3>Frontend detail.<br />Backend <em>follow-through.</em></h3><p>{content.about?.biography}</p><div className="about-facts"><div className="about-fact"><span>Based in</span><strong>India</strong></div><div className="about-fact"><span>Learning path</span><strong>Self-taught</strong></div><div className="about-fact"><span>Working style</span><strong>End to end</strong></div></div></div>
        </div></section>

        <section className="section" id="projects"><div className="wrap">
          <div className="section-heading"><div><span className="eyebrow">Selected full-stack projects</span><h2>Built to solve<br />real workflows.</h2></div><p>Five projects from my public GitHub work, spanning file sharing, assessments, insurance operations, healthcare, and e-commerce.</p></div>
          <div className="project-list">{visibleProjects.map((project, index) => { const Icon = projectIcons[index % projectIcons.length]; return <article className="project" key={project.name}><span className="project-number">0{index + 1}</span><span className="project-symbol"><Icon aria-hidden="true" /></span><div className="project-main"><span className="project-name">{project.name}</span><span className="project-type">{project.type}</span><p className="project-desc">{project.description}</p><div className="project-stack">{project.stack.map((technology) => <span key={technology}>{technology}</span>)}</div><div className="project-actions"><a href={project.href} target="_blank" rel="noreferrer">Open demo <ArrowUpRight aria-hidden="true" /></a>{project.sourceUrl && <a href={project.sourceUrl} target="_blank" rel="noreferrer">Source code <ArrowUpRight aria-hidden="true" /></a>}</div></div><ArrowUpRight className="project-arrow" aria-hidden="true" /></article>; })}</div>
        </div></section>

        <section className="section" id="services"><div className="wrap">
          <div className="section-heading"><div><span className="eyebrow">What I build</span><h2>Full-stack work,<br />from UI to data.</h2></div><p>My projects bring together the frontend, backend, and product workflows rather than treating them as separate pieces.</p></div>
          <div className="service-grid">{visibleServices.map((service, index) => <article className="service" key={service.title}><div className="service-top"><span className="service-number">0{index + 1}</span><ArrowRight className="service-icon" aria-hidden="true" /></div><h3>{service.title}</h3><p>{service.description}</p></article>)}</div>
        </div></section>

        <section className="section" id="skills"><div className="wrap skill-layout">
          <div><span className="eyebrow">Technical skills</span><h2 className="section-title">The stack I<br /><em>work with.</em></h2><p className="skill-intro">Tools and technologies represented across my public repositories. TypeScript is an active learning focus.</p></div>
          <div className="skill-groups">{visibleSkills.map((group) => <div className="skill-group" key={group.label}><h3>{group.label}</h3><div className="skill-tags">{group.skills.map((skill) => <span className="tag" key={skill}>{skill}</span>)}</div></div>)}</div>
        </div></section>

        <section className="section" id="practice"><div className="wrap">
          <div className="section-heading"><div><span className="eyebrow">Coding practice</span><h2>Learning by<br /><em>doing the work.</em></h2></div><p>Numbers and profiles listed in my current resume. Visit the platforms for the latest activity.</p></div>
          <div className="achievement-grid">{codingProfiles.map((profile) => <a className="achievement" href={profile.href} target="_blank" rel="noreferrer" key={profile.label}><Trophy aria-hidden="true" /><strong>{profile.value}</strong><span>{profile.label}</span><small>{profile.detail}</small><ArrowUpRight className="achievement-link" aria-hidden="true" /></a>)}</div>
          <div className="certification-links"><span>TRAINING & CERTIFICATES</span><a href="https://files.codingninjas.in/certi_image1860592e5d9e803ce88eebc79ef14ce8f0f219.jpg" target="_blank" rel="noreferrer">Data Structures & Algorithms · Coding Ninjas <ArrowUpRight aria-hidden="true" /></a><a href="https://verified.sertifier.com/en/verify/68027376016799/" target="_blank" rel="noreferrer">Full-Stack Development · AlmaBetter <ArrowUpRight aria-hidden="true" /></a></div>
        </div></section>

        <section className="section" id="experience"><div className="wrap">
          <div className="section-heading"><div><span className="eyebrow">Experience & education</span><h2>Engineering roots.<br />Software by <em>practice.</em></h2></div><p>Full-stack developer training at AlmaBetter alongside a B.Tech in Electrical Engineering.</p></div>
          <div className="experience-list">{visibleRoles.map((role) => <article className="experience" key={role.role}><span className="experience-date">{role.dates}</span><div><h3>{role.role}</h3><span className="experience-company">{role.company}</span><p>{role.detail}</p></div><span className="experience-kind">{role.type}</span></article>)}</div>
        </div></section>

        {visibleTestimonials.length > 0 && <section className="section" id="testimonials"><div className="wrap testimonial-wrap"><span className="eyebrow">Testimonials</span>{visibleTestimonials.map((testimonial) => <div key={testimonial.id}><blockquote>“{testimonial.quote}”</blockquote><p className="testimonial-credit"><span className="testimonial-avatar">{testimonial.author.slice(0, 2).toUpperCase()}</span><span><strong>{testimonial.author}</strong><br />{[testimonial.role, testimonial.company].filter(Boolean).join(", ")}</span></p></div>)}</div></section>}

        {visibleArticles.length > 0 && <section className="section" id="writing"><div className="wrap"><div className="section-heading"><div><span className="eyebrow">Writing</span><h2>Notes from<br />the work.</h2></div><p>Articles and notes published through the portfolio CMS.</p></div><div className="writing-grid">{visibleArticles.map((article) => <Link className="article" href={`/blog/${article.slug}`} key={article.title}><div className="article-meta"><span>{article.category}</span><span>{article.date}</span></div><h3>{article.title}</h3><div className="article-bottom"><span>Read the note</span><ArrowUpRight aria-hidden="true" /></div></Link>)}</div></div></section>}

        <section className="contact-section" id="contact"><div className="wrap">
          <span className="eyebrow">Open to opportunities</span>
          <div className="contact-layout"><div><h2>Let&apos;s build<br />something <em>useful.</em></h2><p className="contact-intro">I&apos;m looking for entry-level, internship, and associate opportunities in software engineering, frontend, and full-stack development.</p>{contactEmail && <a className="contact-email" href={`mailto:${contactEmail}`}>{contactEmail} <ArrowUpRight aria-hidden="true" /></a>}<a className="contact-email" href="tel:+918720026790"><Phone aria-hidden="true" /> +91 87200 26790</a></div>
            <form className="contact-form" onSubmit={handleContact}><div className="form-row"><label>Your name<input name="name" autoComplete="name" placeholder="How should I address you?" required /></label><label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label></div><label>What are you thinking about?<textarea name="message" placeholder="A few lines is plenty..." required /></label><button className="submit-button" type="submit" disabled={sending}>{sending ? "Sending..." : "Send a note"}{formStatus.startsWith("Thanks") ? <Check /> : <Send />}</button><p className="form-status" aria-live="polite">{formStatus}</p></form>
          </div>
        </div></section>
      </main>

      <footer className="site-footer"><div className="wrap footer-inner"><span className="footer-note">© 2026 {displayName.toUpperCase()} · BUILT WITH REACT AND NODE.JS</span><div className="footer-links"><a href={content.about?.linkedInUrl || "https://www.linkedin.com/in/saurabhpandey-/"} target="_blank" rel="noreferrer">LinkedIn</a><a href={content.about?.githubUrl || "https://github.com/SaurabhPandey016"} target="_blank" rel="noreferrer">GitHub</a><a href="https://leetcode.com/u/Saurabh8720/" target="_blank" rel="noreferrer">LeetCode</a>{contactEmail && <a href={`mailto:${contactEmail}`}>Email</a>}<a href="/admin">CMS login</a></div></div></footer>
    </div>
  );
}