"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function QueueScrapeForm({ userId }: { userId: string }) {
  const [source, setSource] = useState("all");
  const [hours, setHours] = useState(24);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function queue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const { error } = await createClient().from("scrape_runs").insert({ requested_by: userId, source, max_age_hours: hours });
    setMessage(error ? `Could not queue run: ${error.message}` : "Scrape queued. Keep the Python worker running to process it.");
    setBusy(false);
    if (!error) window.location.reload();
  }

  return <><form className="scrape-form" onSubmit={queue}><label>Source<select value={source} onChange={(event)=>setSource(event.target.value)}><option value="all">All sources</option><option value="linkedin">LinkedIn</option><option value="naukri">Naukri</option><option value="indeed">Indeed</option></select></label><label>Posted within (hours)<input type="number" min={1} max={720} value={hours} onChange={(event)=>setHours(Number(event.target.value))}/></label><button className="button button-primary" disabled={busy}>{busy ? "Queueing..." : "Queue scrape"}</button>{message && <span className="scrape-message">{message}</span>}</form><small className="scrape-message">The age filter applies to LinkedIn and Indeed. Naukri currently uses its configured titles and page limit.</small></>;
}
