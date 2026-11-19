// AURIX - Multi-Theme Financial Aesthetic Engine
import type { ThemeId } from '../types';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  tagline: string;
  accent: string;
  accentSecondary: string;
  bgPrimary: string;
  bgSecondary: string;
  card: string;
  cardElevated: string;
  border: string;
  textPrimary: string;
  textMuted: string;
  success: string;
  error: string;
  glowColor: string;
  previewColors: string[]; // For visual swatch grid in profile
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'slate_minimal',
    name: 'Monochrome State',
    tagline: 'Default pure minimalist stealth black with crisp platinum',
    accent: '#F8FAFC',
    accentSecondary: '#CBD5E1',
    bgPrimary: '#08090A',
    bgSecondary: '#111317',
    card: '#191C22',
    cardElevated: '#22262E',
    border: '#313744',
    textPrimary: '#FFFFFF',
    textMuted: '#94A3B8',
    success: '#4ADE80',
    error: '#F87171',
    glowColor: 'rgba(248, 250, 252, 0.22)',
    previewColors: ['#08090A', '#191C22', '#F8FAFC', '#4ADE80'],
  },
  {
    id: 'neon_lime',
    name: 'Neon Lime',
    tagline: 'Signature high-contrast dark fintech',
    accent: '#E7FF32',
    accentSecondary: '#C9E927',
    bgPrimary: '#090B08',
    bgSecondary: '#151812',
    card: '#1C2019',
    cardElevated: '#23281F',
    border: '#30352B',
    textPrimary: '#FFFFFF',
    textMuted: '#A1A69A',
    success: '#A8E66A',
    error: '#FF6868',
    glowColor: 'rgba(231, 255, 50, 0.28)',
    previewColors: ['#090B08', '#1C2019', '#E7FF32', '#A8E66A'],
  },
  {
    id: 'midnight_blue',
    name: 'Midnight Ocean',
    tagline: 'Deep abyssal navy with electric cyan',
    accent: '#38BDF8',
    accentSecondary: '#0284C7',
    bgPrimary: '#030712',
    bgSecondary: '#0B132B',
    card: '#0F1A36',
    cardElevated: '#16254A',
    border: '#1E325C',
    textPrimary: '#FFFFFF',
    textMuted: '#94A3B8',
    success: '#34D399',
    error: '#F87171',
    glowColor: 'rgba(56, 189, 248, 0.28)',
    previewColors: ['#030712', '#0F1A36', '#38BDF8', '#34D399'],
  },
  {
    id: 'cyber_purple',
    name: 'Cyberpunk Violet',
    tagline: 'Deep space obsidian with vivid amethyst neon',
    accent: '#C084FC',
    accentSecondary: '#A855F7',
    bgPrimary: '#090414',
    bgSecondary: '#140929',
    card: '#1E0E3D',
    cardElevated: '#2B1554',
    border: '#3B1F6E',
    textPrimary: '#FFFFFF',
    textMuted: '#B8A3D8',
    success: '#4ADE80',
    error: '#FB7185',
    glowColor: 'rgba(192, 132, 252, 0.28)',
    previewColors: ['#090414', '#1E0E3D', '#C084FC', '#4ADE80'],
  },
  {
    id: 'emerald_wealth',
    name: 'Emerald Obsidian',
    tagline: 'Rich forest blacks with luminous jade radiance',
    accent: '#10B981',
    accentSecondary: '#059669',
    bgPrimary: '#030D08',
    bgSecondary: '#091C12',
    card: '#0E291B',
    cardElevated: '#153B27',
    border: '#1F4D35',
    textPrimary: '#FFFFFF',
    textMuted: '#8EB8A1',
    success: '#34D399',
    error: '#F87171',
    glowColor: 'rgba(16, 185, 129, 0.28)',
    previewColors: ['#030D08', '#0E291B', '#10B981', '#34D399'],
  },
  {
    id: 'solar_amber',
    name: 'Solar Sunset',
    tagline: 'Warm espresso charcoal with molten 24K gold',
    accent: '#F59E0B',
    accentSecondary: '#D97706',
    bgPrimary: '#0C0803',
    bgSecondary: '#1A1208',
    card: '#261B0D',
    cardElevated: '#362714',
    border: '#4D381E',
    textPrimary: '#FFFFFF',
    textMuted: '#C5B194',
    success: '#10B981',
    error: '#EF4444',
    glowColor: 'rgba(245, 158, 11, 0.28)',
    previewColors: ['#0C0803', '#261B0D', '#F59E0B', '#10B981'],
  },
  {
    id: 'crimson_noir',
    name: 'Crimson Phantom',
    tagline: 'Gothic black slate with high-voltage ruby neon',
    accent: '#F43F5E',
    accentSecondary: '#E11D48',
    bgPrimary: '#0D0306',
    bgSecondary: '#1A070E',
    card: '#290D18',
    cardElevated: '#3B1423',
    border: '#541F33',
    textPrimary: '#FFFFFF',
    textMuted: '#C29AA7',
    success: '#10B981',
    error: '#FF6868',
    glowColor: 'rgba(244, 63, 94, 0.28)',
    previewColors: ['#0D0306', '#290D18', '#F43F5E', '#10B981'],
  },
  {
    id: 'nordic_frost',
    name: 'Nordic Frost',
    tagline: 'Sub-zero glacier slate with arctic cyan flare',
    accent: '#2DD4BF',
    accentSecondary: '#14B8A6',
    bgPrimary: '#040C0F',
    bgSecondary: '#08171C',
    card: '#0D242C',
    cardElevated: '#13333E',
    border: '#1B4754',
    textPrimary: '#FFFFFF',
    textMuted: '#88AEB8',
    success: '#34D399',
    error: '#F87171',
    glowColor: 'rgba(45, 212, 191, 0.28)',
    previewColors: ['#040C0F', '#0D242C', '#2DD4BF', '#34D399'],
  },
];

export function normalizeThemeId(themeId?: string): ThemeId {
  if (!themeId || themeId === 'dark') return 'slate_minimal';
  const found = THEMES.find((t) => t.id === themeId);
  return found ? found.id : 'slate_minimal';
}

export function getThemeConfig(themeId?: string): ThemeConfig {
  const normalized = normalizeThemeId(themeId);
  return THEMES.find((t) => t.id === normalized) || THEMES[0];
}

export function applyThemeToDocument(themeId?: string): void {
  const normalized = normalizeThemeId(themeId);
  const config = getThemeConfig(normalized);

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', normalized);
    document.documentElement.style.setProperty('--bg-primary', config.bgPrimary);
    document.documentElement.style.setProperty('--bg-secondary', config.bgSecondary);
    document.documentElement.style.setProperty('--bg-card', config.card);
    document.documentElement.style.setProperty('--bg-card-elevated', config.cardElevated);
    document.documentElement.style.setProperty('--accent-neon', config.accent);
    document.documentElement.style.setProperty('--accent-subtle', config.accentSecondary);
    document.documentElement.style.setProperty('--text-main', config.textPrimary);
    document.documentElement.style.setProperty('--text-muted', config.textMuted);
    document.documentElement.style.setProperty('--border-line', config.border);
    document.documentElement.style.setProperty('--status-success', config.success);
    document.documentElement.style.setProperty('--status-error', config.error);
    document.documentElement.style.setProperty('--theme-glow', config.glowColor);
  }
}

