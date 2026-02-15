import { type ImageFormat } from '../formats';

export type { ImageFormat };

export type BackgroundModel = 'isnet' | 'isnet_fp16' | 'isnet_quint8' | 'rmbg_14';
export type FastBackgroundModel = Exclude<BackgroundModel, 'rmbg_14'>;
export type ProgressStage = 'loading' | 'processing';

export interface ProcessOptions {
  format?: ImageFormat;
  removeBackground?: boolean;
  bgModel?: BackgroundModel;
  quality?: number;
}
