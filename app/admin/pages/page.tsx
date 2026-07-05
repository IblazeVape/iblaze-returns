"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ExternalLinkIcon,
  KeyRoundIcon,
  LayoutTemplateIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const KEY_STORAGE = "pages-admin-key";

// Store-owner page builder: create and manage landing pages assembled from
// the marketing-site blocks, edited visually at /admin/pages/editor and
// served publicly at /lp/<path>. Mirrors the /admin/docs key-gate pattern.
export default function PagesAdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [pages, setPages] = useState<string[]>([]);
  const [newPath, setNewPath] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(KEY_STORAGE);
    if (saved) {
      setAdminKey(saved);
      void unlock(saved, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function unlock(key: string, silent = false) {
    const res = await fetch("/api/pages/admin", {
      headers: { "x-pages-admin-key": key },
      cache: "no-store",
    });
    if (!res.ok) {
      localStorage.removeItem(KEY_STORAGE);
      setUnlocked(false);
      if (!silent) toast.error("Invalid admin key.");
      return;
    }
    const body = (await res.json()) as { pages: string[] };
    localStorage.setItem(KEY_STORAGE, key);
    setPages(body.pages);
    setUnlocked(true);
  }

  async function createPage() {
    const path = newPath.trim().toLowerCase();
    if (!path) return;
    setBusy(true);
    try {
      const res = await fetch("/api/pages/admin", {
        method: "PUT",
        headers: { "content-type": "application/json", "x-pages-admin-key": adminKey },
        body: JSON.stringify({ path, data: { content: [], root: { props: {} } } }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error || "Could not create page.");
        return;
      }
      setPages((p) => (p.includes(path) ? p : [...p, path].sort()));
      setNewPath("");
      toast.success(`Created /lp/${path}`);
    } finally {
      setBusy(false);
    }
  }

  async function removePage(path: string) {
    if (!confirm(`Delete the page /lp/${path}? This cannot be undone.`)) return;
    const res = await fetch(`/api/pages/admin?path=${encodeURIComponent(path)}`, {
      method: "DELETE",
      headers: { "x-pages-admin-key": adminKey },
    });
    if (!res.ok) {
      toast.error("Could not delete page.");
      return;
    }
    setPages((p) => p.filter((x) => x !== path));
    toast.success("Page deleted.");
  }

  if (!unlocked) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-sm flex-col items-center justify-center gap-4 px-4">
        <KeyRoundIcon className="size-8 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Page builder</h1>
        <p className="text-center text-sm text-muted-foreground">
          Enter the admin key to manage landing pages.
        </p>
        <form
          className="flex w-full flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void unlock(adminKey);
          }}
        >
          <Label htmlFor="admin-key" className="sr-only">
            Admin key
          </Label>
          <Input
            id="admin-key"
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Admin key"
            autoFocus
          />
          <Button type="submit" disabled={!adminKey}>
            Unlock
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex items-center gap-3">
        <LayoutTemplateIcon className="size-6" />
        <div>
          <h1 className="text-xl font-semibold">Page builder</h1>
          <p className="text-sm text-muted-foreground">
            Drag-and-drop landing pages built from your marketing-site blocks. Pages are served
            at <code className="rounded bg-muted px-1">/lp/&lt;name&gt;</code>.
          </p>
        </div>
      </div>

      <form
        className="mt-8 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void createPage();
        }}
      >
        <Input
          value={newPath}
          onChange={(e) => setNewPath(e.target.value)}
          placeholder="new-page-name (e.g. black-friday)"
        />
        <Button type="submit" disabled={busy || !newPath.trim()}>
          <PlusIcon className="mr-1 size-4" /> Create
        </Button>
      </form>

      <div className="mt-6 divide-y rounded-lg border">
        {pages.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No pages yet. Create your first one above — try <code>spring-sale</code>.
          </p>
        )}
        {pages.map((path) => (
          <div key={path} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate font-medium">/lp/{path}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button asChild size="sm">
                <Link href={`/admin/pages/editor?path=${encodeURIComponent(path)}`}>
                  <PencilIcon className="mr-1 size-4" /> Edit
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/lp/${path}`} target="_blank">
                  <ExternalLinkIcon className="mr-1 size-4" /> View
                </Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void removePage(path)}>
                <Trash2Icon className="size-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
