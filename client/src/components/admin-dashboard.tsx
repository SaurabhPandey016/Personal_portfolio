"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Check, FileImage, FileText, LoaderCircle, LogOut, Plus, Save, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const API_URL = (process.env.NEXT_PUBLIC_API_URL?.trim() || "/api").replace(/\/+$/, "");
const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");
const previewableImageTypes = new Set(["image/avif", "image/gif", "image/jpeg", "image/png", "image/webp"]);

function resolveMediaUrl(url: string) {
  return url.startsWith("http://") || url.startsWith("https://") ? url : `${API_ORIGIN}${url}`;
}

function isPreviewableImage(mimeType: CmsRecord[string]) {
  return previewableImageTypes.has(String(mimeType).toLowerCase());
}

type Field = { key: string; label: string; kind?: "textarea" | "boolean" | "tags" | "number" | "date" | "media"; mediaType?: "image" | "file"; required?: boolean };
type CmsRecord = Record<string, string | number | boolean | null | undefined>;
type CmsUser = { id: string; name: string; email: string };
type CmsSection = { key: string; label: string; fields?: Field[]; single?: boolean };

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

const sections: CmsSection[] = [
  { key: "overview", label: "Overview" },
  { key: "about", label: "Profile", single: true, fields: [
    { key: "fullName", label: "Full name", required: true }, { key: "headline", label: "Headline", required: true },
    { key: "email", label: "Email", required: true }, { key: "location", label: "Location" }, { key: "availability", label: "Availability" },
    { key: "intro", label: "Introduction", kind: "textarea", required: true }, { key: "biography", label: "Biography", kind: "textarea", required: true },
    { key: "profileImageUrl", label: "Profile image", kind: "media", mediaType: "image" },
    { key: "linkedInUrl", label: "LinkedIn URL" }, { key: "githubUrl", label: "GitHub URL" }, { key: "resumeUrl", label: "Resume file", kind: "media", mediaType: "file" },
  ] },
  { key: "projects", label: "Projects", fields: [
    { key: "title", label: "Title", required: true }, { key: "slug", label: "Slug", required: true }, { key: "role", label: "Role / category" },
    { key: "summary", label: "Summary", kind: "textarea", required: true }, { key: "description", label: "Details", kind: "textarea" },
    { key: "stack", label: "Tools (comma-separated)", kind: "tags" }, { key: "imageUrl", label: "Project image", kind: "media", mediaType: "image" },
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
    { key: "coverImage", label: "Cover image", kind: "media", mediaType: "image" }, { key: "publishedAt", label: "Publish date", kind: "date" }, { key: "published", label: "Published", kind: "boolean" },
  ] },
  { key: "testimonials", label: "Testimonials", fields: [
    { key: "quote", label: "Quote", kind: "textarea", required: true }, { key: "author", label: "Author", required: true },
    { key: "role", label: "Role" }, { key: "company", label: "Company" }, { key: "imageUrl", label: "Author image", kind: "media", mediaType: "image" },
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
  const fetchWithTimeout = async (url: string, requestInit: RequestInit) => {
    try {
      return await fetch(url, { ...requestInit, signal: AbortSignal.timeout(45_000) });
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new Error("The CMS server is taking too long to respond. Please wait a moment and try again.");
      }
      if (error instanceof TypeError) {
        throw new Error("Could not reach the CMS server. Check your connection and try again.");
      }
      throw error;
    }
  };
  let response = await fetchWithTimeout(`${API_URL}${path}`, { ...init, headers, credentials: "include" });
  if (response.status === 401 && !["/auth/login", "/auth/refresh", "/auth/logout"].includes(path)) {
    const refreshed = await fetchWithTimeout(`${API_URL}/auth/refresh`, { method: "POST", credentials: "include" });
    if (refreshed.ok) response = await fetchWithTimeout(`${API_URL}${path}`, { ...init, headers, credentials: "include" });
  }
  if (response.status === 204) return undefined as T;
  const result = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) {
    if (response.status === 429) throw new ApiError("Too many sign-in attempts. Please wait a few minutes and try again.", response.status);
    if (response.status >= 500) throw new ApiError(result.error || "The CMS server encountered a problem. Please try again shortly.", response.status);
    throw new ApiError(result.error || "The request could not be completed.", response.status);
  }
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
  const [authChecking, setAuthChecking] = useState(true);
  const [activeKey, setActiveKey] = useState("overview");
  const [items, setItems] = useState<CmsRecord[]>([]);
  const [mediaLibrary, setMediaLibrary] = useState<CmsRecord[]>([]);
  const [draft, setDraft] = useState<CmsRecord>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [savingMessageId, setSavingMessageId] = useState<string | null>(null);
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
    }).catch((authError: Error) => {
      if (!mounted) return;
      setUser(null);
      if (!(authError instanceof ApiError && authError.status === 401)) setError(authError.message);
    }).finally(() => {
      if (mounted) setAuthChecking(false);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    if (activeKey === "overview") {
      Promise.all(["projects", "skills", "blogs", "experience", "testimonials", "messages", "services"].map(async (key) => {
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

  useEffect(() => {
    if (!user || !section.fields?.some((field) => field.kind === "media")) return;
    let cancelled = false;
    request<{ items: CmsRecord[] }>("/media").then(({ items: loaded }) => {
      if (!cancelled) setMediaLibrary(loaded);
    }).catch((loadError: Error) => {
      if (!cancelled) setError(loadError.message);
    });
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
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await request<{ user: CmsUser }>("/auth/login", { method: "POST", body: JSON.stringify(login) });
      setUser(result.user);
      setLogin({ email: "", password: "" });
      setNotice("Signed in successfully.");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Sign-in failed. Please try again.");
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
    setLogoutPending(true);
    setError("");
    try {
      await request("/auth/logout", { method: "POST" });
      setUser(null);
      setItems([]);
      setDraft({});
      setFormOpen(false);
      setActiveKey("overview");
    } catch (logoutError) {
      setError((logoutError as Error).message);
    } finally {
      setLogoutPending(false);
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const file = new FormData(formElement).get("image");
    if (!(file instanceof File) || file.size === 0) return setError("Choose a file to upload.");
    const body = new FormData();
    body.append("image", file);
    setBusy(true);
    setError("");
    try {
      await request("/upload/image", { method: "POST", body });
      formElement.reset();
      setNotice("File uploaded.");
      setRefresh((value) => value + 1);
    } catch (uploadError) {
      setError((uploadError as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleMessageStatusChange(id: string, status: string) {
    setError("");
    try {
      await request(`/messages/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setItems((currentItems) => currentItems.map((item) => item.id === id ? { ...item, status } : item));
      setNotice("Message status updated.");
    } catch (statusError) {
      setError((statusError as Error).message);
    } finally {
      setSavingMessageId(null);
    }
  }

  async function handleCopyMediaUrl(url: string) {
    setError("");
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Media URL copied.");
    } catch (copyError) {
      setError((copyError as Error).message || "The media URL could not be copied.");
    }
  }

  if (authChecking) {
    return <main className="admin-login-shell"><p role="status">Checking your session...</p></main>;
  }

  if (!user) {
    return (
      <main className="admin-login-shell">
        <Link className="admin-back" href="/"><ArrowLeft size={15} /> Back to portfolio</Link>
        <section className="admin-login">
          <span className="eyebrow">Private workspace</span>
          <h1>Good to see you.</h1>
          <p>Sign in to manage your portfolio content.</p>
          <form onSubmit={handleLogin} aria-busy={busy}>
            <label>Email address<input type="email" autoComplete="username" value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} disabled={busy} required /></label>
            <label>Password<input type="password" autoComplete="current-password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} disabled={busy} required /></label>
            {error && <p className="admin-alert" role="alert"><AlertCircle size={15} aria-hidden="true" />{error}</p>}
            <Button type="submit" className="admin-primary admin-login-submit" disabled={busy} aria-live="polite">{busy && <LoaderCircle size={16} className="admin-spinner" aria-hidden="true" />}{busy ? "Signing in..." : "Sign in"}</Button>
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
        <div className="admin-sidebar-bottom"><span>{user.name}</span><span>{user.email}</span></div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <Link href="/" className="admin-back"><ArrowLeft size={14} /> View portfolio</Link>
          <div className="admin-topbar-actions"><span className="admin-user">{user.name}</span><Button variant="outline" className="admin-logout" onClick={handleLogout} disabled={logoutPending}><LogOut size={15} /> {logoutPending ? "Signing out..." : "Sign out"}</Button></div>
        </header>
        <div className="admin-content">
          <div className="admin-page-heading"><div><span className="eyebrow">Content management</span><h1>{section.label}</h1></div>
            {section.fields && !section.single && <Button className="admin-primary admin-add" onClick={openNewForm}><Plus size={15} /> Add {section.label.slice(0, -1)}</Button>}
          </div>
          {notice && <p className="admin-notice"><Check size={15} /> {notice}</p>}
          {error && <p className="admin-alert" role="alert">{error}</p>}

          {activeKey === "overview" && <div className="admin-overview"><p className="admin-lead">Your portfolio workspace is ready. Choose a section to update what visitors see.</p><div className="admin-stats">{Object.entries(counts).map(([key, count]) => <button key={key} onClick={() => setActiveKey(key)}><span>{sections.find((item) => item.key === key)?.label ?? key}</span><strong>{count}</strong></button>)}</div><div className="admin-quick-links"><span>QUICK ACCESS</span>{["about", "projects", "skills", "experience"].map((key) => <button key={key} onClick={() => setActiveKey(key)}>{sections.find((item) => item.key === key)?.label}<ArrowLeft size={14} /></button>)}</div></div>}

          {section.fields && <>
            {section.single ? <form className="admin-editor" onSubmit={handleSave}><RecordFields fields={section.fields} draft={draft} setDraft={setDraft} mediaLibrary={mediaLibrary} /><Button type="submit" className="admin-primary" disabled={busy}><Save size={15} /> Save profile</Button></form> : formOpen ? <form className="admin-editor" onSubmit={handleSave}><div className="admin-editor-heading"><h2>{editingId ? "Edit item" : `New ${section.label.slice(0, -1)}`}</h2><button type="button" className="admin-text-button" onClick={() => setFormOpen(false)}>Cancel</button></div><RecordFields fields={section.fields} draft={draft} setDraft={setDraft} mediaLibrary={mediaLibrary} /><Button type="submit" className="admin-primary" disabled={busy}><Save size={15} /> {busy ? "Saving..." : "Save changes"}</Button></form> : <ItemList items={items} resource={activeKey} onEdit={openEditForm} onDelete={handleDelete} />}
          </>}

          {activeKey === "messages" && <div className="admin-message-list">{items.map((item) => <article className="admin-message" key={String(item.id)}><div><div className="admin-message-meta"><strong>{String(item.name)}</strong><a href={`mailto:${String(item.email)}`}>{String(item.email)}</a><span>{new Date(String(item.createdAt)).toLocaleDateString()}</span></div><p>{String(item.message)}</p>{item.subject && <span className="admin-message-subject">{String(item.subject)}</span>}</div><select aria-label={`Status for message from ${String(item.name)}`} value={String(item.status)} disabled={savingMessageId === String(item.id)} onChange={(event) => { const status = event.currentTarget.value; setSavingMessageId(String(item.id)); void handleMessageStatusChange(String(item.id), status); }}><option value="NEW">New</option><option value="READ">Read</option><option value="ARCHIVED">Archived</option></select></article>)}{items.length === 0 && <p className="admin-empty">No messages yet.</p>}</div>}

          {activeKey === "media" && <>
            <form className="admin-upload" onSubmit={handleUpload}>
              <label><FileImage size={18} /> Choose a file<input type="file" name="image" required /></label>
              <Button type="submit" className="admin-primary" disabled={busy}>{busy ? <LoaderCircle size={15} className="admin-spinner" /> : <Upload size={15} />}{busy ? "Uploading..." : "Upload · max 10 MB"}</Button>
            </form>
            <p className="admin-media-help">Upload images and documents once, then select them in Profile, Projects, Articles, or Testimonials.</p>
            <div className="admin-media-grid">{items.map((item) => {
              const url = resolveMediaUrl(String(item.url));
              const previewableImage = isPreviewableImage(item.mimeType);
              const sizeInMb = (Number(item.size) / (1024 * 1024)).toFixed(2);
              return <article className="admin-media-item" key={String(item.id)}>
                {previewableImage ? <Image unoptimized width={640} height={480} src={url} alt={String(item.originalName ?? item.filename)} /> : <a className="admin-file-preview" href={url}><FileText size={44} aria-hidden="true" /><span>Download file</span></a>}
                <span>{String(item.originalName ?? item.filename)}</span><small>{sizeInMb} MB · {String(item.mimeType)}</small>
                <Button type="button" variant="outline" className="admin-copy-button" onClick={() => { void handleCopyMediaUrl(String(item.url)); }}>Copy URL</Button>
              </article>;
            })}</div>
            {items.length === 0 && <p className="admin-empty">Uploaded files will appear here.</p>}
          </>}
        </div>
      </main>
    </div>
  );
}

function RecordFields({ fields, draft, setDraft, mediaLibrary }: { fields: Field[]; draft: CmsRecord; setDraft: (value: CmsRecord) => void; mediaLibrary: CmsRecord[] }) {
  return <div className="admin-fields">{fields.map((field) => <label className={`admin-field${field.kind === "textarea" ? " wide" : ""}`} key={field.key}>{field.label}
    {field.kind === "boolean" ? <span className="admin-toggle"><input type="checkbox" checked={Boolean(draft[field.key])} onChange={(event) => setDraft({ ...draft, [field.key]: event.target.checked })} /><span>{draft[field.key] ? "Published" : "Not published"}</span></span>
      : field.kind === "textarea" ? <Textarea value={String(draft[field.key] ?? "")} required={field.required} rows={4} onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })} />
      : field.kind === "media" ? <MediaPicker field={field} mediaLibrary={mediaLibrary} value={String(draft[field.key] ?? "")} onChange={(value) => setDraft({ ...draft, [field.key]: value })} />
      : <Input type={field.kind === "number" ? "number" : field.kind === "date" ? "date" : "text"} value={formatValue(draft[field.key], field)} required={field.required} onChange={(event) => setDraft({ ...draft, [field.key]: field.kind === "number" ? Number(event.target.value) : event.target.value })} />}
  </label>)}</div>;
}

function MediaPicker({ field, mediaLibrary, value, onChange }: { field: Field; mediaLibrary: CmsRecord[]; value: string; onChange: (value: string) => void }) {
  const assets = mediaLibrary.filter((item) => field.mediaType !== "image" || isPreviewableImage(item.mimeType));
  const selectedAsset = assets.find((item) => item.url === value);
  const selectedIsImage = isPreviewableImage(selectedAsset?.mimeType);

  return <div className="admin-media-picker">
    <select aria-label={`Choose uploaded ${field.mediaType === "image" ? "image" : "file"} for ${field.label}`} value={selectedAsset ? value : ""} onChange={(event) => { if (event.currentTarget.value) onChange(event.currentTarget.value); }}>
      <option value="">Choose from uploaded media…</option>
      {assets.map((item) => <option key={String(item.id)} value={String(item.url)}>{String(item.originalName ?? item.filename)}</option>)}
    </select>
    <Input aria-label={`${field.label} URL`} type="url" value={value} placeholder="Or paste an external URL" onChange={(event) => onChange(event.target.value)} />
    {selectedAsset && selectedIsImage && <Image className="admin-media-selection-preview" unoptimized width={320} height={180} src={resolveMediaUrl(value)} alt={String(selectedAsset.altText ?? selectedAsset.originalName ?? field.label)} />}
    <span>Upload and manage assets in the Media section, then select them here.</span>
  </div>;
}

function ItemList({ items, resource, onEdit, onDelete }: { items: CmsRecord[]; resource: string; onEdit: (item: CmsRecord) => void; onDelete: (item: CmsRecord) => void }) {
  if (!items.length) return <p className="admin-empty">Nothing here yet. Add your first {resource.slice(0, -1)}.</p>;
  return <div className="admin-item-list">{items.map((item) => <article className="admin-item" key={String(item.id)}><div><h2>{String(item.title ?? item.name ?? item.author ?? item.quote ?? "Untitled")}</h2><p>{String(item.summary ?? item.description ?? item.category ?? item.company ?? "")}</p><Badge variant={item.published ? "default" : "outline"} className={`admin-status${item.published ? " published" : ""}`}>{item.published ? "Published" : "Draft"}</Badge></div><div className="admin-item-actions"><Button variant="outline" onClick={() => onEdit(item)} aria-label="Edit item">Edit</Button><Button variant="destructive" className="danger" onClick={() => onDelete(item)} aria-label="Delete item"><Trash2 size={15} /></Button></div></article>)}</div>;
}