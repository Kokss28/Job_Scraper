"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="space-y-4">
      {error ? (
        <p className="text-sm text-slate-400 bg-slate-900 border border-slate-800 p-3 rounded-lg font-mono text-xs text-rose-400">
          Code error: {error}
        </p>
      ) : (
        <p className="text-sm text-slate-400">
          An unspecified error occurred.
        </p>
      )}

      <div className="flex flex-col gap-2 pt-2">
        <Link
          href="/auth/login"
          className="w-full text-center px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
        >
          Return to Sign In
        </Link>
        <Link
          href="/dashboard"
          className="w-full text-center px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-[#070b14]">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card className="bg-[#0b1220] border-slate-800 text-slate-100">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">
                Authentication Notice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<p className="text-xs text-slate-400">Loading error details...</p>}>
                <ErrorContent />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

