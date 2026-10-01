"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, FileImage, LogOut, Plus, Save, Trash2, Upload } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:10000/api";
const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

type Field = { key: string; label: string; kind?: "textarea" | "boolean" | "tags" | "number" | "date"; required?: boolean };
type CmsRecord = Record<string, string | number | boolean | null | undefined>;
type CmsUser = { id: string; name: string; email: string };
type CmsSection = { key: string; label: string; fields?: Field[]; single?: boolean };

const sections: CmsSection[] = [
  { key: "overview", label: "Overview" },
  { key: "about", label: "Profile", single: true, fields: [
    { key: "fullName", label: "Full name", required: true }, { key: "headline", label: "Headline", required: true },
    { key: "email", label: "Email", required: true }, { key: "location", label: "Location" }, { key: "availability", label: "Availability" },
    { key: "intro", label: "Introduction", kind: "textarea", required: true }, { key: "biography", label: "Biography", kind: "textarea", required: true },
    { key: "linkedInUrl", label: "LinkedIn URL" }, { key: "githubUrl", label: "GitHub URL" }, { key: "resumeUrl", label: "Resume URL" },
  ] },
  { key: "projects", label: "Projects", fields: [
    { key: "title", label: "Title", required: true }, { key: "slug", label: "Slug", required: true }, { key: "role", label: "Role / category" },
    { key: "summary", label: "Summary", kind: "textarea", required: true }, { key: "description", label: "Details", kind: "textarea" },
    { key: "stack", label: "Tools (comma-separated)", kind: "tags" }, { key: "imageUrl", label: "Image URL" },
    { key: "websiteUrl", label: "Project URL" }, { key: "sourceUrl", label: "Source URL" }, { key: "sortOrder", label: "Display order", kind: "number" },
    { key: "featured", label: "Featured", kind: "boolean" }, { key: "published", label: "Published", kind: "boolean" },
  ] },
  { key: "skills", label: "Skills", fields: [
    { key: "name", label: "Skill", required: true }, { key: "category", label: "Category", required: true }, { key: "level", label: "Level" },
    { key: "sortOrder", label: "Display order", kind: "number" }, { key: "published", label: "Published", kind: "boolean" },
  ] },
  { key: "experience", label: "Experience", fields: [
    { key: "title", label: "Role", required: true }, { key: "company", label: "Company", required: true }, { key: "location", label: "Location" },
    { key: "employment", label: "Employment type" }, { key: "description", label: "Description", kind: "textarea", required: true },
    { key: "startDate", label: "Start date", required: true }, { key: "endDate", label: "End date" }, { key: "sortOrder", label: "Display order", kind: "number" },
    { key: "published", label: "Published", kind: "boolean" },
  ] },
  { key: "blogs", label: "Articles", fields: [
    { key: "title", label: "Title", required: true }, { key: "slug", label: "Slug", required: true }, { key: "category", label: "Category", required: true },
    { key: "excerpt", label: "Excerpt", kind: "textarea", required: true }, { key: "content", label: "Article content", kind: "textarea", required: true },
    { key: "coverImage", label: "Cover image URL" }, { key: "publishedAt", label: "Publish date", kind: "date" }, { key: "published", label: "Published", kind: "boolean" },
  ] },
  { key: "testimonials", label: "Testimonials", fields: [
    { key: "quote", label: "Quote", kind: "textarea", required: true }, { key: "author", label: "Author", required: true },
    { key: "role", label: "Role" }, { key: "company", label: "Company" }, { key: "imageUrl", label: "Image URL" },
    { key: "sortOrder", label: "Display order", kind: "number" }, { key: "published", label: "Published", kind: "boolean" },
  ] },
  { key: "services", label: "Services", fields: [
    { key: "title", label: "Service", required: true }, { key: "description", label: "Description", kind: "textarea", required: true },
    { key: "icon", label: "Icon name" }, { key: "sortOrder", label: "Display order", kind: "number" }, { key: "published", label: "Published", kind: "boolean" },
  ] },
  { key: "messages", label: "Messages" },
  { key: "media", label: "Media" },
];

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  let response = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: "include" });
  if (response.status === 401 && !["/auth/login", "/auth/refresh", "/auth/logout"].includes(path)) {
    const refreshed = await fetch(`${API_URL}/auth/refresh`, { method: "POST", credentials: "include" });
    if (refreshed.ok) response = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: "include" });
  }
  if (response.status === 204) return undefined as T;
  const result = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(result.error || "The request could not be completed.");
  return result as T;
}

function newDraft(fields: Field[]): CmsRecord {
  return Object.fromEntries(fields.map((field) => [field.key, field.kind === "boolean" ? false : field.kind === "number" ? 0 : ""]));
}

function formatValue(value: CmsRecord[string], field: Field) {
  if (field.kind === "tags" && Array.isArray(value)) return value.join(", ");
  if (field.kind === "date" && typeof value === "string") return value.slice(0, 10);
  return String(value ?? "");
}

export default function AdminDashboard() {
  const [user, setUser] = useState<CmsUser | null>(null);
  const [activeKey, setActiveKey] = useState("overview");
  const [items, setItems] = useState<CmsRecord[]>([]);
  const [draft, setDraft] = useState<CmsRecord>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [login, setLogin] = useState({ email: "", password: "" });
  const [refresh, setRefresh] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const section = sections.find((item) => item.key === activeKey) ?? sections[0];

  useEffect(() => {
    let mounted = true;
    request<{ user: CmsUser }>("/auth/me").then((result) => {
      if (mounted) setUser(result.user);
    }).catch(() => {
      if (mounted) setUser(null);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    if (activeKey === "overview") {
      Promise.all(["projects", "skills", "blogs", "experience", "messages", "services"].map(async (key) => {
        const path = key === "messages" ? "/messages" : `/${key}?admin=true`;
        const result = await request<{ items?: CmsRecord[] }>(path);
        return [key, result.items?.length ?? 0] as const;
      })).then((values) => {
        if (!cancelled) setCounts(Object.fromEntries(values));
      }).catch((loadError: Error) => {
        if (!cancelled) setError(loadError.message);
      });
    } else if (activeKey === "about") {
      request<{ item: CmsRecord | null }>("/about").then(({ item }) => {
        if (!cancelled) setDraft(item ?? newDraft(section.fields ?? []));
      }).catch((loadError: Error) => {
        if (!cancelled) setError(loadError.message);
      });
    } else {
      const endpoint = activeKey === "media" ? "/media" : `/${activeKey}?admin=true`;
      request<{ items: CmsRecord[] }>(endpoint).then(({ items: loaded }) => {
        if (!cancelled) setItems(loaded);
      }).catch((loadError: Error) => {
        if (!cancelled) setError(loadError.message);
      });
    }
    return () => { cancelled = true; };
  }, [activeKey, refresh, section.fields, user]);

  function openNewForm() {
    setEditingId(null);
    setDraft(newDraft(section.fields ?? []));
    setFormOpen(true);
  }

  function openEditForm(item: CmsRecord) {
    setEditingId(String(item.id));
    setDraft(item);
    setFormOpen(true);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await request<{ user: CmsUser }>("/auth/login", { method: "POST", body: JSON.stringify(login) });
      setUser(result.user);
      setNotice("Signed in successfully.");
    } catch (loginError) {
      setError((loginError as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const endpoint = section.single ? "/about" : `/${activeKey}${editingId ? `/${editingId}` : ""}`;
      const method = section.single ? "PUT" : editingId ? "PUT" : "POST";
      await request(endpoint, { method, body: JSON.stringify(draft) });
      setFormOpen(false);
      setNotice(`${section.label} saved.`);
      setRefresh((value) => value + 1);
    } catch (saveError) {
      setError((saveError as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(item: CmsRecord) {
    if (!window.confirm(`Delete “${String(item.title ?? item.name ?? item.author ?? "this item")}”?`)) return;
    setError("");
    try {
      await request(`/${activeKey}/${String(item.id)}`, { method: "DELETE" });
      setNotice("Item deleted.");
      setRefresh((value) => value + 1);
    } catch (deleteError) {
      setError((deleteError as Error).message);
    }
  }

  async function handleLogout() {
    await request("/auth/logout", { method: "POST" }).catch(() => undefined);
    setUser(null);
    setItems([]);
    setActiveKey("overview");
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const image = new FormData(formElement).get("image");
    if (!(image instanceof File) || image.size === 0) return setError("Choose an image to upload.");
    const body = new FormData();
    body.append("image", image);
    setBusy(true);
    setError("");
    try {
      await request("/upload/image", { method: "POST", body });
      formElement.reset();
      setNotice("Image uploaded.");
      setRefresh((value) => value + 1);
    } catch (uploadError) {
      setError((uploadError as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <main className="admin-login-shell">
        <Link className="admin-back" href="/"><ArrowLeft size={15} /> Back to portfolio</Link>
        <section className="admin-login">
          <span className="eyebrow">Private workspace</span>
          <h1>Good to see you.</h1>
          <p>Sign in to manage your portfolio content.</p>
          <form onSubmit={handleLogin}>
            <label>Email address<input type="email" autoComplete="username" value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} required /></label>
            <label>Password<input type="password" autoComplete="current-password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} required /></label>
            {error && <p className="admin-alert" role="alert">{error}</p>}
            <button className="admin-primary" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/">a. <span>PORTFOLIO CMS</span></Link>
        <div className="admin-nav-label">WORKSPACE</div>
        <nav aria-label="CMS sections">
          {sections.map((item) => <button className={`admin-nav-item${activeKey === item.key ? " active" : ""}`} key={item.key} onClick={() => { setActiveKey(item.key); setFormOpen(false); setError(""); setNotice(""); }}>{item.label}</button>)}
        </nav>
        <div className="admin-sidebar-bottom"><span>{user.name}</span><span>{user.email}</span><button onClick={handleLogout}><LogOut size={15} /> Sign out</button></div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar"><Link href="/" className="admin-back"><ArrowLeft size={14} /> View portfolio</Link><span className="admin-user">{user.name}</span></header>
        <div className="admin-content">
          <div className="admin-page-heading"><div><span className="eyebrow">Content management</span><h1>{section.label}</h1></div>
            {section.fields && !section.single && <button className="admin-primary admin-add" onClick={openNewForm}><Plus size={15} /> Add {section.label.slice(0, -1)}</button>}
          </div>
          {notice && <p className="admin-notice"><Check size={15} /> {notice}</p>}
          {error && <p className="admin-alert" role="alert">{error}</p>}

          {activeKey === "overview" && <div className="admin-overview"><p className="admin-lead">Your portfolio workspace is ready. Choose a section to update what visitors see.</p><div className="admin-stats">{Object.entries(counts).map(([key, count]) => <button key={key} onClick={() => setActiveKey(key)}><span>{sections.find((item) => item.key === key)?.label ?? key}</span><strong>{count}</strong></button>)}</div><div className="admin-quick-links"><span>QUICK ACCESS</span>{["about", "projects", "skills", "experience"].map((key) => <button key={key} onClick={() => setActiveKey(key)}>{sections.find((item) => item.key === key)?.label}<ArrowLeft size={14} /></button>)}</div></div>}

          {section.fields && <>
            {section.single ? <form className="admin-editor" onSubmit={handleSave}><RecordFields fields={section.fields} draft={draft} setDraft={setDraft} /><button className="admin-primary" disabled={busy}><Save size={15} /> Save profile</button></form> : formOpen ? <form className="admin-editor" onSubmit={handleSave}><div className="admin-editor-heading"><h2>{editingId ? "Edit item" : `New ${section.label.slice(0, -1)}`}</h2><button type="button" className="admin-text-button" onClick={() => setFormOpen(false)}>Cancel</button></div><RecordFields fields={section.fields} draft={draft} setDraft={setDraft} /><button className="admin-primary" disabled={busy}><Save size={15} /> {busy ? "Saving..." : "Save changes"}</button></form> : <ItemList items={items} resource={activeKey} onEdit={openEditForm} onDelete={handleDelete} />}
          </>}

          {activeKey === "messages" && <div className="admin-message-list">{items.map((item) => <article className="admin-message" key={String(item.id)}><div><div className="admin-message-meta"><strong>{String(item.name)}</strong><a href={`mailto:${String(item.email)}`}>{String(item.email)}</a><span>{new Date(String(item.createdAt)).toLocaleDateString()}</span></div><p>{String(item.message)}</p>{item.subject && <span className="admin-message-subject">{String(item.subject)}</span>}</div><select aria-label={`Status for message from ${String(item.name)}`} value={String(item.status)} onChange={async (event) => { await request(`/messages/${String(item.id)}`, { method: "PATCH", body: JSON.stringify({ status: event.target.value }) }); setRefresh((value) => value + 1); }}><option value="NEW">New</option><option value="READ">Read</option><option value="ARCHIVED">Archived</option></select></article>)}{items.length === 0 && <p className="admin-empty">No messages yet.</p>}</div>}

          {activeKey === "media" && <><form className="admin-upload" onSubmit={handleUpload}><label><FileImage size={18} /> Choose an image<input type="file" name="image" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" required /></label><button className="admin-primary" disabled={busy}><Upload size={15} /> Upload · max 5 MB</button></form><div className="admin-media-grid">{items.map((item) => <article className="admin-media-item" key={String(item.id)}><Image unoptimized width={640} height={480} src={`${API_ORIGIN}${String(item.url)}`} alt={String(item.altText ?? item.filename)} /><span>{String(item.filename)}</span><button className="admin-copy-button" onClick={() => navigator.clipboard.writeText(`${API_ORIGIN}${String(item.url)}`)}>Copy URL</button></article>)}</div>{items.length === 0 && <p className="admin-empty">Uploaded images will appear here.</p>}</>}
        </div>
      </main>
    </div>
  );
}

function RecordFields({ fields, draft, setDraft }: { fields: Field[]; draft: CmsRecord; setDraft: (value: CmsRecord) => void }) {
  return <div className="admin-fields">{fields.map((field) => <label className={`admin-field${field.kind === "textarea" ? " wide" : ""}`} key={field.key}>{field.label}
    {field.kind === "boolean" ? <span className="admin-toggle"><input type="checkbox" checked={Boolean(draft[field.key])} onChange={(event) => setDraft({ ...draft, [field.key]: event.target.checked })} /><span>{draft[field.key] ? "Published" : "Not published"}</span></span>
      : field.kind === "textarea" ? <textarea value={String(draft[field.key] ?? "")} required={field.required} rows={4} onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })} />
      : <input type={field.kind === "number" ? "number" : field.kind === "date" ? "date" : "text"} value={formatValue(draft[field.key], field)} required={field.required} onChange={(event) => setDraft({ ...draft, [field.key]: field.kind === "number" ? Number(event.target.value) : event.target.value })} />}
  </label>)}</div>;
}

function ItemList({ items, resource, onEdit, onDelete }: { items: CmsRecord[]; resource: string; onEdit: (item: CmsRecord) => void; onDelete: (item: CmsRecord) => void }) {
  if (!items.length) return <p className="admin-empty">Nothing here yet. Add your first {resource.slice(0, -1)}.</p>;
  return <div className="admin-item-list">{items.map((item) => <article className="admin-item" key={String(item.id)}><div><h2>{String(item.title ?? item.name ?? item.author ?? item.quote ?? "Untitled")}</h2><p>{String(item.summary ?? item.description ?? item.category ?? item.company ?? "")}</p><span className={`admin-status${item.published ? " published" : ""}`}>{item.published ? "Published" : "Draft"}</span></div><div className="admin-item-actions"><button onClick={() => onEdit(item)} aria-label="Edit item">Edit</button><button className="danger" onClick={() => onDelete(item)} aria-label="Delete item"><Trash2 size={15} /></button></div></article>)}</div>;
}