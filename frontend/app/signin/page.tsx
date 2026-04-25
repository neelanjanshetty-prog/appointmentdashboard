"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Stethoscope } from "lucide-react";
import { Button } from "@/components/Button";
import { FormInput } from "@/components/FormInput";
import { useToast } from "@/components/ToastProvider";
import { api } from "@/lib/api";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      await api.post("/api/auth/send-link", { email });
      showToast("Magic login link sent. Check your email.", "success");
    } catch {
      showToast("Could not send the login link.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel w-full max-w-md rounded-2xl p-8"
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
          <Stethoscope className="h-6 w-6" />
        </div>
        <div className="mt-6 text-center">
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Sign in to Params Dental</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Use your clinic email to receive a secure magic link.</p>
        </div>

        <form className="mt-8 grid gap-4" onSubmit={submit}>
          <FormInput
            label="Email address"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="doctor@clinic.com"
            required
          />
          <Button type="submit" loading={loading}>
            <Mail className="h-4 w-4" />
            Send magic link
          </Button>
        </form>
      </motion.div>
    </main>
  );
}
