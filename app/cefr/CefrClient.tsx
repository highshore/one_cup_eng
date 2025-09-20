"use client";
import React from "react";
import { ref, uploadString } from "firebase/storage";
import { doc, onSnapshot } from "firebase/firestore";
import { storage, db } from "../lib/firebase/firebase";
import styled from "styled-components";

type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

const Container = styled.div`
	max-width: 960px;
	margin: 0 auto;
	padding: 24px 16px;
	color: #111;
`;

const Title = styled.h1`
	font-size: 28px;
	font-weight: 800;
	margin: 0 0 16px 0;
`;

const TextArea = styled.textarea`
	width: 100%;
	min-height: 160px;
	padding: 14px;
	border-radius: 12px;
	border: 1px solid rgba(0,0,0,0.12);
	background: #fff;
	color: #111;
	resize: vertical;
	outline: none;
	font-size: 14px;
	line-height: 1.5;
	box-shadow: inset 0 1px 3px rgba(0,0,0,0.06);
`;

const Actions = styled.div`
	display: flex;
	gap: 12px;
	margin-top: 12px;
`;

const PrimaryButton = styled.button<{ disabled?: boolean }>`
	position: relative;
	padding: 12px 18px;
	border-radius: 14px;
	border: 1px solid rgba(0,0,0,0.15);
	cursor: pointer;
	background: linear-gradient(135deg, #f9fafb, #e5e7eb);
	color: #111;
	font-weight: 700;
	box-shadow: 0 6px 14px rgba(0,0,0,0.08), inset 0 -2px 6px rgba(255,255,255,0.7);
	opacity: ${p => (p.disabled ? 0.6 : 1)};
	transition: transform 0.08s ease, box-shadow 0.2s ease, background 0.2s ease;
	&:active { transform: translateY(1px); box-shadow: 0 3px 10px rgba(0,0,0,0.06); }
`;

const SecondaryText = styled.div`
	color: rgba(0,0,0,0.6);
	font-size: 13px;
	margin-top: 8px;
`;

const Spinner = styled.div`
	width: 18px;
	height: 18px;
	border-radius: 50%;
	border: 2px solid rgba(0,0,0,0.2);
	border-top-color: rgba(0,0,0,0.8);
	animation: spin 0.8s linear infinite;
	@keyframes spin { to { transform: rotate(360deg); } }
`;

const ChartWrapper = styled.div`
	margin-top: 24px;
	padding: 16px;
	border-radius: 16px;
	background: linear-gradient(180deg, #ffffff, #f8fafc);
	border: 1px solid rgba(0,0,0,0.08);
	box-shadow: 0 8px 26px rgba(0,0,0,0.06);
`;

const ChartGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(6, 1fr);
	gap: 14px;
	align-items: end;
	height: 260px;
`;

const BarColumn = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
`;

const BarSvg = styled.svg`
	width: 100%;
	height: 200px;
`;

const BarLabel = styled.div`
	font-weight: 800;
	color: #111;
`;

const LevelLabel = styled.div`
	font-weight: 700;
	color: rgba(0,0,0,0.9);
`;

const levels: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
const levelColors: Record<CefrLevel, string> = {
	A1: "#0f766e",
	A2: "#14532d",
	B1: "#854d0e",
	B2: "#7c2d12",
	C1: "#1f2937",
	C2: "#111827",
};

export default function CefrClient() {
	const [text, setText] = React.useState("");
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const [batchId, setBatchId] = React.useState<string | null>(null);
	const [status, setStatus] = React.useState<string | null>(null);
	const [error, setError] = React.useState<string | null>(null);
	const [counts, setCounts] = React.useState<Record<CefrLevel, number>>({ A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 });
	const [total, setTotal] = React.useState(0);
	const [uniqueCounts, setUniqueCounts] = React.useState<Record<CefrLevel, number>>({ A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 });
	const [wordsByLevel, setWordsByLevel] = React.useState<Record<CefrLevel, { word: string; freq: number }[]>>({ A1: [], A2: [], B1: [], B2: [], C1: [], C2: [] });
	const [labeledWords, setLabeledWords] = React.useState<Array<{ word: string; level: CefrLevel; source?: string; freq?: number }>>([]);

	const handleSubmit = async () => {
		if (!text.trim()) return;
		
		// Build compact words payload (deduplicated with freq and capitalization)
		const stripPuncPreserveCase = (raw: string) => raw.replace(/^[^A-Za-z]+/g, "").replace(/[^A-Za-z]+$/g, "");
		const normalizeWord = (raw: string) => raw.toLowerCase().replace(/^[^a-z]+/g, "").replace(/[^a-z]+$/g, "");
		const freqMap = new Map<string, { freq: number; hasCapital: boolean }>();
		for (const token of text.split(/\s+/g)) {
			const core = stripPuncPreserveCase(token);
			const w = normalizeWord(core);
			if (!w) continue;
			if (!/^[a-z]+$/.test(w)) continue;
			const hasCap = /[A-Z]/.test(core);
			const prev = freqMap.get(w);
			if (prev) freqMap.set(w, { freq: prev.freq + 1, hasCapital: prev.hasCapital || hasCap });
			else freqMap.set(w, { freq: 1, hasCapital: hasCap });
		}
		if (freqMap.size === 0) {
			setError("No valid words found in text.");
			return;
		}
		let entries = Array.from(freqMap.entries()).map(([word, v]) => ({ word, freq: v.freq, hasCapital: v.hasCapital }));
		entries.sort((a, b) => b.freq - a.freq);
		entries = entries.slice(0, 5000);
		
		// Ensure payload stays comfortably below 500KB by trimming if necessary
		const payload = { words: entries } as { words: Array<{ word: string; freq: number; hasCapital: boolean }> };
		// Always upload to Storage and send an inputPath pointer to avoid request size issues
		let requestBody: any;
		try {
			const objectPath = `cefr_inputs/${Date.now()}_${Math.random().toString(36).slice(2,8)}.json`;
			const fileRef = ref(storage, objectPath);
			await uploadString(fileRef, JSON.stringify(payload), "raw", { contentType: "application/json" });
			requestBody = { inputPath: objectPath };
		} catch (e) {
			console.error("Failed to upload payload to Storage", e);
			setError("Failed to upload input. Please sign in and try again.");
			return;
		}
		
		setIsSubmitting(true);
		setCounts({ A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 });
		setStatus(null);
		setTotal(0);
		setError(null);
		try {
			const resp = await fetch("https://startcefrbatch-cds6z3hrga-du.a.run.app", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(requestBody)
			});
			if (!resp.ok) {
				let message = "Failed to create batch";
				if (resp.status === 413) {
					message = "Text is too large. Please reduce the text size and try again.";
				} else if (resp.status === 500) {
					message = "Server error. Please try again later.";
				}
				try { 
					const j = await resp.json(); 
					if (j?.error) message = String(j.error); 
				} catch {}
				setError(message);
				return;
			}
			const data = await resp.json();
			setBatchId(data.batchId || data.runId || null);
			setStatus("in_progress");
		} catch (e) {
			console.error(e);
			setError("Unexpected error while creating batch");
		} finally {
			setIsSubmitting(false);
		}
	};

	// Subscribe to Firestore run status when batchId exists
	React.useEffect(() => {
		if (!batchId) return;
		const unsub = onSnapshot(doc(db, "cefr_runs", batchId), (snap) => {
			const data: any = snap.data();
			if (!data) return;
			const s: string = data.status || "in_progress";
			setStatus(s);
			if (data.counts && data.wordsByLevel) {
				setCounts(data.counts);
				setWordsByLevel(data.wordsByLevel);
				if (typeof data.total === "number") setTotal(data.total);
				if (data.uniqueCounts) setUniqueCounts(data.uniqueCounts);
				const flat: Array<{ word: string; level: CefrLevel; source?: string; freq?: number }> = [];
				for (const lvl of levels) {
					for (const item of (data.wordsByLevel?.[lvl] || [])) {
						flat.push({ word: item.word, level: lvl, source: (item as any).source, freq: item.freq });
					}
				}
				setLabeledWords(flat.sort((a,b) => (a.level > b.level ? 1 : a.level < b.level ? -1 : 0)));
				return;
			}

			// Derive interim counts from existing + acronyms while batch is running
			const interimWordsByLevel: Record<CefrLevel, { word: string; freq: number; source?: string }[]> = { A1: [], A2: [], B1: [], B2: [], C1: [], C2: [] };
			const interimCounts: Record<CefrLevel, number> = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
			let interimTotal = 0;
			for (const src of ["existing", "acronyms"]) {
				for (const it of (data?.[src] || [])) {
					const lvl = String(it.level || "").toUpperCase();
					if (!(lvl in interimCounts)) continue;
					const level = lvl as CefrLevel;
					const freq = Number(it.freq) || 0;
					interimCounts[level] += freq;
					interimTotal += freq;
					interimWordsByLevel[level].push({ word: it.word, freq, source: src });
				}
			}
			const interimUniqueCounts: Record<CefrLevel, number> = {
				A1: interimWordsByLevel.A1.length,
				A2: interimWordsByLevel.A2.length,
				B1: interimWordsByLevel.B1.length,
				B2: interimWordsByLevel.B2.length,
				C1: interimWordsByLevel.C1.length,
				C2: interimWordsByLevel.C2.length,
			};
			setCounts(interimCounts);
			setWordsByLevel(interimWordsByLevel);
			setUniqueCounts(interimUniqueCounts);
			setTotal(interimTotal);
			const flat: Array<{ word: string; level: CefrLevel; source?: string; freq?: number }> = [];
			for (const lvl of levels) {
				for (const item of interimWordsByLevel[lvl] || []) {
					flat.push({ word: item.word, level: lvl, source: (item as any).source, freq: item.freq });
				}
			}
			setLabeledWords(flat.sort((a,b) => (a.level > b.level ? 1 : a.level < b.level ? -1 : 0)));
		});
		return () => { unsub(); };
	}, [batchId]);

	const maxCount = Math.max(1, ...levels.map(l => counts[l]));
	const isTerminal = status === "completed" || status === "failed" || status === "cancelled" || status === "expired";
	const isLoading = isSubmitting || (!!batchId && !isTerminal);

	return (
		<Container>
			<Title>CEFR Level Classifier</Title>
			<TextArea
				placeholder="Paste or type your text here..."
				value={text}
				onChange={e => setText(e.target.value)}
			/>
			<Actions>
				<PrimaryButton onClick={handleSubmit} disabled={isSubmitting || !text.trim()}>
					{isSubmitting ? "Submitting..." : "Classify Words"}
				</PrimaryButton>
				{isLoading && <Spinner role="status" aria-label="loading" />}
				{status && <SecondaryText>Status: {status}</SecondaryText>}
			</Actions>
			{error && <SecondaryText style={{ color: "#b91c1c" }}>{error}</SecondaryText>}

			<ChartWrapper>
				<div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
					<div style={{ fontWeight: 700 }}>Total weighted words: {total}</div>
					{levels.map(l => (
						<div key={`uc-${l}`} style={{ color: "#374151", fontSize: 13 }}>
							<strong>{l}</strong>: {uniqueCounts[l]} unique
						</div>
					))}
				</div>
				{isLoading && (
					<div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, color: "#111" }}>
						<Spinner />
						<div>Processing batch… This may take a while.</div>
					</div>
				)}
				<ChartGrid>
					{levels.map(level => {
						const value = counts[level] || 0;
						const pct = total > 0 ? Math.round((value / total) * 100) : 0;
						const barHeight = (value / maxCount) * 180; // px for rect
						return (
							<BarColumn key={level}>
								<BarSvg viewBox="0 0 100 200" preserveAspectRatio="none">
									<defs>
										<linearGradient id={`grad-${level}`} x1="0" y1="0" x2="0" y2="1">
											<stop offset="0%" stopColor={levelColors[level]} stopOpacity="0.95" />
											<stop offset="100%" stopColor={levelColors[level]} stopOpacity="0.55" />
										</linearGradient>
									</defs>
									<rect x="20" width="60" y={200 - barHeight} height={barHeight} rx="10" fill={`url(#grad-${level})`} />
								</BarSvg>
								<BarLabel>{value} ({pct}%)</BarLabel>
								<LevelLabel>{level}</LevelLabel>
							</BarColumn>
						);
					})}
				</ChartGrid>
				{!isLoading && (status === "completed") && (
					<div style={{ marginTop: 16 }}>
						{levels.map(l => {
							const list = wordsByLevel[l] || [];
							if (!list.length) return null;
							const top = [...list].sort((a,b) => b.freq - a.freq).slice(0, 20);
							return (
								<details key={`words-${l}`} style={{ marginBottom: 8 }}>
									<summary style={{ cursor: "pointer", fontWeight: 700, color: "#111" }}>{l} top words (showing {top.length} of {list.length})</summary>
									<div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap", color: "#111" }}>
										{top.map(item => (
											<span key={`${l}-${item.word}`} style={{ padding: "4px 8px", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, background: "#fff" }}>
												{item.word} ×{item.freq}
											</span>
										))}
									</div>
								</details>
							);
						})}
					</div>
				)}
			</ChartWrapper>
			{!isLoading && (status === "completed") && (
				<div style={{ marginTop: 16 }}>
					<strong>Per-word labels</strong>
					<div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
						{labeledWords.slice(0, 300).map((w) => (
							<div key={`${w.level}-${w.word}`} style={{ padding: "6px 8px", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, background: "#fff", color: "#111", display: "flex", justifyContent: "space-between", gap: 8 }}>
								<span style={{ fontWeight: 700 }}>{w.word}</span>
								<span style={{ opacity: 0.7 }}>{w.level}{w.source ? ` · ${w.source}` : ""}</span>
							</div>
						))}
					</div>
				</div>
			)}
		</Container>
	);
}


