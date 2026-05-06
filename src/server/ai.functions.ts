import { createServerFn } from "@tanstack/react-start";

export const rewriteObservation = createServerFn({ method: "POST" })
  .inputValidator((d: { text: string }) => d)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI not configured");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an internal auditor at DKC. Rewrite the user's observation point in a soft, constructive, professional internal-auditor tone suitable for a quarterly report. Be factual, non-accusatory, concise (1-3 sentences). Return only the rewritten point, no preamble." },
          { role: "user", content: data.text },
        ],
      }),
    });
    if (res.status === 429) throw new Error("Rate limit — try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace Usage.");
    if (!res.ok) throw new Error("AI request failed");
    const j = await res.json();
    return { text: (j.choices?.[0]?.message?.content ?? "").trim() };
  });
