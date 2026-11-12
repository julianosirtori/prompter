import { useRef, useState } from 'react';
import { navigate } from '../../app/router';
import { parseScript } from '../../domain/parser';
import type { Script } from '../../domain/types';
import { Button } from '../../ui/Button';
import { RecentScripts } from './RecentScripts';
import './paste.css';

interface PasteScreenProps {
  scripts: readonly Script[];
  onCreate(script: Script): void;
  onDelete(scriptId: string): void;
}

type PasteError = 'unrecognized' | 'clipboard';

const ERROR_TEXT: Record<PasteError, string> = {
  unrecognized: 'Não entendi esse formato. Cole como texto simples: uma frase por linha.',
  clipboard: 'Não consegui ler a área de transferência. Toque no campo e cole por lá.',
};

export function PasteScreen({ scripts, onCreate, onDelete }: PasteScreenProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<PasteError | null>(null);
  const pasted = useRef(false);

  /** Parses and, when it works, goes straight to the review: there is no "process" step. */
  const submit = (source: string) => {
    const result = parseScript(source);
    if (!result.ok) {
      setError(result.error === 'empty' ? null : 'unrecognized');
      return;
    }
    onCreate(result.script);
    navigate({ name: 'review', scriptId: result.script.id });
  };

  const pasteFromClipboard = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (!clip.trim()) {
        setError('clipboard');
        return;
      }
      setText(clip);
      submit(clip);
    } catch {
      setError('clipboard');
    }
  };

  return (
    <main className="screen paste">
      <header className="paste__brand">
        <span className="brand-mark" aria-hidden="true" />
        <span>Prompter</span>
      </header>

      <section className="paste__hero" aria-labelledby="paste-title">
        <h1 id="paste-title" className="display">
          Cole seu roteiro aqui
        </h1>
        <p className="muted">Aceita tabela (markdown ou com bordas) ou texto simples.</p>

        <textarea
          className="paste__input"
          value={text}
          rows={9}
          spellCheck={false}
          aria-label="Roteiro"
          aria-describedby={error ? 'paste-error' : undefined}
          aria-invalid={error === 'unrecognized'}
          placeholder={'| Tempo | Você fala | O que eu ponho na edição |\n| 0–3s | Fisio autônomo: onde tá a ficha… | Legenda grande |\n\nou uma frase por linha.'}
          onPaste={() => {
            pasted.current = true;
          }}
          onChange={(event) => {
            const value = event.target.value;
            setText(value);
            if (pasted.current) submit(value);
            else setError(null);
            pasted.current = false;
          }}
        />

        {error && (
          <p id="paste-error" className="notice notice--warn" role="alert">
            {ERROR_TEXT[error]}
          </p>
        )}

        <div className="paste__actions">
          <Button variant="primary" size="lg" icon="clipboard" onClick={() => void pasteFromClipboard()}>
            Colar da área de transferência
          </Button>
          {text.trim() && (
            <Button size="lg" onClick={() => submit(text)}>
              Revisar blocos
            </Button>
          )}
        </div>
      </section>

      <RecentScripts scripts={scripts} onOpen={(scriptId) => navigate({ name: 'review', scriptId })} onDelete={onDelete} />
    </main>
  );
}
