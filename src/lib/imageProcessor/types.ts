import { type ImageFormat, type OutputFormat } from '../formats';

export type { ImageFormat, OutputFormat };

export type BackgroundModel = 'isnet' | 'isnet_fp16' | 'isnet_quint8' | 'rmbg_14';
export type FastBackgroundModel = Exclude<BackgroundModel, 'rmbg_14'>;
export type ProgressStage = 'loading' | 'processing';

export interface ProcessOptions {
  format?: OutputFormat;
  removeBackground?: boolean;
  bgModel?: BackgroundModel;
  quality?: number;
  stripMetadata?: boolean;
}
