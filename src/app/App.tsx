import { PasteScreen } from '../features/paste/PasteScreen';
import { PrompterScreen } from '../features/prompter/PrompterScreen';
import { ReviewScreen } from '../features/review/ReviewScreen';
import { TakeScreen } from '../features/takes/TakeScreen';
import { Button } from '../ui/Button';
import { navigate, routeToHash, useRoute } from './router';
import { useScripts } from './useScripts';
import { useSettings } from './useSettings';

export default function App() {
  const route = useRoute();
  const store = useScripts();
  const [settings, updateSettings] = useSettings();

  if (route.name === 'home') {
    return <PasteScreen scripts={store.scripts} onCreate={store.save} onDelete={store.remove} />;
  }

  const script = store.find(route.scriptId);
  if (!script) {
    return (
      <main className="screen screen--center">
        <h1 className="title">Roteiro não encontrado</h1>
        <p className="muted">Ele pode ter sido apagado ou estar em outro aparelho.</p>
        <Button variant="primary" onClick={() => navigate({ name: 'home' })}>
          Colar roteiro
        </Button>
      </main>
    );
  }

  switch (route.name) {
    case 'review':
      return <ReviewScreen script={script} settings={settings} onSettings={updateSettings} onChange={store.save} />;
    case 'session':
      return (
        <PrompterScreen
          key={routeToHash(route)}
          script={script}
          kind={route.kind}
          range={route.range}
          settings={settings}
          onSettings={updateSettings}
          onSaveScript={store.save}
        />
      );
    case 'takes':
      return <TakeScreen script={script} takeId={route.takeId} onSaveScript={store.save} />;
  }
}
