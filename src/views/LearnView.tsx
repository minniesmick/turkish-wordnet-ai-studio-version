import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { LECTURES } from "../lib/lessons";
import { api } from "../lib/core";
import { Icon } from "../lib/icons";

export const LearnView: React.FC = () => {
  const { act, openConcept, setView } = useApp();
  const [selectedLecture, setSelectedLecture] = useState(0);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState<number | null>(null);

  const startQuiz = async (kind = "hyper") => {
    try {
      const res = await api("/api/quiz", { n: 5, kind });
      setQuizQuestions(res.questions || []);
      setQuizIndex(0);
      setQuizScore(0);
      setQuizAnswered(null);
    } catch (_) {}
  };

  const handleQuizAnswer = (k: number) => {
    if (quizAnswered !== null) return;
    setQuizAnswered(k);
    if (k === quizQuestions[quizIndex].answer) {
      setQuizScore((s) => s + 1);
    }
  };

  const lecture = LECTURES[selectedLecture];

  return (
    <div className="page">
      <h1 className="page-title">COMP 451 Ders Notları & Canlı Laboratuvarlar</h1>
      <p className="lesson-intro">
        Dr. Seniz Demir'in Doğal Dil İşlemeye Giriş (COMP 451, Güz 2026) dersi kavramları, canlı sözlük bağlantıları ve alıştırmalar.
      </p>

      {/* Lecture selector tabs */}
      <div className="tabs-u" style={{ margin: "20px 0" }}>
        {LECTURES.map((lec: any, i: number) => (
          <button
            key={i}
            aria-pressed={selectedLecture === i}
            onClick={() => setSelectedLecture(i)}
          >
            {lec.title}
          </button>
        ))}
      </div>

      {/* Active lecture sections */}
      {lecture && (
        <div style={{ marginTop: "24px" }}>
          <h2>{lecture.title}</h2>
          <p className="lesson-intro" style={{ margin: "6px 0 24px" }}>
            {lecture.desc}
          </p>

          {lecture.sections?.map((sec: any, si: number) => (
            <section key={si} className="lesson" style={{ margin: "20px 0" }}>
              <div className="gut">{sec.slide || `slayt ${si + 1}`}</div>
              <div>
                <h3>{sec.title}</h3>
                <div
                  style={{ lineHeight: "1.7", margin: "8px 0" }}
                  dangerouslySetInnerHTML={{ __html: sec.body || sec.text }}
                />

                {sec.actions && sec.actions.length > 0 && (
                  <div className="chips" style={{ marginTop: "12px" }}>
                    {sec.actions.map((a: any, ai: number) => (
                      <button
                        key={ai}
                        className="chip"
                        onClick={() => act(a)}
                      >
                        {a.label || a.q || a.act}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Quiz Section */}
      <div
        className="card-e"
        style={{
          marginTop: "40px",
          padding: "24px",
          background: "var(--page)",
        }}
      >
        <div className="entry-head">
          <h2 style={{ fontSize: "1.4rem" }}>Hızlı Bilgi Sınavı (Self-Quiz)</h2>
          <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
            <button
              className="btn pri sm"
              onClick={() => startQuiz("hyper")}
            >
              Hypernym / Hyponym (5 soru)
            </button>
            <button
              className="btn sm"
              onClick={() => startQuiz("meronym")}
            >
              Meronym / Holonym (5 soru)
            </button>
          </div>
        </div>

        {quizQuestions.length > 0 && quizIndex < quizQuestions.length ? (
          <div style={{ marginTop: "20px" }}>
            <div className="entry-head">
              <span className="lbl">
                Soru {quizIndex + 1} / {quizQuestions.length}
              </span>
              <span className="muted" style={{ marginLeft: "auto" }}>
                Puan: {quizScore}
              </span>
            </div>

            <p style={{ fontSize: "1.2rem", margin: "16px 0" }}>
              <b>{quizQuestions[quizIndex].q}</b>
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {quizQuestions[quizIndex].options?.map((opt: string, oi: number) => {
                const isChosen = quizAnswered === oi;
                const isCorrect = oi === quizQuestions[quizIndex].answer;
                let cls = "btn";
                if (quizAnswered !== null) {
                  if (isCorrect) cls += " pri";
                  else if (isChosen) cls += " ghost";
                }
                return (
                  <button
                    key={oi}
                    className={cls}
                    style={{ textAlign: "left", justifyContent: "flex-start" }}
                    onClick={() => handleQuizAnswer(oi)}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {quizAnswered !== null && (
              <div style={{ marginTop: "16px" }}>
                <button
                  className="btn pri"
                  onClick={() => {
                    setQuizIndex((i) => i + 1);
                    setQuizAnswered(null);
                  }}
                >
                  Sonraki soru
                </button>
              </div>
            )}
          </div>
        ) : quizQuestions.length > 0 && quizIndex >= quizQuestions.length ? (
          <div style={{ marginTop: "20px" }}>
            <h3>Sınav Tamamlandı!</h3>
            <p style={{ fontSize: "1.1rem", margin: "12px 0" }}>
              Skorunuz: <b>{quizScore}</b> / {quizQuestions.length}
            </p>
            <button className="btn pri" onClick={() => startQuiz("hyper")}>
              Tekrar Dene
            </button>
          </div>
        ) : (
          <p className="muted" style={{ marginTop: "12px" }}>
            Yukarıdaki düğmelerden birini seçerek WordNet ilişkileri bilginizi test edebilirsiniz.
          </p>
        )}
      </div>
    </div>
  );
};
