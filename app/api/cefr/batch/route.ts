import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";
import OpenAI from "openai";

export const runtime = "nodejs";

const FINETUNED_MODEL_ID = "ft:gpt-4.1-nano-2025-04-14:native-pt:full-dataset:CFH7oyMj";

function normalizeWord(raw: string): string {
	// Lowercase and strip leading/trailing punctuation
	return raw
		.toLowerCase()
		.replace(/^[^a-z]+/g, "")
		.replace(/[^a-z]+$/g, "");
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json().catch(() => ({}));
		const text: unknown = body?.text;
		if (!text || typeof text !== "string") {
			return NextResponse.json({ error: "Missing 'text' in request body" }, { status: 400 });
		}

		const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
		if (!apiKey) {
			return NextResponse.json({ error: "OpenAI API key not configured. Set OPENAI_API_KEY (preferred) or VITE_OPENAI_API_KEY." }, { status: 500 });
		}

		// Tokenize and build frequency map of normalized words
		const tokens = text.split(/\s+/g);
		const frequencyMap = new Map<string, number>();
		for (const token of tokens) {
			const word = normalizeWord(token);
			if (!word) continue;
			if (!/^[a-z]+$/.test(word)) continue;
			frequencyMap.set(word, (frequencyMap.get(word) ?? 0) + 1);
		}

		if (frequencyMap.size === 0) {
			return NextResponse.json({ error: "No valid words found in input" }, { status: 400 });
		}

		// Limit to top N most frequent unique words to control cost
		const MAX_UNIQUE_WORDS = 5000;
		const uniqueEntries = Array.from(frequencyMap.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, MAX_UNIQUE_WORDS);

		// Build JSONL content for Batch API using /v1/responses endpoint
		const jsonlLines: string[] = [];
		for (const [word, freq] of uniqueEntries) {
			const customId = `w=${encodeURIComponent(word)}|f=${freq}`;
			const line = JSON.stringify({
				custom_id: customId,
				method: "POST",
				url: "/v1/responses",
				body: {
					model: FINETUNED_MODEL_ID,
					input: `What is the CEFR level of the following word? "${word}"\nRespond with exactly one of: A1, A2, B1, B2, C1, C2.`,
					max_output_tokens: 5,
					temperature: 0
				}
			});
			jsonlLines.push(line);
		}

		const tmpPath = path.join(os.tmpdir(), `cefr-batch-${Date.now()}.jsonl`);
		await fs.promises.writeFile(tmpPath, jsonlLines.join("\n"), "utf8");

		const openai = new OpenAI({ apiKey });

		const uploaded = await openai.files.create({
			file: fs.createReadStream(tmpPath) as any,
			purpose: "batch"
		});

		const batch = await openai.batches.create({
			input_file_id: uploaded.id,
			endpoint: "/v1/responses",
			completion_window: "24h",
			metadata: { feature: "cefr-word-classification" }
		});

		// Cleanup temp file (best-effort)
		fs.promises.unlink(tmpPath).catch(() => {});

		return NextResponse.json({
			batchId: batch.id,
			uniqueWords: uniqueEntries.length,
			totalWords: tokens.length
		});
	} catch (err) {
		console.error("[CEFR_BATCH_CREATE]", err);
		return NextResponse.json({ error: "Failed to create batch" }, { status: 500 });
	}
}


