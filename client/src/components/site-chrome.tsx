"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CodeXml, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  ["About", "about"],
  ["Work", "projects"],
  ["Skills", "skills"],
  ["Journey", "experience"],
  ["Contact", "contact"],
] as const;

type SiteHeaderProps = {
  name: string;
  headline: string;
  githubUrl?: string | null;
};

export function SiteHeader({ name, headline, githubUrl }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <Link className="brand" href="/#home" aria-label={`${name} home`} onClick={() => setMenuOpen(false)}>
          <span className="brand-mark"><CodeXml aria-hidden="true" /></span>
          <span className="brand-copy">{name}<span className="brand-caption">{headline}</span></span>
        </Link>
        <nav className={`nav-list${menuOpen ? " is-open" : ""}`} aria-label="Main navigation">
          {navigation.map(([label, id]) => (
            <Link className="nav-link" href={`/#${id}`} key={id} onClick={() => setMenuOpen(false)}>{label}</Link>
          ))}
          <Link className="mobile-admin-link" href="/admin" onClick={() => setMenuOpen(false)}>Admin workspace</Link>
        </nav>
        <Button nativeButton={false} render={<a href={githubUrl || "https://github.com/SaurabhPandey016"} target="_blank" rel="noreferrer" />} className="header-contact">
          GitHub <ArrowUpRight aria-hidden="true" />
        </Button>
        <button className="mobile-toggle" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}

type SiteFooterProps = {
  name: string;
  email?: string;
  linkedInUrl?: string | null;
  githubUrl?: string | null;
};

export function SiteFooter({ name, email, linkedInUrl, githubUrl }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-cta">
          <div>
            <span className="eyebrow">Have a good problem to solve?</span>
            <h2>Let&apos;s make<br /><em>something matter.</em></h2>
          </div>
          <Button nativeButton={false} render={<Link href="/#contact" />} className="footer-cta-button">
            Start a conversation <ArrowRight aria-hidden="true" />
          </Button>
        </div>
        <div className="footer-main">
          <div className="footer-brand">
            <Link className="brand" href="/#home">
              <span className="brand-mark"><CodeXml aria-hidden="true" /></span>
              <span className="brand-copy">{name}<span className="brand-caption">FULL-STACK DEVELOPER</span></span>
            </Link>
            <p>Thoughtful interfaces. Reliable systems.<br />Built with curiosity and care.</p>
          </div>
          <div className="footer-column">
            <span className="footer-column-title">Explore</span>
            <Link href="/#about">About me</Link>
            <Link href="/#projects">Selected work</Link>
            <Link href="/blog">Writing</Link>
          </div>
          <div className="footer-column">
            <span className="footer-column-title">Connect</span>
            {email && <a href={`mailto:${email}`}>Email me</a>}
            <a href={linkedInUrl || "https://www.linkedin.com/in/saurabhpandey-/"} target="_blank" rel="noreferrer">LinkedIn <ArrowUpRight aria-hidden="true" /></a>
            <a href={githubUrl || "https://github.com/SaurabhPandey016"} target="_blank" rel="noreferrer">GitHub <ArrowUpRight aria-hidden="true" /></a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} {name}. Made with purpose.</span>
          <Link href="/admin">Admin workspace</Link>
          <a className="footer-top" href="#top" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Back to top ↑</a>
        </div>
      </div>
    </footer>
  );
}
