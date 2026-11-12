import type { ReactNode } from 'react';
import { rerecordLabel } from '../../app/copy';
import { isTouchDevice } from '../../app/env';
import type { SessionKind } from '../../app/router';
import type { UpdateSettings } from '../../app/useSettings';
import type { BlockRange } from '../../domain/timeline';
import type { AdvanceMode } from '../../engine/prompter';
import type { Facing } from '../../media/camera';
import { isRecordingSupported } from '../../media/recorder';
import type { RecordingMode, Settings, TextSize } from '../../storage/local';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Segmented } from '../../ui/Segmented';
import { Sheet } from '../../ui/Sheet';
import { MAX_SPEED, MIN_SPEED, stepSpeed } from './speed';
import { useDevices } from './useDevices';
import './session.css';

interface SessionSheetProps {
  open: boolean;
  kind: SessionKind;
  range: BlockRange | null;
  settings: Settings;
  onSettings: UpdateSettings;
  onConfirm(): void;
  onClose(): void;
}

const RECORDING_MODES: { value: RecordingMode; label: string; hint: string }[] = [
  { value: 'camera', label: 'Gravar aqui', hint: 'com câmera' },
  { value: 'prompter', label: 'Só prompter', hint: 'gravo em outro app' },
];
const ADVANCE_MODES: { value: AdvanceMode; label: string }[] = [
  { value: 'timed', label: 'Pelo tempo do roteiro' },
  { value: 'manual', label: 'Manual' },
];
const TEXT_SIZES: { value: TextSize; label: string }[] = [
  { value: 'sm', label: 'P' },
  { value: 'md', label: 'M' },
  { value: 'lg', label: 'G' },
];
const FACINGS: { value: Facing; label: string }[] = [
  { value: 'user', label: 'Frontal' },
  { value: 'environment', label: 'Traseira' },
];

/** The one sheet shown before rehearsing or recording; every choice is remembered. */
export function SessionSheet({ open, kind, range, settings, onSettings, onConfirm, onClose }: SessionSheetProps) {
  const canRecord = isRecordingSupported();
  const recording = kind === 'record';
  const withCamera = recording && canRecord && settings.recordingMode === 'camera';
  const touch = isTouchDevice();
  const devices = useDevices(open && withCamera && !touch);
  const confirmLabel = range ? rerecordLabel(range) : recording ? 'Gravar' : 'Ensaiar';

  return (
    <Sheet
      open={open}
      title={recording ? 'Antes de gravar' : 'Antes de ensaiar'}
      onClose={onClose}
      footer={
        <Button variant="primary" size="lg" block onClick={onConfirm}>
          {confirmLabel}
        </Button>
      }
    >
      {recording && (
        <Field label="Modo de gravação">
          {canRecord ? (
            <Segmented
              label="Modo de gravação"
              value={settings.recordingMode}
              options={RECORDING_MODES}
              onChange={(recordingMode) => onSettings({ recordingMode })}
            />
          ) : (
            <p className="muted">Este navegador não grava vídeo. O roteiro roda só como prompter.</p>
          )}
        </Field>
      )}

      <Field label="Avanço" hint={!recording ? 'No manual, você toca a cada trecho e o app mede o seu ritmo.' : undefined}>
        <Segmented label="Avanço" value={settings.advance} options={ADVANCE_MODES} onChange={(advance) => onSettings({ advance })} />
      </Field>

      <div className="field-row">
        <Field label="Velocidade">
          <div className="stepper" role="group" aria-label="Velocidade">
            <button
              type="button"
              className="icon-btn"
              aria-label="Diminuir velocidade"
              disabled={settings.speed <= MIN_SPEED}
              onClick={() => onSettings({ speed: stepSpeed(settings.speed, -1) })}
            >
              <Icon name="minus" />
            </button>
            <output aria-live="polite">{Math.round(settings.speed * 100)}%</output>
            <button
              type="button"
              className="icon-btn"
              aria-label="Aumentar velocidade"
              disabled={settings.speed >= MAX_SPEED}
              onClick={() => onSettings({ speed: stepSpeed(settings.speed, 1) })}
            >
              <Icon name="plus" />
            </button>
          </div>
        </Field>
        <Field label="Tamanho do texto">
          <Segmented label="Tamanho do texto" value={settings.textSize} options={TEXT_SIZES} onChange={(textSize) => onSettings({ textSize })} />
        </Field>
      </div>

      {withCamera && touch && (
        <Field label="Câmera">
          <Segmented label="Câmera" value={settings.facing} options={FACINGS} onChange={(facing) => onSettings({ facing })} />
        </Field>
      )}

      {withCamera && !touch && (
        <div className="field-row">
          <DeviceSelect
            label="Câmera"
            fallback="Câmera"
            devices={devices.video}
            value={settings.videoDeviceId}
            onChange={(videoDeviceId) => onSettings({ videoDeviceId })}
          />
          <DeviceSelect
            label="Microfone"
            fallback="Microfone"
            devices={devices.audio}
            value={settings.audioDeviceId}
            onChange={(audioDeviceId) => onSettings({ audioDeviceId })}
          />
        </div>
      )}

      {recording && !withCamera && (
        <Toggle
          label="Contagem de 5s"
          hint="Dá tempo de apertar gravar no outro aparelho."
          checked={settings.longCountdown}
          onChange={(longCountdown) => onSettings({ longCountdown })}
        />
      )}

      <details className="advanced">
        <summary>
          <Icon name="chevron" size={14} />
          Avançado
        </summary>
        <Toggle
          label="Espelhar texto"
          hint="Para usar com vidro refletor."
          checked={settings.mirrorText}
          onChange={(mirrorText) => onSettings({ mirrorText })}
        />
        <Toggle
          label="Mostrar desvio na gravação"
          hint="Indicador “+1,2s” de quanto você está fora do roteiro."
          checked={settings.showDriftWhileRecording}
          onChange={(showDriftWhileRecording) => onSettings({ showDriftWhileRecording })}
        />
        <p className="muted advanced__note">
          Controle de selfie (botão de volume) não funciona no navegador. Use um passador de slides ou um teclado.
        </p>
      </details>
    </Sheet>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      <span className="eyebrow">{label}</span>
      {children}
      {hint && <p className="field__hint muted">{hint}</p>}
    </div>
  );
}

interface ToggleProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange(checked: boolean): void;
}

function Toggle({ label, hint, checked, onChange }: ToggleProps) {
  return (
    <label className="toggle">
      <span>
        {label}
        {hint && <small className="muted">{hint}</small>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

interface DeviceSelectProps {
  label: string;
  fallback: string;
  devices: readonly MediaDeviceInfo[];
  value: string | undefined;
  onChange(deviceId: string | undefined): void;
}

function DeviceSelect({ label, fallback, devices, value, onChange }: DeviceSelectProps) {
  return (
    <label className="field">
      <span className="eyebrow">{label}</span>
      <select className="select" value={value ?? ''} onChange={(event) => onChange(event.target.value || undefined)}>
        <option value="">Padrão do sistema</option>
        {devices
          .filter((device) => device.deviceId)
          .map((device, index) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `${fallback} ${index + 1}`}
            </option>
          ))}
      </select>
    </label>
  );
}
