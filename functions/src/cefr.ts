import * as admin from "firebase-admin";
import { onRequest, HttpsOptions } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import cors from "cors";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();
const httpsOpts: HttpsOptions = { region: "asia-northeast3", timeoutSeconds: 120, memory: "256MiB" };

type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
const DEFAULT_CEFR_MODEL = "ft:gpt-4.1-nano-2025-04-14:native-pt:full-dataset:CFH7oyMj";
const NEXT_OPENAI_API_KEY = defineSecret("NEXT_OPENAI_API_KEY");

function normalizeWord(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^[^a-z]+/g, "")
    .replace(/[^a-z]+$/g, "");
}

function stripPuncPreserveCase(raw: string): string {
  return raw.replace(/^[^A-Za-z]+/g, "").replace(/[^A-Za-z]+$/g, "");
}

const corsHandler = cors({
  origin: [
    "http://localhost:3000",
    "https://1cupenglish.com",
    "https://one-cup-eng.web.app",
    "https://one-cup-eng.firebaseapp.com"
  ],
  credentials: true
});

export const startCefrBatch = onRequest({
  ...httpsOpts,
  maxInstances: 10,
  memory: "1GiB",
  secrets: [NEXT_OPENAI_API_KEY]
}, async (req, res) => {
  return new Promise((resolve, reject) => {
    corsHandler(req, res, async () => {
      try {
        if (req.method !== "POST") {
          res.status(405).json({ error: "Method not allowed" });
          resolve(undefined);
          return;
        }
        
        // Accept either full text or a compact list of words
        const body: any = req.body || {};
        const inputPath: string | undefined = typeof body.inputPath === "string" ? body.inputPath : undefined;
        let wordsPayload = Array.isArray(body?.words) ? (body.words as Array<{ word: string; freq?: number; hasCapital?: boolean }>) : null;
        const text = typeof body?.text === "string" ? String(body.text) : "";

        if (!wordsPayload && !inputPath && !text.trim()) {
          res.status(400).json({ error: "Missing text, words or inputPath" });
          resolve(undefined);
          return;
        }

        if (inputPath) {
          try {
            let bucket = admin.storage().bucket();
            let objectPath = inputPath;
            if (inputPath.startsWith("gs://")) {
              const withoutScheme = inputPath.slice(5);
              const slashIdx = withoutScheme.indexOf("/");
              const bkt = slashIdx === -1 ? withoutScheme : withoutScheme.slice(0, slashIdx);
              const obj = slashIdx === -1 ? "" : withoutScheme.slice(slashIdx + 1);
              bucket = admin.storage().bucket(bkt);
              objectPath = obj;
            }
            const [buf] = await bucket.file(objectPath).download();
            const parsed = JSON.parse(buf.toString());
            if (Array.isArray(parsed)) wordsPayload = parsed;
            else if (Array.isArray(parsed?.words)) wordsPayload = parsed.words;
            else wordsPayload = [];
          } catch (e) {
            console.error("[startCefrBatch] Failed to read words from storage:", inputPath, e);
            res.status(400).json({ error: "Invalid inputPath or unreadable file" });
            resolve(undefined);
            return;
          }
        }

        if (!wordsPayload) {
          // Check text size and word count limits
          const textSizeBytes = Buffer.byteLength(text, 'utf8');
          const wordCount = text.trim().split(/\s+/).length;
          console.log(`Function received text size: ${Math.round(textSizeBytes/1024)}KB, Word count: ${wordCount}`);
          
          if (textSizeBytes > 500 * 1024) {
            res.status(413).json({ error: `Text too large (${Math.round(textSizeBytes/1024)}KB). Maximum size is 500KB.` });
            resolve(undefined);
            return;
          }
          
          if (wordCount > 10000) {
            res.status(413).json({ error: `Text has too many words (${wordCount}). Maximum is 10,000 words.` });
            resolve(undefined);
            return;
          }
        } else {
          // Validate words payload size
          if (wordsPayload.length > 20000) {
            res.status(413).json({ error: `Too many tokens (${wordsPayload.length}). Maximum is 20,000 tokens.` });
            resolve(undefined);
            return;
          }
        }

        const apiKey = NEXT_OPENAI_API_KEY.value();
        console.log(
          `[startCefrBatch] OpenAI key available: ${!!apiKey}, suffix: ${apiKey ? apiKey.slice(-4) : "n/a"}`
        );
        if (!apiKey) {
          res.status(500).json({ error: "Missing OpenAI key. Set NEXT_OPENAI_API_KEY." });
          resolve(undefined);
          return;
        }

    const freqMap = new Map<string, { freq: number; hasCapital: boolean }>();
    if (wordsPayload) {
      for (const item of wordsPayload) {
        if (!item || typeof item.word !== "string") continue;
        const core = item.word;
        const w = normalizeWord(core);
        if (!w) continue;
        if (!/^[a-z]+$/.test(w)) continue;
        const hasCap = typeof item.hasCapital === "boolean" ? item.hasCapital : /[A-Z]/.test(core);
        const addFreq = Number.isFinite(item.freq as any) ? Number(item.freq) : 1;
        const prev = freqMap.get(w);
        if (prev) freqMap.set(w, { freq: prev.freq + addFreq, hasCapital: prev.hasCapital || hasCap });
        else freqMap.set(w, { freq: addFreq, hasCapital: hasCap });
      }
    } else {
      const tokens = text.split(/\s+/g);
      for (const t of tokens) {
        const core = stripPuncPreserveCase(t);
        const w = normalizeWord(core);
        if (!w) continue;
        if (!/^[a-z]+$/.test(w)) continue;
        const hasCap = /[A-Z]/.test(core);
        const prev = freqMap.get(w);
        if (prev) freqMap.set(w, { freq: prev.freq + 1, hasCapital: prev.hasCapital || hasCap });
        else freqMap.set(w, { freq: 1, hasCapital: hasCap });
      }
    }

    if (freqMap.size === 0) {
      res.status(400).json({ error: "No valid words" });
      return;
    }

    const entries = Array.from(freqMap.entries()).sort((a,b)=>b[1].freq-a[1].freq).slice(0, 5000);
    const candidateIds = entries.map(([w]) => w);
    const existingDocs = new Map<string, { level: CefrLevel; source?: string }>();

    // Existing check (chunks of 10 - Firestore IN limit)
    const existing = new Set<string>();
    const chunkSize = 10;
    for (let i=0;i<candidateIds.length;i+=chunkSize){
      const chunk = candidateIds.slice(i,i+chunkSize);
      if (!chunk.length) continue;
      const snap = await db.collection("cefr").where(admin.firestore.FieldPath.documentId(), "in", chunk).get();
      snap.docs.forEach(docSnap => {
        const data = docSnap.data() || {};
        const lvl = String(data.level || "").toUpperCase();
        if (["A1","A2","B1","B2","C1","C2"].includes(lvl)){
          existing.add(docSnap.id);
          existingDocs.set(docSnap.id, { level: lvl as CefrLevel, source: data.source });
        }
      });
    }

    const acronyms: Array<{ word: string; level: CefrLevel; freq: number; source: string }> = [];
    const toClassify: Array<{ word: string; freq: number }> = [];
    for (const [w, info] of entries) {
      if (existing.has(w)) continue;
      if (info.hasCapital) acronyms.push({ word: w, level: "A1", freq: info.freq, source: "acronym" });
      else toClassify.push({ word: w, freq: info.freq });
    }

    // Write acronyms now
    if (acronyms.length){
      const writer = (db as any).bulkWriter ? (db as any).bulkWriter() : null;
      if (writer){
        for (const a of acronyms){
          writer.set(
            db.collection("cefr").doc(a.word),
            {
              word: a.word,
              level: a.level,
              source: a.source,
              firstSeenAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              freq: admin.firestore.FieldValue.increment(a.freq)
            },
            { merge: true }
          );
        }
        await writer.close();
      } else {
        for (let i=0;i<acronyms.length;i+=450){
          const chunk = acronyms.slice(i,i+450);
          const batch = db.batch();
          for (const a of chunk){
            batch.set(
              db.collection("cefr").doc(a.word),
              {
                word: a.word,
                level: a.level,
                source: a.source,
                firstSeenAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                freq: admin.firestore.FieldValue.increment(a.freq)
              },
              { merge: true }
            );
          }
          await batch.commit();
        }
      }
    }

    // Build existing labeled list with levels and source
    const existingLabeled: Array<{ word: string; level: CefrLevel; freq: number; source?: string }> = [];
    for (const [word, info] of entries){
      const cached = existingDocs.get(word);
      if (!cached) continue;
      existingLabeled.push({
        word,
        level: cached.level,
        freq: info.freq,
        source: cached.source,
      });
    }

    // Update cached words with new frequency/timestamp
    if (existingLabeled.length){
      const writer = (db as any).bulkWriter ? (db as any).bulkWriter() : null;
      if (writer){
        for (const item of existingLabeled){
          writer.set(
            db.collection("cefr").doc(item.word),
            {
              word: item.word,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              freq: admin.firestore.FieldValue.increment(item.freq),
            },
            { merge: true }
          );
        }
        await writer.close();
      } else {
        for (let i=0;i<existingLabeled.length;i+=450){
          const chunk = existingLabeled.slice(i,i+450);
          const batch = db.batch();
          for (const item of chunk){
            batch.set(
              db.collection("cefr").doc(item.word),
              {
                word: item.word,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                freq: admin.firestore.FieldValue.increment(item.freq),
              },
              { merge: true }
            );
          }
          await batch.commit();
        }
      }
    }

    if (toClassify.length === 0){
      // Immediate-complete run: persist a completed run doc for UI
      const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      const wordsByLevel: Record<CefrLevel, { word: string; freq: number; source?: string }[]> = { A1: [], A2: [], B1: [], B2: [], C1: [], C2: [] };
      const counts: Record<CefrLevel, number> = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
      let total = 0;
      const add = (arr: any[], src: string) => {
        for (const it of arr || []){
          const lvl = (it.level || "").toUpperCase();
          if (!(lvl in counts)) continue;
          counts[lvl as CefrLevel] += it.freq || 0;
          total += it.freq || 0;
          wordsByLevel[lvl as CefrLevel].push({ word: it.word, freq: it.freq || 0, source: it.source || src });
        }
      };
      add(existingLabeled, "db");
      add(acronyms, "acronym");
      const uniqueCounts: Record<CefrLevel, number> = { A1: wordsByLevel.A1.length, A2: wordsByLevel.A2.length, B1: wordsByLevel.B1.length, B2: wordsByLevel.B2.length, C1: wordsByLevel.C1.length, C2: wordsByLevel.C2.length };
        await db.collection("cefr_runs").doc(runId).set({ status: "completed", counts, total, uniqueCounts, wordsByLevel, existing: existingLabeled, acronyms }, { merge: true });
        res.json({ batchId: null, runId, addedAcronyms: acronyms.length, alreadyKnown: existing.size });
        resolve(undefined);
        return;
    }

        // Build Batch JSONL with size guard to avoid OpenAI 413
        const openai = new OpenAI({ apiKey });
        const model = (process.env.CEFR_MODEL_ID && process.env.CEFR_MODEL_ID.trim()) || DEFAULT_CEFR_MODEL;
        console.log(`[startCefrBatch] Using CEFR model: ${model}`);
        const makeLine = (word: string, freq: number) => JSON.stringify({
          custom_id: `w=${encodeURIComponent(word)}|f=${freq}`,
          method: "POST",
          url: "/v1/responses",
          body: {
            model,
            // Keep prompt extremely short to minimize JSONL size
            input: `CEFR for "${word}"? Answer one of: A1,A2,B1,B2,C1,C2. Return label only.`,
            max_output_tokens: 1,
            temperature: 0
          }
        });

        // Draft all lines, then trim to stay below a safe byte budget
        let lines = toClassify.map(({ word, freq }) => makeLine(word, freq));
        let jsonl = lines.join("\n");
        const MAX_BYTES = Number(process.env.CEFR_BATCH_MAX_BYTES || 512 * 1024); // 512 KiB default safety cap
        let sizeBytes = Buffer.byteLength(jsonl, "utf8");
        if (sizeBytes > MAX_BYTES && lines.length > 0) {
          const avgPerLine = Math.max(64, Math.floor(sizeBytes / lines.length));
          const allowed = Math.max(1, Math.floor(MAX_BYTES / avgPerLine));
          lines = lines.slice(0, allowed);
          jsonl = lines.join("\n");
          sizeBytes = Buffer.byteLength(jsonl, "utf8");
          console.log(`[startCefrBatch] Trimming batch lines to ${allowed} to fit ${sizeBytes} bytes`);
        }

        const file = await openai.files.create({ file: await toFile(Buffer.from(jsonl, "utf8"), "cefr.jsonl"), purpose: "batch" });
        const batch = await openai.batches.create({ input_file_id: file.id, endpoint: "/v1/responses", completion_window: "24h", metadata: { feature: "cefr-word-classification" }});

        await db.collection("cefr_runs").doc(batch.id).set({
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "in_progress",
          existing: existingLabeled,
          acronyms: acronyms.map(a=>({ word: a.word, level: a.level, freq: a.freq, source: a.source })),
          pending: toClassify
        }, { merge: true });

        // queued reflects the actual number uploaded in this batch
        res.json({ batchId: batch.id, queued: lines.length, addedAcronyms: acronyms.length });
        resolve(undefined);
      } catch (err:any) {
        console.error("[startCefrBatch]", err);
        res.status(500).json({ error: err?.message || "Internal error" });
        resolve(undefined);
      }
    });
  });
});

function extractLevel(text: string): CefrLevel | null {
  const m = String(text||"").toUpperCase().match(/\b(A1|A2|B1|B2|C1|C2)\b/);
  return (m?.[1] as CefrLevel) || null;
}

export const pollCefrBatches = onSchedule({ schedule: "every 2 minutes", region: "asia-northeast3", secrets: [NEXT_OPENAI_API_KEY] }, async () => {
  const apiKey = NEXT_OPENAI_API_KEY.value();
  console.log(
    `[pollCefrBatches] OpenAI key available: ${!!apiKey}, suffix: ${apiKey ? apiKey.slice(-4) : "n/a"}`
  );
  if (!apiKey) return;
  const openai = new OpenAI({ apiKey });

  const snap = await db.collection("cefr_runs").where("status", "in", ["in_progress","queued"]).limit(10).get();
  for (const doc of snap.docs){
    const id = doc.id;
    try {
      const batch = await openai.batches.retrieve(id);
      if (batch.status !== "completed") continue;
      let words: Array<{ word: string; level: CefrLevel; freq: number; source: string }> = [];
      if (batch.output_file_id){
        const content = await openai.files.content(batch.output_file_id);
        const text = await content.text();
        const lines = text.split(/\n+/g).filter(Boolean);
        for (const line of lines){
          let parsed:any; try{ parsed = JSON.parse(line);}catch{continue;}
          const body = parsed?.response?.body?.output?.[0]?.content?.[0]?.text || parsed?.response?.body?.choices?.[0]?.message?.content || parsed?.response?.body?.content || "";
          const cid: string = parsed?.custom_id || "";
          const m = cid.split("|");
          const w = decodeURIComponent((m.find(p=>p.startsWith("w="))||"").slice(2));
          const f = Number((m.find(p=>p.startsWith("f="))||"").slice(2));
          if (!w || !Number.isFinite(f)) continue;
          const lvl = extractLevel(String(body));
          if (!lvl) continue;
          words.push({ word: w, level: lvl, freq: f, source: "batch" });
        }
      }

      // persist results
      if (words.length){
        const writer = (db as any).bulkWriter ? (db as any).bulkWriter() : null;
        if (writer){
          for (const { word, level, freq } of words){
            writer.set(
              db.collection("cefr").doc(word),
              {
                word,
                level,
                source: "inference",
                firstSeenAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                freq: admin.firestore.FieldValue.increment(freq)
              },
              { merge: true }
            );
          }
          await writer.close();
        } else {
          for (let i=0;i<words.length;i+=450){
            const chunk = words.slice(i,i+450);
            const batchW = db.batch();
            for (const { word, level, freq } of chunk){
              batchW.set(
                db.collection("cefr").doc(word),
                {
                  word,
                  level,
                  source: "inference",
                  firstSeenAt: admin.firestore.FieldValue.serverTimestamp(),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  freq: admin.firestore.FieldValue.increment(freq)
                },
                { merge: true }
              );
            }
            await batchW.commit();
          }
        }
      }

      // merge with run context for UI
      const run = (await db.collection("cefr_runs").doc(id).get()).data() || {};
      const wordsByLevel: Record<CefrLevel, { word: string; freq: number; source?: string }[]> = { A1: [], A2: [], B1: [], B2: [], C1: [], C2: [] };
      const counts: Record<CefrLevel, number> = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
      let total = 0;
      const add = (arr:any[], src:string)=>{ for (const it of arr||[]){ const lvl = (it.level||"").toUpperCase(); if (!(lvl in counts)) continue; counts[lvl as CefrLevel]+=it.freq||0; total+=it.freq||0; wordsByLevel[lvl as CefrLevel].push({ word: it.word, freq: it.freq||0, source: it.source || src }); } };
      add(run.existing, "db");
      add(run.acronyms, "acronym");
      add(words, "batch");
      const uniqueCounts: Record<CefrLevel, number> = { A1: wordsByLevel.A1.length, A2: wordsByLevel.A2.length, B1: wordsByLevel.B1.length, B2: wordsByLevel.B2.length, C1: wordsByLevel.C1.length, C2: wordsByLevel.C2.length };

      await db.collection("cefr_runs").doc(id).set({ status: "completed", counts, total, uniqueCounts, wordsByLevel }, { merge: true });
    } catch (e){
      console.error("[pollCefrBatches]", id, e);
    }
  }
});


