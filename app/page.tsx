"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://cdn.shopify.com/s/files/1/0941/5383/4761/files/IblazeLogo.png?v=14858"
          alt="iBlaze Vape"
          width={80}
          className="mx-auto"
        />
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-2xl shadow-sm p-8 space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Returns Portal</h1>
          <p className="text-sm text-gray-500">
            Sign in with your iBlaze account to manage your returns
          </p>
        </div>

        {error === "auth_failed" && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            Authentication failed. Please try again.
          </div>
        )}

        <div className="space-y-3">
          <a
            href="/api/login"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E5403B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#cc3935] active:scale-[0.98]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" x2="3" y1="12" y2="12" />
            </svg>
            Sign in with iBlaze Account
          </a>

          <p className="text-center text-xs text-gray-400">
            You&apos;ll be redirected to Shopify to authenticate securely
          </p>
        </div>

        <div className="border-t border-gray-100 pt-4 text-center">
          <p className="text-xs text-gray-400">
            Need help?{" "}
            <a href="mailto:info@iblazevape.co.uk" className="text-[#E5403B] hover:underline">
              Contact support
            </a>
          </p>
        </div>
      </div>

      {/* Admin link */}
      <div className="mt-6">
        <a href="/admin/login" className="text-xs text-gray-300 hover:text-gray-500 transition">
          Admin access
        </a>
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
