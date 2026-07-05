"use client";

import { Puck } from "@measured/puck";
import "@measured/puck/puck.css";
import { puckConfig, type PuckPageDoc } from "@/components/puck/config";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

const KEY_STORAGE = "pages-admin-key";

const EMPTY_DATA: PuckPageDoc = { content: [], root: { props: {} } };

// The visual drag-and-drop editor for one landing page. Blocks come from
// components/puck/config.tsx; publishing saves the page JSON to Redis via
// the key-gated admin API, and the page goes live at /lp/<path> immediately.
function Editor() {
  const params = useSearchParams();
  const router = useRouter();
  const path = params.get("path") || "";
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [data, setData] = useState<PuckPageDoc | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const key = localStorage.getItem(KEY_STORAGE);
    if (!key) {
      router.replace("/admin/pages");
      return;
    }
    setAdminKey(key);
    if (!path) {
      setError("No page selected.");
      return;
    }
    fetch(`/api/pages/admin?path=${encodeURIComponent(path)}`, {
      headers: { "x-pages-admin-key": key },
      cache: "no-store",
    })
      .then(async (res) => {
        if (res.status === 401) {
          localStorage.removeItem(KEY_STORAGE);
          router.replace("/admin/pages");
          return;
        }
        if (!res.ok) throw new Error();
        const body = (await res.json()) as { data: PuckPageDoc | null };
        setData(body.data ?? EMPTY_DATA);
      })
      .catch(() => setError("Could not load this page."));
  }, [path, router]);

  async function publish(newData: PuckPageDoc) {
    const res = await fetch("/api/pages/admin", {
      method: "PUT",
      headers: { "content-type": "application/json", "x-pages-admin-key": adminKey || "" },
      body: JSON.stringify({ path, data: newData }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Could not publish.");
      return;
    }
    toast.success(`Published — live at /${path}`);
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button asChild variant="outline">
          <Link href="/admin/pages">
            <ArrowLeftIcon className="mr-1 size-4" /> Back to pages
          </Link>
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Loading editor…
      </div>
    );
  }

  return (
    <div className="h-dvh">
      <Puck
        config={puckConfig}
        data={data}
        onPublish={publish}
        headerPath={`/${path}`}
        iframe={{ enabled: false }}
        overrides={{
          headerActions: ({ children }) => (
            <>
              <a
                href={`/${path}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-muted"
              >
                <ExternalLinkIcon className="size-4" /> View page
              </a>
              {children}
            </>
          ),
        }}
      />
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={null}>
      <Editor />
    </Suspense>
  );
}
