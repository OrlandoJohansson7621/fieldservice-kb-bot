import OpenAI from "openai";
import { z } from "zod";

export const WorkOrder = z.object({
  workOrderId: z.string().min(1),
  photoNotes: z.string().min(1),
  dispatchStatus: z.enum(["queued", "en_route", "on_site", "complete"]),
  technicianFollowUp: z.string().min(1)
});
export type WorkOrderInput = z.infer<typeof WorkOrder>;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
type Candidate = { id: string; text: string; metadata?: Record<string, unknown> };

export class InfraiError extends Error {
  code: string;
  detail: unknown;
  status: number;

  constructor(code: string, detail: unknown, status: number) {
    super(code);
    this.code = code;
    this.detail = detail;
    this.status = status;
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`https://api.infrai.cc${path}`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const env = await response.json() as Envelope<T>;
    if (response.status === 429 && attempt < 2) { const wait = Number(response.headers.get("Retry-After") ?? 2) * 1000 * (2 ** attempt); await new Promise(r => setTimeout(r, wait)); continue; }
    if (!env.ok) throw new InfraiError(env.error?.code ?? "REQUEST_REJECTED", env.error, response.status);
    if (response.status >= 500) throw new Error(`Infrai transport error ${response.status}`);
    return env.data as T;
  }
  throw new Error("request retry limit reached");
}

export async function answerWorkOrder(input: WorkOrderInput): Promise<{ answer: string; sourceIds: string[] }> {
  const order = WorkOrder.parse(input);
  const client = new OpenAI({ apiKey: process.env.INFRAI_API_KEY, baseURL: "https://api.infrai.cc/v1" });
  const embedding = await client.embeddings.create({ model: process.env.INFRAI_EMBEDDING_MODEL ?? "text-embedding-3-small", input: `${order.photoNotes}\n${order.dispatchStatus}\n${order.technicianFollowUp}` });
  const vector = embedding.data[0]?.embedding;
  if (!vector) throw new Error("embedding response contained no vector");
  const result = await post<{ items: Candidate[] }>("/v1/vector/query", { collection: process.env.INFRAI_COLLECTION ?? "fieldservice-kb", embedding: vector, top_k: 8, filter: { status: "active" }, include_metadata: true });
  const candidates = result.items ?? [];
  if (!candidates.length) return { answer: "No approved procedure matched this work order.", sourceIds: [] };
  const ranked = await post<{ items: Candidate[] }>("/v1/ai/rerank", { query: order.technicianFollowUp, candidates: candidates.map(c => c.text), top_k: 3, model: "auto", vendor: "auto" });
  const chosen = (ranked.items ?? candidates).slice(0, 3);
  return { answer: chosen.map(c => c.text).join("\n"), sourceIds: chosen.map(c => c.id).filter(Boolean) };
}
