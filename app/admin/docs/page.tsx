"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DocsMarkdown } from "@/components/docs/markdown";
import type { DocsConfig, DocsSection } from "@/lib/docs";
import { slugify } from "@/lib/docs";
import { cn } from "@/lib/utils";
import {
  ArrowDownIcon, ArrowUpIcon, BookOpenIcon, EyeIcon, ExternalLinkIcon,
  KeyRoundIcon, PencilIcon, PlusIcon, RotateCcwIcon, SaveIcon, Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const KEY_STORAGE = "docs-admin-key";

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// Store-owner docs manager: edit the help docs your customers see at /docs.
// Add, remove, rename, and reorder sidebar sections and pages, edit each
// page's markdown with a live preview, then save.
export default function DocsAdminPage() {
  const [config, setConfig] = useState<DocsConfig | null>(null);
  const [adminKey, setAdminKey] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAdminKey(localStorage.getItem(KEY_STORAGE) ?? "");
    fetch("/api/docs")
      .then((r) => r.json())
      .then((cfg: DocsConfig) => {
        setConfig(cfg);
        setSelected(cfg.sections[0]?.pages[0]?.slug ?? null);
      })
      .catch(() => toast.error("Could not load docs config"));
  }, []);

  const update = (fn: (cfg: DocsConfig) => DocsConfig) => {
    setConfig((cfg) => (cfg ? fn(structuredClone(cfg)) : cfg));
    setDirty(true);
  };

  const updateSection = (id: string, fn: (s: DocsSection) => void) =>
    update((cfg) => {
      const section = cfg.sections.find((s) => s.id === id);
      if (section) fn(section);
      return cfg;
    });

  const uniqueSlug = (cfg: DocsConfig, base: string) => {
    let slug = slugify(base);
    let n = 2;
    while (cfg.pages[slug]) slug = `${slugify(base)}-${n++}`;
    return slug;
  };

  const addSection = () =>
    update((cfg) => {
      cfg.sections.push({ id: `section-${Date.now()}`, title: "New Section", pages: [] });
      return cfg;
    });

  const addPage = (sectionId: string) =>
    update((cfg) => {
      const section = cfg.sections.find((s) => s.id === sectionId);
      if (!section) return cfg;
      const slug = uniqueSlug(cfg, "new-page");
      section.pages.push({ slug, title: "New page" });
      cfg.pages[slug] = { title: "New page", content: "# New page\n\nWrite your content here." };
      setSelected(slug);
      return cfg;
    });

  const removePage = (sectionId: string, slug: string) =>
    update((cfg) => {
      const section = cfg.sections.find((s) => s.id === sectionId);
      if (!section) return cfg;
      section.pages = section.pages.filter((p) => p.slug !== slug);
      delete cfg.pages[slug];
      if (selected === slug) setSelected(null);
      return cfg;
    });

  const removeSection = (sectionId: string) =>
    update((cfg) => {
      const section = cfg.sections.find((s) => s.id === sectionId);
      section?.pages.forEach((p) => {
        delete cfg.pages[p.slug];
        if (selected === p.slug) setSelected(null);
      });
      cfg.sections = cfg.sections.filter((s) => s.id !== sectionId);
      return cfg;
    });

  const save = async () => {
    if (!config) return;
    if (!adminKey) {
      toast.error("Enter your admin key first");
      return;
    }
    setSaving(true);
    try {
      localStorage.setItem(KEY_STORAGE, adminKey);
      const res = await fetch("/api/docs/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-docs-admin-key": adminKey },
        body: JSON.stringify(config),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Save failed (${res.status})`);
      setDirty(false);
      toast.success("Docs published — live at /docs");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!adminKey) {
      toast.error("Enter your admin key first");
      return;
    }
    if (!confirm("Discard all custom docs and restore the defaults?")) return;
    try {
      const res = await fetch("/api/docs/admin", {
        method: "DELETE",
        headers: { "x-docs-admin-key": adminKey },
      });
      if (!res.ok) throw new Error("Reset failed");
      const cfg: DocsConfig = await fetch("/api/docs").then((r) => r.json());
      setConfig(cfg);
      setSelected(cfg.sections[0]?.pages[0]?.slug ?? null);
      setDirty(false);
      toast.success("Docs restored to defaults");
    } catch {
      toast.error("Reset failed");
    }
  };

  if (!config) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-muted-foreground">
        Loading docs…
      </div>
    );
  }

  const page = selected ? config.pages[selected] : null;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex items-center gap-2 font-semibold">
            <BookOpenIcon className="h-5 w-5" />
            Docs Manager
          </div>
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <KeyRoundIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Admin key"
                className="h-8 w-40 pl-8 text-sm"
              />
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/docs" target="_blank">
                <EyeIcon /> View docs <ExternalLinkIcon className="opacity-50" />
              </Link>
            </Button>
            <Button size="sm" onClick={save} disabled={saving || !dirty}>
              <SaveIcon /> {saving ? "Publishing…" : dirty ? "Publish" : "Published"}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:flex-row">
        {/* Structure editor */}
        <aside className="w-full shrink-0 lg:w-80">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Sidebar navigation
            </h2>
            <Button variant="ghost" size="sm" onClick={addSection}>
              <PlusIcon /> Section
            </Button>
          </div>
          <div className="flex flex-col gap-4">
            {config.sections.map((section, si) => (
              <div key={section.id} className="rounded-lg border border-border">
                <div className="flex items-center gap-1 border-b border-border bg-muted/40 p-2">
                  <Input
                    value={section.title}
                    onChange={(e) => updateSection(section.id, (s) => { s.title = e.target.value; })}
                    className="h-7 border-none bg-transparent px-1 text-sm font-semibold shadow-none focus-visible:ring-1"
                  />
                  <Button variant="ghost" size="icon-sm" className="shrink-0" disabled={si === 0}
                    onClick={() => update((cfg) => { cfg.sections = move(cfg.sections, si, si - 1); return cfg; })}>
                    <ArrowUpIcon />
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="shrink-0" disabled={si === config.sections.length - 1}
                    onClick={() => update((cfg) => { cfg.sections = move(cfg.sections, si, si + 1); return cfg; })}>
                    <ArrowDownIcon />
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => removeSection(section.id)}>
                    <Trash2Icon />
                  </Button>
                </div>
                <ul className="p-1.5">
                  {section.pages.map((p, pi) => (
                    <li key={p.slug}
                      className={cn(
                        "group flex items-center gap-1 rounded-md px-2 py-1",
                        selected === p.slug ? "bg-muted" : "hover:bg-muted/50",
                      )}
                    >
                      <button
                        className="flex flex-1 items-center gap-2 truncate text-left text-sm"
                        onClick={() => { setSelected(p.slug); setPreview(false); }}
                      >
                        <PencilIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate">{p.title}</span>
                      </button>
                      <span className="hidden text-[10px] text-muted-foreground/60 md:group-hover:inline">
                        /{p.slug}
                      </span>
                      <Button variant="ghost" size="icon-sm" className="h-6 w-6 shrink-0" disabled={pi === 0}
                        onClick={() => updateSection(section.id, (s) => { s.pages = move(s.pages, pi, pi - 1); })}>
                        <ArrowUpIcon />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="h-6 w-6 shrink-0" disabled={pi === section.pages.length - 1}
                        onClick={() => updateSection(section.id, (s) => { s.pages = move(s.pages, pi, pi + 1); })}>
                        <ArrowDownIcon />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => removePage(section.id, p.slug)}>
                        <Trash2Icon />
                      </Button>
                    </li>
                  ))}
                  <li>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground"
                      onClick={() => addPage(section.id)}>
                      <PlusIcon /> Add page
                    </Button>
                  </li>
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-4 sm:hidden">
            <Label htmlFor="admin-key-mobile" className="text-xs text-muted-foreground">Admin key</Label>
            <Input
              id="admin-key-mobile"
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Admin key"
              className="mt-1"
            />
          </div>
          <Button variant="ghost" size="sm" className="mt-4 text-muted-foreground" onClick={reset}>
            <RotateCcwIcon /> Reset to default docs
          </Button>
        </aside>

        {/* Page editor */}
        <main className="min-w-0 flex-1">
          {page && selected ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-48 flex-1">
                  <Label htmlFor="page-title">Page title</Label>
                  <Input
                    id="page-title"
                    value={page.title}
                    className="mt-1.5"
                    onChange={(e) =>
                      update((cfg) => {
                        cfg.pages[selected].title = e.target.value;
                        for (const s of cfg.sections) {
                          const meta = s.pages.find((p) => p.slug === selected);
                          if (meta) meta.title = e.target.value;
                        }
                        return cfg;
                      })
                    }
                  />
                </div>
                <div className="min-w-48 flex-1">
                  <Label htmlFor="page-desc">Description (optional)</Label>
                  <Input
                    id="page-desc"
                    value={page.description ?? ""}
                    className="mt-1.5"
                    onChange={(e) => update((cfg) => { cfg.pages[selected].description = e.target.value; return cfg; })}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => setPreview((v) => !v)}>
                  <EyeIcon /> {preview ? "Edit" : "Preview"}
                </Button>
              </div>

              {preview ? (
                <div className="rounded-lg border border-border p-6">
                  <DocsMarkdown content={page.content} />
                </div>
              ) : (
                <>
                  <Textarea
                    value={page.content}
                    onChange={(e) => update((cfg) => { cfg.pages[selected].content = e.target.value; return cfg; })}
                    className="min-h-[60dvh] font-mono text-sm leading-6"
                    placeholder="# Heading&#10;&#10;Write markdown here…"
                  />
                  <p className="text-xs text-muted-foreground">
                    Markdown supported: headings (#, ##), **bold**, lists, tables, links, quotes, and code.
                    Customers see this page at <span className="font-mono text-foreground">/docs/{selected}</span>.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
              Select a page on the left, or add a new one.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
