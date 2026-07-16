// components/app-settings/rich-text-editor.tsx
"use client";

import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

// react-quill-new manipulates the real DOM directly (not React-rendered),
// so it can't run during SSR — dynamic import with ssr:false defers it to
// the client only. react-quill (the original package) is broken under
// React 18/19 StrictMode due to a findDOMNode call; react-quill-new is the
// maintained fork that fixes it.
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

const TOOLBAR_MODULES = {
  toolbar: [
    ["bold", "italic", "underline", "blockquote"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    ["clean"],
  ],
};

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

/**
 * Stores HTML (not Markdown). The storefront renders this via
 * components/policy-html.tsx, which sanitizes with DOMPurify before
 * dangerouslySetInnerHTML — the server also sanitizes on save
 * (app/api/app/branding/route.ts) as defense in depth.
 */
export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  return (
    <div className="quill-wrapper">
      <ReactQuill theme="snow" value={value} onChange={onChange} modules={TOOLBAR_MODULES} placeholder={placeholder} />
    </div>
  );
}
