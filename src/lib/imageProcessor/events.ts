import type { ProgressStage } from './types';

interface ProgressDetail {
  id: string;
  key: string;
  percent: string;
  stage?: ProgressStage;
}

const emitProgress = (detail: ProgressDetail): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('image-process-progress', { detail }));
};

export const dispatchImageProgress = (
  id: string,
  key: string,
  percent: string,
  stage: ProgressStage
): void => {
  emitProgress({ id, key, percent, stage });
};

export const dispatchProcessStart = (id: string): void => {
  emitProgress({ id, key: 'process:start', percent: '0', stage: 'processing' });
};
