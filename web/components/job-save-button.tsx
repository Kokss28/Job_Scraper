"use client";

import { useState } from "react";
import { Bookmark, Check } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export function JobSaveButton({ userId, jobId, initiallySaved = false }: { userId: string; jobId: string; initiallySaved?: boolean }) {
  const [saved, setSaved] = useState(initiallySaved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setBusy(true);
    setError("");
    const supabase = createClient();
    const result = saved
      ? await supabase.from("saved_jobs").delete().eq("user_id", userId).eq("job_id", jobId)
      : await supabase.from("saved_jobs").upsert({ user_id: userId, job_id: jobId, status: "saved" }, { onConflict: "user_id,job_id" });
    if (result.error) setError("Could not update saved jobs.");
    else setSaved(!saved);
    setBusy(false);
  }

  return <div className="save-action"><button className={`save-button ${saved ? "saved" : ""}`} onClick={toggle} disabled={busy} aria-label={saved ? "Remove saved job" : "Save job"} title={saved ? "Saved" : "Save job"}>{saved ? <Check size={17} /> : <Bookmark size={17} />}</button>{error && <span className="save-error">{error}</span>}</div>;
}
