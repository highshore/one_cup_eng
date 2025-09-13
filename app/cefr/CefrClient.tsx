"use client";
import React from "react";
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

	const handleSubmit = async () => {
		if (!text.trim()) return;
		setIsSubmitting(true);
		setCounts({ A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 });
		setStatus(null);
		setTotal(0);
		setError(null);
		try {
			const resp = await fetch("/api/cefr/batch", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text })
			});
			if (!resp.ok) {
				let message = "Failed to create batch";
				try { const j = await resp.json(); if (j?.error) message = String(j.error); } catch {}
				setError(message);
				return;
			}
			const data = await resp.json();
			setBatchId(data.batchId);
			setStatus("in_progress");
		} catch (e) {
			console.error(e);
			setError("Unexpected error while creating batch");
		} finally {
			setIsSubmitting(false);
		}
	};

	// Polling for status when batchId exists
	React.useEffect(() => {
		if (!batchId) return;
		let cancelled = false;
		const interval = setInterval(async () => {
			try {
				const resp = await fetch(`/api/cefr/status?batchId=${encodeURIComponent(batchId)}`);
				if (!resp.ok) {
					let message = "Failed to retrieve batch status";
					try { const j = await resp.json(); if (j?.error) message = String(j.error); } catch {}
					setError(message);
					setStatus("failed");
					clearInterval(interval);
					return;
				}
				const data = await resp.json();
				if (cancelled) return;
				setStatus(data.status);
				if (data.counts) setCounts(data.counts);
				if (typeof data.total === "number") setTotal(data.total);
				if (data.uniqueCounts) setUniqueCounts(data.uniqueCounts);
				if (data.wordsByLevel) setWordsByLevel(data.wordsByLevel);
				if (data.status === "completed" || data.status === "failed" || data.status === "cancelled" || data.status === "expired") {
					clearInterval(interval);
				}
			} catch {
				// ignore transient errors
			}
		}, 3000);
		return () => { cancelled = true; clearInterval(interval); };
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
		</Container>
	);
}


