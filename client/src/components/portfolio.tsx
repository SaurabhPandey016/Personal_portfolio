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
  Phone,
  ShieldCheck,
  ShoppingBag,
  Send,
  Trophy,
} from "lucide-react";
import type { PortfolioData } from "@/lib/portfolio-data";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

const projectIcons = [Cloud, ClipboardCheck, ShieldCheck, HeartPulse, ShoppingBag];
const codingProfiles = [
  { label: "LeetCode", value: "1474", detail: "Highest rating", href: "https://leetcode.com/u/Saurabh8720/" },
  { label: "CodeChef", value: "2★", detail: "1435 highest rating", href: "https://www.codechef.com/users/saurabhhere1" },
  { label: "Problem solving", value: "300+", detail: "DSA problems solved", href: "https://leetcode.com/u/Saurabh8720/" },
];

export default function Portfolio({ content }: { content: PortfolioData }) {
  const [sending, setSending] = useState(false);
  const [formStatus, setFormStatus] = useState("");
  const displayName = content.about?.fullName || "Saurabh Pandey";
  const contactEmail = content.about?.email || "";
  const location = content.about?.location || "India";
  const resumeUrl = content.about?.resumeUrl || "https://drive.google.com/file/d/1Uxc95FExlDoTApGnPHJVorrv4ZdLcKI4/view";
  const resumeId = resumeUrl.match(/\/file\/d\/([^/]+)/)?.[1];
  const resumeDownloadUrl = resumeId ? `https://drive.google.com/uc?export=download&id=${resumeId}` : resumeUrl;
  const profileImageUrl = content.about?.profileImageUrl || "https://lh3.googleusercontent.com/d/1ZGdcVOGRoQ03LZqP_opTnUrX3wWIS5SO=w1200";
  const visibleProjects = content.projects.map((project) => ({
    name: project.title,
    type: project.role || project.stack.join(" · ") || "Selected project",
    description: project.summary,
    href: project.websiteUrl || "#contact",
    sourceUrl: project.sourceUrl,
    stack: project.stack,
    imageUrl: project.imageUrl,
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
    coverImage: article.coverImage,
  }));
  const visibleTestimonials = content.testimonials;

  async function handleContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSending(true);
    setFormStatus("");
    const message = Object.fromEntries(new FormData(formElement).entries());

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL?.trim() || "/api"}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(90_000),
      });
      const result = await response.json().catch(() => ({})) as { message?: string; error?: string; emailSent?: boolean; emailStatus?: "sent" | "failed" | "not_configured" };
      if (!response.ok) throw new Error(result.error || "The message could not be sent. Please try again.");
      formElement.reset();
      setFormStatus(result.emailStatus === "sent"
        ? "Your message has been sent successfully. I’ll get back to you soon."
        : result.emailStatus === "failed"
          ? "Your message was saved, but its email notification could not be delivered. Please contact me directly by email."
          : result.emailStatus === "not_configured"
            ? "Your message was saved, but email notifications are not configured."
            : "Your message was received. I’ll get back to you soon.");
    } catch (error) {
      const errorName = error instanceof Error ? error.name : "";
      setFormStatus(errorName === "TimeoutError"
        ? "The message service took too long to respond. Your message may have been received; please check before sending it again."
        : error instanceof Error
          ? error.message
          : "We couldn’t confirm delivery. Please try again or contact me directly by email.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="site-shell">
      <SiteHeader name={displayName} headline={content.about?.headline || "FULL-STACK DEVELOPER"} githubUrl={content.about?.githubUrl} />

      <main>
        <section className="hero wrap" id="home">
          <div className="hero-topline"><span className="eyebrow">Full-stack developer · India</span><Badge variant="outline" className="availability"><span className="availability-dot" /> Open to entry-level roles</Badge></div>
          <div className="hero-grid">
            <div className="reveal">
              <span className="hero-kicker">Design-minded engineer. End-to-end builder.</span>
              <h1>Ideas into<br /><em>impact.</em></h1>
              <p className="hero-copy">{content.about?.intro}</p>
              <div className="hero-actions">
                <Button nativeButton={false} render={<a href="#projects" />} className="primary-link">Explore my work <ArrowDown aria-hidden="true" /></Button>
                <Button nativeButton={false} variant="outline" render={<a href={resumeDownloadUrl} target="_blank" rel="noreferrer" />} className="resume-link">Download resume <Download aria-hidden="true" /></Button>
              </div>
              <div className="hero-social-proof"><span className="availability-dot" /> Available for meaningful opportunities</div>
            </div>
            <div className="hero-art">
              <div className="art-grid" /><div className="art-orbit" />
              <Image unoptimized className="hero-avatar" src={profileImageUrl} alt={displayName} width={1200} height={1200} sizes="(max-width: 650px) 150px, 184px" priority />
              <div className="art-panel"><div className="art-panel-top"><span className="art-panel-label">Currently seeking</span><span className="art-panel-status">Open</span></div><div className="art-panel-title">Software engineering roles</div><div className="art-panel-meta"><span>Entry-level</span><span>Intern</span><span>Associate</span></div></div>
            </div>
          </div>
          <div className="hero-bottom"><p>Based in <span>{location}</span></p><p>Open to <span>remote or on-site</span></p><p>Focus <span>MERN stack</span></p><p>Building with <span>curiosity & care</span></p></div>
        </section>

        <section className="section" id="about"><div className="wrap about-grid">
          <div className="about-aside"><span className="eyebrow">About me</span><span className="about-mark" aria-hidden="true"><CodeXml /></span><p>Full-stack development, learned by building complete applications and solving practical problems.</p></div>
          <div className="about-copy"><h3>Frontend detail.<br />Backend <em>follow-through.</em></h3><p>{content.about?.biography}</p><div className="about-facts"><div className="about-fact"><span>Based in</span><strong>India</strong></div><div className="about-fact"><span>Learning path</span><strong>Self-taught</strong></div><div className="about-fact"><span>Working style</span><strong>End to end</strong></div></div></div>
        </div></section>

        <section className="section" id="projects"><div className="wrap">
          <div className="section-heading"><div><span className="eyebrow">Selected full-stack projects</span><h2>Built to solve<br />real workflows.</h2></div><p>Five projects from my public GitHub work, spanning file sharing, assessments, insurance operations, healthcare, and e-commerce.</p></div>
          <div className="project-grid">{visibleProjects.map((project, index) => { const Icon = projectIcons[index % projectIcons.length]; return <Card className="project-card" key={project.name}>{project.imageUrl && <Image unoptimized className="project-cover" src={project.imageUrl} alt={`${project.name} project`} width={900} height={560} />}<CardContent className="project-card-content"><div className="project-card-top"><span className="project-symbol"><Icon aria-hidden="true" /></span><span className="project-number">0{index + 1} / 0{visibleProjects.length}</span></div><Badge variant="outline" className="project-type">{project.type}</Badge><h3 className="project-name">{project.name}</h3><p className="project-desc">{project.description}</p><div className="project-stack">{project.stack.map((technology) => <Badge variant="secondary" key={technology}>{technology}</Badge>)}</div><div className="project-actions"><Button nativeButton={false} variant="ghost" size="sm" render={<a href={project.href} target="_blank" rel="noreferrer" />}>View project <ArrowUpRight aria-hidden="true" /></Button>{project.sourceUrl && <Button nativeButton={false} variant="ghost" size="sm" render={<a href={project.sourceUrl} target="_blank" rel="noreferrer" />}>Source <CodeXml aria-hidden="true" /></Button>}</div></CardContent></Card>; })}</div>
        </div></section>

        <section className="section" id="services"><div className="wrap">
          <div className="section-heading"><div><span className="eyebrow">What I build</span><h2>Full-stack work,<br />from UI to data.</h2></div><p>My projects bring together the frontend, backend, and product workflows rather than treating them as separate pieces.</p></div>
          <div className="service-grid">{visibleServices.map((service, index) => <Card className="service" key={service.title}><CardContent><div className="service-top"><Badge variant="outline" className="service-number">0{index + 1}</Badge><ArrowRight className="service-icon" aria-hidden="true" /></div><h3>{service.title}</h3><p>{service.description}</p></CardContent></Card>)}</div>
        </div></section>

        <section className="section" id="skills"><div className="wrap skill-layout">
          <div><span className="eyebrow">Technical skills</span><h2 className="section-title">The stack I<br /><em>work with.</em></h2><p className="skill-intro">Tools and technologies represented across my public repositories. TypeScript is an active learning focus.</p></div>
          <div className="skill-groups">{visibleSkills.map((group) => <div className="skill-group" key={group.label}><h3>{group.label}</h3><div className="skill-tags">{group.skills.map((skill) => <span className="tag" key={skill}>{skill}</span>)}</div></div>)}</div>
        </div></section>

        <section className="section" id="practice"><div className="wrap">
          <div className="section-heading"><div><span className="eyebrow">Coding practice</span><h2>Learning by<br /><em>doing the work.</em></h2></div><p>Numbers and profiles listed in my current resume. Visit the platforms for the latest activity.</p></div>
          <div className="achievement-grid">{codingProfiles.map((profile) => <Card className="achievement" key={profile.label}><a href={profile.href} target="_blank" rel="noreferrer"><Trophy aria-hidden="true" /><strong>{profile.value}</strong><span>{profile.label}</span><small>{profile.detail}</small><ArrowUpRight className="achievement-link" aria-hidden="true" /></a></Card>)}</div>
          <div className="certification-links"><span>TRAINING & CERTIFICATES</span><a href="https://files.codingninjas.in/certi_image1860592e5d9e803ce88eebc79ef14ce8f0f219.jpg" target="_blank" rel="noreferrer">Data Structures & Algorithms · Coding Ninjas <ArrowUpRight aria-hidden="true" /></a><a href="https://verified.sertifier.com/en/verify/68027376016799/" target="_blank" rel="noreferrer">Full-Stack Development · AlmaBetter <ArrowUpRight aria-hidden="true" /></a></div>
        </div></section>

        <section className="section" id="experience"><div className="wrap">
          <div className="section-heading"><div><span className="eyebrow">Experience & education</span><h2>Engineering roots.<br />Software by <em>practice.</em></h2></div><p>Full-stack developer training at AlmaBetter alongside a B.Tech in Electrical Engineering.</p></div>
          <div className="experience-list">{visibleRoles.map((role) => <article className="experience" key={role.role}><span className="experience-date">{role.dates}</span><div><h3>{role.role}</h3><span className="experience-company">{role.company}</span><p>{role.detail}</p></div><span className="experience-kind">{role.type}</span></article>)}</div>
        </div></section>

        {visibleTestimonials.length > 0 && <section className="section" id="testimonials"><div className="wrap testimonial-wrap"><span className="eyebrow">Testimonials</span>{visibleTestimonials.map((testimonial) => <div key={testimonial.id}><blockquote>“{testimonial.quote}”</blockquote><p className="testimonial-credit">{testimonial.imageUrl ? <Image unoptimized className="testimonial-avatar-image" src={testimonial.imageUrl} alt={testimonial.author} width={76} height={76} /> : <span className="testimonial-avatar">{testimonial.author.slice(0, 2).toUpperCase()}</span>}<span><strong>{testimonial.author}</strong><br />{[testimonial.role, testimonial.company].filter(Boolean).join(", ")}</span></p></div>)}</div></section>}

        {visibleArticles.length > 0 && <section className="section" id="writing"><div className="wrap"><div className="section-heading"><div><span className="eyebrow">Writing</span><h2>Notes from<br />the work.</h2></div><p>Articles and notes published through the portfolio CMS.</p></div><div className="writing-grid">{visibleArticles.map((article) => <Card className="article" key={article.title}><Link href={`/blog/${article.slug}`}>{article.coverImage && <Image unoptimized className="article-card-cover" src={article.coverImage} alt="" width={700} height={420} />}<div className="article-meta"><Badge variant="outline">{article.category}</Badge><span>{article.date}</span></div><h3>{article.title}</h3><div className="article-bottom"><span>Read the note</span><ArrowUpRight aria-hidden="true" /></div></Link></Card>)}</div><Link className="all-writing-link" href="/blog">Explore all writing <ArrowRight aria-hidden="true" /></Link></div></section>}

        <section className="contact-section" id="contact"><div className="wrap">
          <span className="eyebrow">Open to opportunities</span>
          <div className="contact-layout"><div><h2>Let&apos;s build<br />something <em>useful.</em></h2><p className="contact-intro">I&apos;m looking for entry-level, internship, and associate opportunities in software engineering, frontend, and full-stack development.</p>{contactEmail && <a className="contact-email" href={`mailto:${contactEmail}`}>{contactEmail} <ArrowUpRight aria-hidden="true" /></a>}<a className="contact-email" href="tel:+918720026790"><Phone aria-hidden="true" /> +91 87200 26790</a></div>
            <form className="contact-form" onSubmit={handleContact} aria-busy={sending}><div className="form-row"><label>Your name<Input name="name" autoComplete="name" placeholder="How should I address you?" required disabled={sending} /></label><label>Email address<Input name="email" type="email" autoComplete="email" placeholder="you@example.com" required disabled={sending} /></label></div><label>What are you thinking about?<Textarea name="message" placeholder="A few lines is plenty..." required rows={5} disabled={sending} /></label><Button className="submit-button" type="submit" disabled={sending}>{sending ? "Sending..." : "Send a note"}{formStatus.startsWith("Your message has been sent") ? <Check /> : <Send />}</Button><p className="form-status" aria-live="polite">{formStatus}</p></form>
          </div>
        </div></section>
      </main>

      <SiteFooter name={displayName} email={contactEmail} linkedInUrl={content.about?.linkedInUrl} githubUrl={content.about?.githubUrl} />
    </div>
  );
}