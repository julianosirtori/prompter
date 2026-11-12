import { useRef, useState } from 'react';
import { takeLabel } from '../../app/copy';
import { takeFlashKey, useFlash } from '../../app/flash';
import { navigate } from '../../app/router';
import { markAt } from '../../app/sessionAdapters';
import { cutMarkersCsv, cutMarkersText } from '../../domain/export';
import { setBlockDuration } from '../../domain/script';
import { takeFileName, type Take } from '../../domain/take';
import type { BlockMark, BlockRange } from '../../domain/timeline';
import type { Script } from '../../domain/types';
import { saveFile } from '../../media/device';
import { extensionFor } from '../../media/recorder';
import { Button } from '../../ui/Button';
import { ConfirmInline } from '../../ui/ConfirmInline';
import { Flash } from '../../ui/Flash';
import { useHotkeys } from '../../ui/useHotkeys';
import { RangePicker } from '../session/RangePicker';
import { BlockChips } from './BlockChips';
import { PaceList } from './PaceList';
import { Rating } from './Rating';
import { TakePlayer } from './TakePlayer';
import { useTakeVideo } from './useTakeVideo';

interface TakeDetailProps {
  script: Script;
  take: Take;
  onUpdate(take: Take): void;
  onDelete(): void;
  /** The take is being deleted: its controls wait. */
  deleting: boolean;
  onSaveScript(script: Script): void;
}

const record = (scriptId: string, range: BlockRange | null) =>
  navigate({ name: 'session', scriptId, kind: 'record', range });

/** Review of one take: player, block chips, synced edit note, pace and what to do next. */
export function TakeDetail({ script, take, onUpdate, onDelete, deleting, onSaveScript }: TakeDetailProps) {
  const video = useTakeVideo(take);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [picking, setPicking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [flash, dismissFlash] = useFlash(takeFlashKey(take.id));

  const activeMark = markAt(take.marks, time);
  const activeBlock = activeMark ? script.blocks[activeMark.blockIndex] : undefined;
  const lastBlock = take.marks.at(-1)?.blockIndex ?? take.range.from;
  const baseName = takeFileName(script, take, 'x').replace(/\.x$/, '');
  // Block to record again with R: the one under the playhead, or, right after a take that was
  // stopped, the block it stopped on.
  const currentBlock = take.incomplete && time === 0 ? lastBlock : (activeMark?.blockIndex ?? lastBlock);

  const seek = (mark: BlockMark) => {
    const player = videoRef.current;
    if (!player) return;
    player.currentTime = mark.start;
    setTime(mark.start);
    void player.play().catch(() => undefined);
  };

  // The Blob is already in memory, so the share sheet opens inside the click (Safari needs that).
  const download = () => {
    if (video.status !== 'ready') return;
    void saveFile(video.blob, takeFileName(script, take, extensionFor(take.mimeType ?? video.blob.type)));
  };
  const exportMarkers = (format: 'txt' | 'csv') => {
    const blob =
      format === 'txt'
        ? new Blob([cutMarkersText(script, take)], { type: 'text/plain;charset=utf-8' })
        : new Blob([cutMarkersCsv(script, take)], { type: 'text/csv;charset=utf-8' });
    void saveFile(blob, `${baseName}_marcadores.${format}`);
  };

  useHotkeys({ r: () => record(script.id, { from: currentBlock, to: currentBlock }) });

  return (
    <div className="take">
      <div className="take__media">
        <TakePlayer video={video} videoRef={videoRef} prompterOnly={take.kind === 'prompter'} onTime={setTime} />
        <BlockChips
          blocks={script.blocks}
          marks={take.marks}
          activeBlock={activeMark?.blockIndex ?? null}
          canSeek={video.status === 'ready'}
          onSeek={seek}
        />
        {activeMark && (
          <p className="take__note" aria-live="polite">
            <span className="eyebrow">Edição · bloco {activeMark.blockIndex + 1}</span>
            {activeBlock?.edit || <span className="muted">Sem nota de edição neste bloco.</span>}
          </p>
        )}
      </div>

      <div className="take__side">
        <Flash text={flash} onDismiss={dismissFlash} />
        <h1 className="title">
          {takeLabel(take)}
          {take.incomplete && <span className="tag tag--amber">incompleto</span>}
        </h1>

        {take.incomplete && (
          <div className="notice notice--warn">
            <p>Take parado no bloco {lastBlock + 1}. Quer regravar a partir dele?</p>
            <div className="notice__actions">
              <Button size="sm" onClick={() => record(script.id, { from: lastBlock, to: script.blocks.length - 1 })}>
                Regravar do bloco {lastBlock + 1}
              </Button>
            </div>
          </div>
        )}

        <div className="take__actions">
          <Button
            variant={take.starred ? 'secondary' : 'primary'}
            size="lg"
            icon={take.starred ? 'star' : 'check'}
            aria-pressed={take.starred}
            className={take.starred ? 'is-starred' : ''}
            onClick={() => onUpdate({ ...take, starred: !take.starred })}
          >
            Ficou bom
          </Button>
          <Button size="lg" icon="redo" shortcut="R" onClick={() => setPicking(true)}>
            Regravar bloco…
          </Button>
          <Button size="lg" onClick={() => record(script.id, null)}>
            Gravar de novo
          </Button>
        </div>

        <div className="take__actions take__actions--minor">
          <Button icon="download" disabled={video.status !== 'ready'} onClick={download}>
            Baixar
          </Button>
          <div className="export" role="group" aria-label="Exportar marcadores">
            <span className="export__label">Exportar marcadores</span>
            <Button size="sm" disabled={take.marks.length === 0} onClick={() => exportMarkers('txt')}>
              .txt
            </Button>
            <Button size="sm" disabled={take.marks.length === 0} onClick={() => exportMarkers('csv')}>
              .csv
            </Button>
          </div>
          <Button variant="ghost" icon="trash" disabled={deleting} onClick={() => setConfirming(true)}>
            Apagar
          </Button>
        </div>
        {confirming && (
          <ConfirmInline
            question="Apagar este take? Não dá pra desfazer."
            confirmLabel="Apagar"
            onConfirm={() => {
              setConfirming(false);
              onDelete();
            }}
            onCancel={() => setConfirming(false)}
          />
        )}

        <PaceList
          blocks={script.blocks}
          marks={take.marks}
          onUseTime={(blockIndex, seconds) => {
            const block = script.blocks[blockIndex];
            if (block) onSaveScript(setBlockDuration(script, block.id, seconds));
          }}
        />
        <Rating value={take.selfRating} onChange={(selfRating) => onUpdate({ ...take, selfRating })} />
      </div>

      <RangePicker
        open={picking}
        blocks={script.blocks}
        initial={currentBlock}
        onClose={() => setPicking(false)}
        onPick={(range) => record(script.id, range)}
      />
    </div>
  );
}
