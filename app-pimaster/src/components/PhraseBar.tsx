import { useState } from "react";
import { addPhrase, appendPhrase, listPhrases, removePhrase, type PhraseCategory } from "../lib/phrases";

/**
 * Quick-phrase chips (U4): tap to insert into the target note, "+" saves the
 * physician's own phrase, "×" removes one from the library. Insertions are
 * plain text the physician then edits — the bar types, it never documents.
 */
export function PhraseBar(props: { category: PhraseCategory; value: string; onInsert: (next: string) => void }) {
  const [, bump] = useState(0);
  const phrases = listPhrases(props.category);

  function saveCurrentPrompt() {
    const text = prompt("New quick phrase (EMR shorthand, one statement):")?.trim();
    if (!text) return;
    addPhrase(props.category, text);
    bump((n) => n + 1);
  }

  return (
    <div className="phrase-bar">
      <span className="phrase-label">Quick phrases — tap to insert</span>
      {phrases.map((p) => (
        <span key={p} className="phrase-chip">
          <button type="button" className="phrase-insert" title={p} onClick={() => props.onInsert(appendPhrase(props.value, p))}>
            {p.length > 46 ? p.slice(0, 44) + "…" : p}
          </button>
          <button
            type="button"
            className="phrase-x"
            title="Remove from library"
            onClick={() => {
              removePhrase(props.category, p);
              bump((n) => n + 1);
            }}
          >
            ×
          </button>
        </span>
      ))}
      <button type="button" className="phrase-add" onClick={saveCurrentPrompt}>
        ＋ Add phrase
      </button>
    </div>
  );
}
