import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { getPortfolioData } from "@/lib/portfolio-data";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata = { title: "Writing — Saurabh Pandey" };

export default async function BlogPage() {
  const content = await getPortfolioData();
  const posts = content.blogs;
  const name = content.about?.fullName || "Saurabh Pandey";

  return (
    <>
      <SiteHeader name={name} headline={content.about?.headline || "FULL-STACK DEVELOPER"} githubUrl={content.about?.githubUrl} />
      <main className="article-page">
        <div className="wrap">
          <Link className="article-back" href="/#writing"><ArrowLeft size={15} /> Back to portfolio</Link>
          <header className="article-list-heading"><span className="eyebrow">Notes from the work</span><h1>Things worth<br />thinking through.</h1><p>Small observations from making digital products, working with people, and figuring things out as I go.</p></header>
          {posts.length > 0 ? <div className="article-list">{posts.map((post) => <Link className="article-list-item" href={`/blog/${post.slug}`} key={post.id}>{post.coverImage && <Image unoptimized className="article-list-cover" src={post.coverImage} alt="" width={320} height={200} />}<div><span className="article-list-meta">{post.category} · {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("en", { month: "long", year: "numeric" }) : "LATEST"}</span><h2>{post.title}</h2><p>{post.excerpt}</p></div><ArrowUpRight aria-hidden="true" /></Link>)}</div> : <div className="article-empty"><h2>No articles published yet.</h2><p>For now, explore the projects and code on GitHub.</p><a href="https://github.com/SaurabhPandey016" target="_blank" rel="noreferrer">Visit GitHub <ArrowUpRight size={15} /></a></div>}
        </div>
      </main>
      <SiteFooter name={name} email={content.about?.email} linkedInUrl={content.about?.linkedInUrl} githubUrl={content.about?.githubUrl} />
    </>
  );
}