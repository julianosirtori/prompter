import type { CameraErrorKind } from '../../media/camera';
import { isIOS } from '../../media/device';

/** What to tell the user for each way the camera can fail (spec 5.3). */
export const cameraErrorText = (kind: CameraErrorKind): string => {
  switch (kind) {
    case 'denied':
      return isIOS()
        ? 'Câmera bloqueada. Vá em Ajustes > Safari > Câmera e escolha Permitir. Depois recarregue.'
        : 'Câmera bloqueada. Clique no cadeado ao lado do endereço e libere câmera e microfone.';
    case 'in-use':
      return 'A câmera está sendo usada por outro app. Feche-o e tente de novo.';
    case 'unsupported':
      return 'Este navegador não dá acesso à câmera. Use só como prompter.';
    case 'not-found':
    case 'unknown':
      return 'Não encontrei uma câmera para gravar. Conecte uma e tente de novo.';
  }
};

export const CAMERA_PERMISSION_TEXT = 'Preciso da câmera e do microfone para gravar. O vídeo fica só no seu aparelho.';
