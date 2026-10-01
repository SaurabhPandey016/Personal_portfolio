import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { getBlogPost } from "@/lib/portfolio-data";

type BlogPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  return post ? { title: `${post.title} — Saurabh Pandey`, description: post.excerpt } : { title: "Note not found — Saurabh Pandey" };
}

export default async function BlogPostPage({ params }: BlogPageProps) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return <main className="article-page"><div className="wrap article-not-found"><h1>That note isn&apos;t here.</h1><Link className="article-back" href="/blog"><ArrowLeft size={15} /> Browse all notes</Link></div></main>;

  return (
    <main className="article-page">
      <article className="wrap article-detail">
        <Link className="article-back" href="/blog"><ArrowLeft size={15} /> All notes</Link>
        <header className="article-detail-heading"><span className="eyebrow">{post.category} · {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("en", { month: "long", year: "numeric" }) : "LATEST"}</span><h1>{post.title}</h1><p>{post.excerpt}</p>{post.coverImage && <Image unoptimized className="article-cover" src={post.coverImage} alt="" width={1400} height={700} />}</header>
        <div className="article-content">{post.content.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
        <Link className="article-next" href="/#contact">Have a thought to share? <span>Write me a note <ArrowUpRight size={15} /></span></Link>
      </article>
    </main>
  );
}