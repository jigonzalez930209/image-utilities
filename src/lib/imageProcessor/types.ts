import { type ImageFormat, type OutputFormat } from '../formats';

export type { ImageFormat, OutputFormat };

export type BackgroundModel = 'isnet_quint8' | 'isnet_fp16' | 'rmbg_14';
export type FastBackgroundModel = 'isnet_quint8' | 'isnet_fp16';
export type ProgressStage = 'loading' | 'processing';

export interface ProcessOptions {
  format?: OutputFormat;
  removeBackground?: boolean;
  bgModel?: BackgroundModel;
  quality?: number;
  stripMetadata?: boolean;
}
