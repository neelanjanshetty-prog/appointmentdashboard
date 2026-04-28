"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { setToken } from "@/lib/auth";
import type { ApiResponse, User } from "@/types";

type VerifyResponse = {
  token: string;
  user: User;
};

function VerifyContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      return;
    }

    api
      .get<ApiResponse<VerifyResponse>>(`/api/auth/verify?token=${encodeURIComponent(token)}`)
      .then((response) => {
        setToken(response.data.data.token);
        setStatus("success");
        window.setTimeout(() => router.replace("/dashboard"), 700);
      })
      .catch(() => setStatus("error"));
  }, [params, router]);

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="glass-panel w-full max-w-md rounded-2xl p-8 text-center">
        {status === "loading" ? <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-600 dark:text-white" /> : null}
        {status === "success" ? <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" /> : null}
        {status === "error" ? <XCircle className="mx-auto h-10 w-10 text-rose-500" /> : null}
        <h1 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">
          {status === "loading" && "Verifying your login"}
          {status === "success" && "Login verified"}
          {status === "error" && "Verification failed"}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-200">
          {status === "loading" && "Please wait while we secure your dashboard session."}
          {status === "success" && "Redirecting to your dashboard."}
          {status === "error" && "This link may be invalid or expired."}
        </p>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  );
}
