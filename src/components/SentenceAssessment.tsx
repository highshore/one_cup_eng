import React from "react";
import {
  SentenceForAssessment,
  AzureWordPronunciationResult,
} from "../types/shadow";
import {
  colors,
  ColorCodedSentence,
  SentenceTextDisplay,
  WordWithScoreContainer,
  ScoreDisplaySpan,
  SyllableSpan,
} from "../styles/shadowStyles";
import { getAzurePronunciationColor } from "../utils/shadowUtils";

interface SentenceAssessmentProps {
  sentence: SentenceForAssessment;
  index: number;
}

const SentenceAssessment: React.FC<SentenceAssessmentProps> = ({
  sentence,
  index,
}) => {
  console.log("[RenderDebug] Original Sentence Text:", sentence.text);
  const originalTextWords = sentence.text.trim().split(/\s+/);
  const azureWords =
    (sentence.assessmentResult?.detailResult
      ?.Words as AzureWordPronunciationResult[]) || [];

  // If assessment is not finalized, show only plain text and recognized text (if available)
  if (!sentence.isAssessmentFinalized) {
    return (
      <ColorCodedSentence>
        <SentenceTextDisplay>{sentence.text}</SentenceTextDisplay>
        {sentence.isAssessing && (
          <div
            style={{
              marginTop: "0.5rem",
              fontSize: "0.9rem",
              color: colors.text.muted,
            }}
          >
            <i>
              Recording... Recognized so far: "{sentence.recognizedText || ""}"
            </i>
          </div>
        )}
        {!sentence.isAssessing && sentence.recognizedText && (
          <div
            style={{
              marginTop: "0.5rem",
              fontSize: "0.9rem",
              color: colors.text.muted,
            }}
          >
            <i>Processing... Recognized: "{sentence.recognizedText || ""}"</i>
          </div>
        )}
      </ColorCodedSentence>
    );
  }

  // Assessment is finalized, show full details
  if (!sentence.assessmentResult) {
    return (
      <ColorCodedSentence>
        <SentenceTextDisplay>{sentence.text}</SentenceTextDisplay>
        <p style={{ color: colors.error, fontSize: "0.9rem" }}>
          Assessment data is missing after finalization.
        </p>
        {sentence.recordedSentenceAudioUrl && (
          <div style={{ marginTop: "0.75rem" }}>
            <audio
              id={`sentence-audio-${index}`}
              controls
              src={sentence.recordedSentenceAudioUrl}
              style={{ width: "100%" }}
            />
          </div>
        )}
      </ColorCodedSentence>
    );
  }

  const displayElements: React.ReactNode[] = [];
  let azureWordIdx = 0;
  let spokenWordCount = 0;
  const totalOriginalWords = originalTextWords.length;

  const normalizeWord = (word: string) =>
    word.toLowerCase().replace(/[.,!?;:'"()[\]{}]|…/g, "");

  // First, process any leading insertions from Azure
  while (
    azureWordIdx < azureWords.length &&
    azureWords[azureWordIdx]?.PronunciationAssessment?.ErrorType === "Insertion"
  ) {
    const azureWord = azureWords[azureWordIdx];
    const accuracyScore = azureWord.PronunciationAssessment?.AccuracyScore;
    const tooltipText = `Word: ${azureWord.Word}\nError: Insertion\nAccuracy: ${
      accuracyScore !== undefined ? accuracyScore.toFixed(0) + "%" : "N/A"
    }`;
    displayElements.push(
      <React.Fragment key={`insertion-prefix-${azureWordIdx}`}>
        <SyllableSpan
          color="gray"
          title="Marker for inserted text"
          style={{ fontStyle: "italic", marginRight: "0.2em" }}
          isInserted
        >
          [&nbsp;&nbsp;]
        </SyllableSpan>
        <WordWithScoreContainer
          key={`insertion-text-score-prefix-${azureWordIdx}`}
        >
          <SyllableSpan
            color={getAzurePronunciationColor(accuracyScore)}
            isOmitted={false}
            isInserted={true}
            title={tooltipText}
          >
            {azureWord.Word}
          </SyllableSpan>
        </WordWithScoreContainer>{" "}
      </React.Fragment>
    );
    azureWordIdx++;
  }

  originalTextWords.forEach((originalWord, originalWordIdx) => {
    let matchedAzureWord: AzureWordPronunciationResult | null = null;
    let consumedAzureWord = false;

    const normalizedOriginalWord = normalizeWord(originalWord);
    console.log(
      `[RenderDebug] Original[${originalWordIdx}]: '${originalWord}' (Normalized: '${normalizedOriginalWord}')`
    );

    if (azureWordIdx < azureWords.length) {
      const currentAzureWord = azureWords[azureWordIdx];
      const normalizedAzureWord = normalizeWord(currentAzureWord.Word);
      const currentAzureErrorType =
        currentAzureWord.PronunciationAssessment?.ErrorType;

      console.log(
        `[RenderDebug] Azure[${azureWordIdx}]: '${currentAzureWord.Word}' (Normalized: '${normalizedAzureWord}'), Type: ${currentAzureErrorType}`
      );

      let isMatch = false;
      if (
        currentAzureErrorType !== "Insertion" &&
        normalizedOriginalWord === normalizedAzureWord
      ) {
        isMatch = true;
        matchedAzureWord = currentAzureWord;
        consumedAzureWord = true;
      } else if (
        currentAzureErrorType === "Omission" &&
        normalizedOriginalWord === normalizedAzureWord
      ) {
        isMatch = true;
        matchedAzureWord = currentAzureWord;
        consumedAzureWord = true;
      }
      console.log(
        `[RenderDebug] Comparison: normalizedOriginal('${normalizedOriginalWord}') === normalizedAzure('${normalizedAzureWord}') ==> ${isMatch}`
      );
    }

    if (matchedAzureWord) {
      console.log(
        `[RenderDebug] Matched: '${originalWord}' with Azure's '${matchedAzureWord.Word}'. ErrorType: ${matchedAzureWord.PronunciationAssessment?.ErrorType}`
      );
      const assessment = matchedAzureWord.PronunciationAssessment;
      const accuracyScore = assessment?.AccuracyScore;
      const errorType = assessment?.ErrorType;
      const isOmission = errorType === "Omission";
      const hasUnexpectedBreak = errorType === "UnexpectedBreak";
      const hasMissingBreak = errorType === "MissingBreak";

      let displayWordText = matchedAzureWord.Word;
      if (isOmission) {
        displayWordText = `[${matchedAzureWord.Word}]`;
      }

      const tooltipText = `Word: ${matchedAzureWord.Word}\nError: ${
        errorType || "None"
      }\nAccuracy: ${
        accuracyScore !== undefined ? accuracyScore.toFixed(0) + "%" : "N/A"
      }`;

      if (!isOmission) {
        spokenWordCount++;
      }

      displayElements.push(
        <WordWithScoreContainer key={`word-score-${originalWordIdx}`}>
          <SyllableSpan
            color={getAzurePronunciationColor(accuracyScore)}
            isOmitted={isOmission}
            isInserted={false}
            hasUnexpectedBreak={hasUnexpectedBreak}
            hasMissingBreak={hasMissingBreak}
            title={tooltipText}
          >
            {displayWordText}
          </SyllableSpan>
          {!isOmission && (
            <ScoreDisplaySpan color={getAzurePronunciationColor(accuracyScore)}>
              {accuracyScore !== undefined ? Math.round(accuracyScore) : "?"}
            </ScoreDisplaySpan>
          )}
        </WordWithScoreContainer>
      );
    } else {
      console.log(
        `[RenderDebug] Omission: '${originalWord}' was not found in Azure words or was implicitly omitted.`
      );
      const tooltipText = `Word: ${originalWord}\nError: Omission (implicit)\nAccuracy: N/A`;
      displayElements.push(
        <WordWithScoreContainer key={`omission-${originalWordIdx}`}>
          <SyllableSpan
            color="gray"
            isOmitted={true}
            isInserted={false}
            title={tooltipText}
          >
            [{originalWord}]
          </SyllableSpan>
        </WordWithScoreContainer>
      );
    }

    if (consumedAzureWord) {
      azureWordIdx++;
    }

    // After processing an original word, skip any subsequent Azure insertions
    while (
      azureWordIdx < azureWords.length &&
      azureWords[azureWordIdx]?.PronunciationAssessment?.ErrorType ===
        "Insertion"
    ) {
      const azureWord = azureWords[azureWordIdx];
      const accuracyScore = azureWord.PronunciationAssessment?.AccuracyScore;
      const tooltipText = `Word: ${
        azureWord.Word
      }\nError: Insertion\nAccuracy: ${
        accuracyScore !== undefined ? accuracyScore.toFixed(0) + "%" : "N/A"
      }`;
      displayElements.push(
        <React.Fragment key={`insertion-${azureWordIdx}`}>
          {" "}
          <SyllableSpan
            color="gray"
            title="Marker for inserted text"
            style={{ fontStyle: "italic", marginRight: "0.2em" }}
            isInserted
          >
            [&nbsp;&nbsp;]
          </SyllableSpan>
          <WordWithScoreContainer key={`insertion-text-score-${azureWordIdx}`}>
            <SyllableSpan
              color={getAzurePronunciationColor(accuracyScore)}
              isOmitted={false}
              isInserted={true}
              title={tooltipText}
            >
              {azureWord.Word}
            </SyllableSpan>
          </WordWithScoreContainer>
        </React.Fragment>
      );
      azureWordIdx++;
    }

    displayElements.push(<span key={`space-${originalWordIdx}`}> </span>);
  });

  const completenessPercentage = Math.round(
    (spokenWordCount / totalOriginalWords) * 100
  );

  return (
    <ColorCodedSentence>
      <div
        style={{
          marginBottom: "1rem",
          fontSize: "1.05rem",
          lineHeight: "1.7",
        }}
      >
        {displayElements}
      </div>
      <div
        style={{
          marginTop: "0.75rem",
          fontSize: "0.875rem",
          color: colors.text.muted,
        }}
      >
        Completeness: {completenessPercentage}% ({spokenWordCount}/
        {totalOriginalWords} words spoken)
      </div>
      {sentence.recordedSentenceAudioUrl && (
        <div style={{ marginTop: "0.75rem" }}>
          <audio
            id={`sentence-audio-${index}`}
            controls
            src={sentence.recordedSentenceAudioUrl}
            style={{ width: "100%" }}
          />
        </div>
      )}
    </ColorCodedSentence>
  );
};

export default SentenceAssessment;
