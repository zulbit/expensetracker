import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  imageBase64: z.string().min(20),
  mimeType: z.string().default("image/jpeg"),
});

export type ReceiptScanResult = {
  amount: number | null;
  spent_at: string | null; // YYYY-MM-DD
  note: string | null;
  merchant: string | null;
};

export const scanReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<ReceiptScanResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured");

    const dataUrl = `data:${data.mimeType};base64,${data.imageBase64}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You extract structured data from receipt photos. Reply with ONLY compact JSON, no prose, no markdown.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  'Extract from this receipt and return JSON with keys: amount (number, the final total paid, no currency symbol), date (YYYY-MM-DD if legible else null), merchant (short store name or null), note (short description of what was bought, <=80 chars, or null). If unreadable use nulls. Example: {"amount":1250.5,"date":"2026-07-08","merchant":"Cafe X","note":"Coffee and pastry"}',
              },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        temperature: 0,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("RATE_LIMIT: Too many scans right now. Please wait a moment and try again.");
      if (res.status === 402) throw new Error("AI_CREDITS: AI credits are exhausted. Add credits to keep scanning receipts.");
      throw new Error(`Scan failed: ${res.status} ${text.slice(0, 200)}`);
    }

    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { amount: null, spent_at: null, note: null, merchant: null };
    }
    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return { amount: null, spent_at: null, note: null, merchant: null };
    }

    const amount =
      typeof parsed.amount === "number" && isFinite(parsed.amount) ? parsed.amount : null;
    const spent_at =
      typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
        ? parsed.date
        : null;
    const merchant = typeof parsed.merchant === "string" ? parsed.merchant.slice(0, 80) : null;
    const noteRaw = typeof parsed.note === "string" ? parsed.note.slice(0, 200) : null;
    const note =
      noteRaw && merchant
        ? `${merchant} — ${noteRaw}`.slice(0, 200)
        : noteRaw ?? merchant ?? null;

    return { amount, spent_at, note, merchant };
  });
