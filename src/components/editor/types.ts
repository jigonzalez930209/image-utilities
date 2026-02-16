export type LayerType = 'image' | 'text';

export interface FilterState {
  brightness: number;
  contrast: number;
  saturate: number;
  hue: number;
  vibrance: number;
  temperature: number;
}

export interface Layer {
  id: string;
  type: LayerType;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  // Transform
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  // Content
  content: string; // URL for image, or text string
  // Text specific
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic';
  textShadow?: string;
  letterSpacing?: number;
  lineHeight?: number;
  textStrokeColor?: string;
  textStrokeWidth?: number;
  // Filter specific (applied per layer)
  filters?: FilterState;
}
