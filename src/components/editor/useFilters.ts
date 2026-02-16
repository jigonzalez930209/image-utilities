import { useState, useCallback } from 'react';

export interface FilterState {
  brightness: number;
  contrast: number;
  saturate: number;
  hue: number;
  vibrance: number;
  temperature: number;
}

export type FilterPreset = 'none' | 'sepia' | 'bw' | 'vintage' | 'blur' | 'sharpen' | 'glow';

export const DEFAULT_FILTERS: FilterState = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hue: 0,
  vibrance: 100,
  temperature: 0,
};

export const getFilterString = (filters: FilterState) => {
  const { brightness, contrast, saturate, hue, vibrance, temperature } = filters;
  let filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) hue-rotate(${hue}deg)`;

  // Vibrance approximation using saturation adjustment
  if (vibrance !== 100) {
    const vibranceFactor = vibrance / 100;
    filter += ` saturate(${100 + (saturate - 100) * (vibranceFactor - 1)}%)`;
  }

  // Temperature approximation using hue and saturation
  if (temperature !== 0) {
    const tempHue = temperature > 0 ? Math.min(temperature * 0.5, 30) : Math.max(temperature * 0.5, -30);
    const tempSat = temperature > 0 ? Math.max(saturate * (1 + temperature * 0.005), 100) : saturate;
    filter += ` hue-rotate(${tempHue}deg) saturate(${tempSat}%)`;
  }

  return filter;
};

const FILTER_PRESETS: Record<FilterPreset, Partial<FilterState>> = {
  none: {},
  sepia: { saturate: 80, hue: 30, contrast: 110 },
  bw: { saturate: 0, contrast: 110 },
  vintage: { saturate: 120, contrast: 105, hue: 10 },
  blur: {}, // Applied via CSS
  sharpen: { contrast: 120 },
  glow: { brightness: 105, saturate: 110 },
};

export const useFilters = () => {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [activePreset, setActivePreset] = useState<FilterPreset>('none');

  const updateFilter = useCallback((key: keyof FilterState, value: number) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setActivePreset('none'); // Reset preset when manually adjusting
  }, []);

  const applyPreset = useCallback((preset: FilterPreset) => {
    setFilters(prev => ({ ...prev, ...FILTER_PRESETS[preset] }));
    setActivePreset(preset);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setActivePreset('none');
  }, []);

  const getFilterStringValue = useCallback(() => {
    return getFilterString(filters);
  }, [filters]);

  return {
    filters,
    activePreset,
    updateFilter,
    applyPreset,
    resetFilters,
    getFilterString: getFilterStringValue,
    FILTER_PRESETS: Object.keys(FILTER_PRESETS) as FilterPreset[],
  };
};

export { FILTER_PRESETS };
