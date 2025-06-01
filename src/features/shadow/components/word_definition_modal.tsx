import React from "react";
import styled from "styled-components";
import { WordDefinitionModalState } from "../types/shadow";
import { colors } from "../styles/shadow_styles";

interface WordDefinitionModalProps {
  modalState: WordDefinitionModalState;
  onClose: () => void;
}

const DefinitionModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  opacity: ${(props) => (props.isOpen ? 1 : 0)};
  visibility: ${(props) => (props.isOpen ? "visible" : "hidden")};
  transition: opacity 0.3s ease, visibility 0.3s ease;
`;

const DefinitionModalContent = styled.div`
  background: ${colors.background};
  border-radius: 12px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
  padding: 1.8rem;
  max-width: 90%;
  width: 450px;
  position: relative;
  transform: scale(1);
  transition: transform 0.3s ease;
  border-left: 5px solid ${colors.accent};
  border: 1px solid ${colors.border.light};
  overflow-y: auto;
  max-height: 90vh;

  @media (max-width: 768px) {
    padding: 1.5rem;
    width: 80%;
    max-height: 80vh;
  }

  @media (max-width: 480px) {
    padding: 1.2rem;
    width: 90%;
    max-height: 75vh;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: ${colors.text.muted};
  cursor: pointer;
  width: 2.1rem;
  height: 2.1rem;
  padding: 0;
  line-height: 1;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  @media (max-width: 768px) {
    top: 0.8rem;
    right: 0.8rem;
    width: 2rem;
    height: 2rem;
  }

  &:hover {
    color: ${colors.primary};
    background: ${colors.border.light};
  }
`;

const WordDefinitionTitle = styled.div`
  font-weight: bold;
  color: ${colors.primary};
  margin-bottom: 1rem;
  font-size: 1.5rem;
  padding-bottom: 0.7rem;
  border-bottom: 1px solid ${colors.border.light};
`;

const WordDefinitionContent = styled.div`
  color: ${colors.text.secondary};
  font-family: "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
  line-height: 1.6;
  white-space: pre-line;
  font-size: 1rem;
`;

const LoadingDefinitionContent = styled.div`
  color: ${colors.text.muted};
  font-style: italic;
  padding: 1rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
`;

const DefinitionSection = styled.div`
  margin-bottom: 1.5rem;
`;

const DefinitionLabel = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: ${colors.primary};
  margin-bottom: 0.5rem;
`;

const Collapsible = styled.details`
  margin-top: 1rem;

  summary {
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    list-style: none;
    margin: 0;
    padding: 0;
    &:hover {
      color: ${colors.primaryDark};
    }
  }

  ul {
    padding-left: 1.2rem;
    margin: 0.5rem 0;
    list-style: disc;
    font-size: 0.9rem;
    color: ${colors.text.secondary};
  }
`;

const WordDefinitionModal: React.FC<WordDefinitionModalProps> = ({
  modalState,
  onClose,
}) => {
  return (
    <DefinitionModalOverlay isOpen={modalState.isOpen} onClick={onClose}>
      <DefinitionModalContent
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <CloseButton onClick={onClose}>×</CloseButton>
        <WordDefinitionTitle>{modalState.word}</WordDefinitionTitle>
        {/* Combined loading state for initial fetch */}
        {modalState.isLoading &&
        !modalState.apiData &&
        !modalState.gptDefinition ? (
          <LoadingDefinitionContent>
            뜻풀이 및 영어 정의 검색 중...
          </LoadingDefinitionContent>
        ) : (
          <>
            {/* Korean Definition (GPT) Section */}
            <DefinitionSection>
              {modalState.isLoading && !modalState.gptDefinition ? (
                <LoadingDefinitionContent>
                  GPT 뜻풀이 검색 중...
                </LoadingDefinitionContent>
              ) : modalState.gptDefinition ? (
                <WordDefinitionContent>
                  {modalState.gptDefinition}
                </WordDefinitionContent>
              ) : (
                <WordDefinitionContent>
                  한국어 뜻풀이를 가져오지 못했습니다.
                </WordDefinitionContent>
              )}
            </DefinitionSection>

            {/* English Definitions (Dictionary API) Section */}
            {modalState.isLoading && !modalState.apiData ? (
              <LoadingDefinitionContent>
                Loading English definitions from API...
              </LoadingDefinitionContent>
            ) : modalState.apiData &&
              Array.isArray(modalState.apiData) &&
              modalState.apiData.length > 0 ? (
              <Collapsible>
                <summary>📖 영어 사전 확인하기</summary>

                {modalState.apiData.map((entry: any, entryIdx: number) => (
                  <div
                    key={`entry-${entryIdx}`}
                    style={{
                      marginTop: "1rem",
                      borderBottom:
                        entryIdx < modalState.apiData.length - 1
                          ? "1px solid #eee"
                          : "none",
                      paddingBottom:
                        entryIdx < modalState.apiData.length - 1 ? "1rem" : "0",
                    }}
                  >
                    {/* All Phonetics with Audio */}
                    {entry.phonetics &&
                      entry.phonetics.filter((p: any) => p.text).length > 0 && (
                        <DefinitionSection>
                          <DefinitionLabel style={{ fontSize: "0.9rem" }}>
                            Pronunciation
                          </DefinitionLabel>
                          {entry.phonetics.map(
                            (p: any, pIdx: number) =>
                              p.text && (
                                <div
                                  key={`phonetic-${pIdx}`}
                                  style={{
                                    marginBottom: "0.3rem",
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  {p.audio && (
                                    <audio
                                      controls
                                      src={p.audio}
                                      style={{
                                        height: "30px",
                                        minWidth: "100%",
                                      }}
                                    />
                                  )}
                                </div>
                              )
                          )}
                        </DefinitionSection>
                      )}

                    {/* Meanings */}
                    {entry.meanings && entry.meanings.length > 0 && (
                      <DefinitionSection>
                        <DefinitionLabel style={{ fontSize: "0.9rem" }}>
                          Meanings
                        </DefinitionLabel>
                        {entry.meanings.map((meaning: any, mIdx: number) => (
                          <div
                            key={`meaning-${mIdx}`}
                            style={{ marginBottom: "0.8rem" }}
                          >
                            <WordDefinitionContent
                              style={{
                                fontWeight: "bold",
                                color: colors.primaryDark,
                              }}
                            >
                              {meaning.partOfSpeech}
                            </WordDefinitionContent>

                            {meaning.definitions &&
                              meaning.definitions.length > 0 && (
                                <ul
                                  style={{
                                    marginTop: "0.3rem",
                                    paddingLeft: "0px",
                                    listStyleType: "disc",
                                  }}
                                >
                                  {meaning.definitions.map(
                                    (def: any, dIdx: number) => (
                                      <li
                                        key={`def-${dIdx}`}
                                        style={{ marginBottom: "0.4rem" }}
                                      >
                                        {def.definition}
                                        {def.example && (
                                          <div
                                            style={{
                                              fontStyle: "italic",
                                              color: colors.text.muted,
                                              fontSize: "0.9em",
                                              marginLeft: "0px",
                                              overflowWrap: "break-word",
                                              wordBreak: "break-word",
                                            }}
                                          >
                                            e.g. "{def.example}"
                                          </div>
                                        )}
                                        {def.synonyms &&
                                          def.synonyms.length > 0 && (
                                            <div
                                              style={{
                                                fontSize: "0.85em",
                                                color: colors.text.secondary,
                                                marginTop: "0.2rem",
                                                overflowWrap: "break-word",
                                                wordBreak: "break-word",
                                              }}
                                            >
                                              <strong>Synonyms:</strong>{" "}
                                              {def.synonyms.join(", ")}
                                            </div>
                                          )}
                                        {def.antonyms &&
                                          def.antonyms.length > 0 && (
                                            <div
                                              style={{
                                                fontSize: "0.85em",
                                                color: colors.text.secondary,
                                                marginTop: "0.2rem",
                                                overflowWrap: "break-word",
                                                wordBreak: "break-word",
                                              }}
                                            >
                                              <strong>Antonyms:</strong>{" "}
                                              {def.antonyms.join(", ")}
                                            </div>
                                          )}
                                      </li>
                                    )
                                  )}
                                </ul>
                              )}
                            {/* Display meaning-level synonyms */}
                            {meaning.synonyms &&
                              meaning.synonyms.length > 0 && (
                                <div
                                  style={{
                                    fontSize: "0.85em",
                                    color: colors.text.secondary,
                                    marginTop: "0.3rem",
                                    paddingLeft: "0px",
                                    overflowWrap: "break-word",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  <strong>Synonyms:</strong>{" "}
                                  {meaning.synonyms.join(", ")}
                                </div>
                              )}

                            {/* Display meaning-level antonyms */}
                            {meaning.antonyms &&
                              meaning.antonyms.length > 0 && (
                                <div
                                  style={{
                                    fontSize: "0.85em",
                                    color: colors.text.secondary,
                                    marginTop: "0.3rem",
                                    paddingLeft: "0px",
                                    overflowWrap: "break-word",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  <strong>Antonyms:</strong>{" "}
                                  {meaning.antonyms.join(", ")}
                                </div>
                              )}
                          </div>
                        ))}
                      </DefinitionSection>
                    )}
                    {/* Source URLs */}
                    {entry.sourceUrls && entry.sourceUrls.length > 0 && (
                      <DefinitionSection>
                        <DefinitionLabel style={{ fontSize: "0.9rem" }}>
                          Source: Wikitionary
                        </DefinitionLabel>
                      </DefinitionSection>
                    )}
                  </div>
                ))}
              </Collapsible>
            ) : modalState.apiData &&
              modalState.apiData.title === "No Definitions Found" ? (
              <LoadingDefinitionContent>
                No English definitions found for "{modalState.word}" via API.
              </LoadingDefinitionContent>
            ) : (
              !modalState.isLoading && (
                <LoadingDefinitionContent>
                  Could not load English definitions for "{modalState.word}".
                </LoadingDefinitionContent>
              )
            )}
          </>
        )}
      </DefinitionModalContent>
    </DefinitionModalOverlay>
  );
};

export default WordDefinitionModal;
