import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

function extractLevel(text: string): CefrLevel | null {
	const trimmed = text.trim().toUpperCase();
	const match = trimmed.match(/\b(A1|A2|B1|B2|C1|C2)\b/);
	return (match?.[1] as CefrLevel) ?? null;
}

function parseCustomId(customId: string): { word: string; freq: number } | null {
	// format: w=<urlEncodedWord>|f=<freq>
	try {
		const parts = customId.split("|");
		const wordPart = parts.find(p => p.startsWith("w="));
		const freqPart = parts.find(p => p.startsWith("f="));
		if (!wordPart || !freqPart) return null;
		const word = decodeURIComponent(wordPart.slice(2));
		const freq = Number(freqPart.slice(2));
		if (!word || !Number.isFinite(freq)) return null;
		return { word, freq };
	} catch {
		return null;
	}
}

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const batchId = searchParams.get("batchId");
		if (!batchId) {
			return NextResponse.json({ error: "Missing batchId" }, { status: 400 });
		}

		const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
		if (!apiKey) {
			return NextResponse.json({ error: "OpenAI API key not configured. Set OPENAI_API_KEY (preferred) or VITE_OPENAI_API_KEY." }, { status: 500 });
		}

		const openai = new OpenAI({ apiKey });
		const batch = await openai.batches.retrieve(batchId);

		// If not completed, return status only
		if (batch.status !== "completed") {
			return NextResponse.json({ status: batch.status, requestCounts: batch.request_counts });
		}

		if (!batch.output_file_id) {
			return NextResponse.json({ status: batch.status, error: "No output file" }, { status: 500 });
		}

		const fileResponse = await openai.files.content(batch.output_file_id);
		const fileText = await fileResponse.text();

		// Aggregate counts by CEFR level, weighted by original word frequency
		const counts: Record<CefrLevel, number> = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
		const wordsByLevel: Record<CefrLevel, { word: string; freq: number }[]> = { A1: [], A2: [], B1: [], B2: [], C1: [], C2: [] };
		let totalWeighted = 0;

		const lines = fileText.split(/\n+/g).filter(Boolean);
		for (const line of lines) {
			let parsed: any;
			try { parsed = JSON.parse(line); } catch { continue; }
			const customId: string | undefined = parsed?.custom_id;
			const bodyContent: string | undefined = parsed?.response?.body?.output?.[0]?.content?.[0]?.text
				?? parsed?.response?.body?.choices?.[0]?.message?.content
				?? parsed?.response?.body?.content
				?? "";

			const idInfo = customId ? parseCustomId(customId) : null;
			if (!idInfo) continue;

			const level = extractLevel(String(bodyContent || ""));
			if (!level) continue;

			counts[level] += idInfo.freq;
			wordsByLevel[level].push({ word: idInfo.word, freq: idInfo.freq });
			totalWeighted += idInfo.freq;
		}

		const uniqueCounts: Record<CefrLevel, number> = {
			A1: wordsByLevel.A1.length,
			A2: wordsByLevel.A2.length,
			B1: wordsByLevel.B1.length,
			B2: wordsByLevel.B2.length,
			C1: wordsByLevel.C1.length,
			C2: wordsByLevel.C2.length,
		};

		return NextResponse.json({ status: batch.status, counts, total: totalWeighted, uniqueCounts, wordsByLevel });
	} catch (err) {
		console.error("[CEFR_BATCH_STATUS]", err);
		return NextResponse.json({ error: "Failed to retrieve batch status" }, { status: 500 });
	}
}


