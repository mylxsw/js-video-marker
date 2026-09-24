'use strict';
/* video-maker themes library.
   Provides standard visual themes and audio presets for different content genres.
   Can be used in browser global (Themes) and Node.js ESM.
*/

const THEME_PRESETS = {
  minimal_dark: {
    id: 'minimal_dark',
    name: '深邃知识探索 (Minimal Dark)',
    description: 'Notion / Linear 风格的高质感深色界面，沉静内敛，微光边框，适合哲学反思、个人成长与思维模型',
    font: {
      sans: '"PingFang SC", "Noto Sans CJK SC", -apple-system, sans-serif',
      mono: '"JetBrains Mono", "SF Mono", Menlo, monospace',
    },
    colors: {
      bg1: '#07090e',
      bg2: '#0d111a',
      bg3: '#121724',
      surface: 'rgba(18, 24, 38, 0.90)',
      surfaceHighlight: 'rgba(30, 41, 64, 0.95)',
      border: 'rgba(255, 255, 255, 0.12)',
      borderActive: 'rgba(96, 165, 250, 0.5)',
      primary: '#60a5fa',       // 柔和天蓝
      secondary: '#93c5fd',
      accent: '#34d399',        // 翡翠绿
      warning: '#f87171',       // 柔和珊瑚红
      gold: '#fbbf24',          // 暖金
      textPrimary: '#f8fafc',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      glow: 'rgba(96, 165, 250, 0.25)',
    },
    background: {
      type: 'dots',             // 'dots' | 'grid' | 'clean' | 'retro_grid' | 'blueprint'
      gridSize: 48,
      dotSize: 1.5,
      dotColor: 'rgba(148, 163, 184, 0.15)',
      particles: 28,
      particleColor: 'rgba(147, 197, 253, 0.20)',
      scanlines: false,
      vignette: true,
      vignetteStrength: 0.6,
    },
    ui: {
      hudStyle: 'pill',         // 'pill' | 'minimal' | 'retro' | 'none'
      subtitles: {
        bg: 'rgba(11, 15, 26, 0.88)',
        border: 'rgba(96, 165, 250, 0.25)',
        textColor: '#f8fafc',
        maxWidth: 1600,
        radius: 16,
      },
    },
    music: {
      genre: 'lofi',
      bpm: 82,
      mood: 'reflective',
    }
  },

  tech_blueprint: {
    id: 'tech_blueprint',
    name: '深蓝工程师蓝图 (Tech Blueprint)',
    description: '普鲁士深蓝底色、网格拓扑、发光节点连线与数据流，适合系统架构、编程实战与工程解析',
    font: {
      sans: '"PingFang SC", "Noto Sans CJK SC", -apple-system, sans-serif',
      mono: '"JetBrains Mono", Consolas, monospace',
    },
    colors: {
      bg1: '#050c1a',
      bg2: '#08142b',
      bg3: '#0b1d3d',
      surface: 'rgba(10, 24, 52, 0.92)',
      surfaceHighlight: 'rgba(16, 38, 80, 0.95)',
      border: 'rgba(56, 189, 248, 0.35)',
      borderActive: '#38bdf8',
      primary: '#38bdf8',       // 亮电青
      secondary: '#7dd3fc',
      accent: '#2dd4bf',        // 青绿
      warning: '#fb7185',       // 玫瑰红
      gold: '#facc15',
      textPrimary: '#f0f9ff',
      textSecondary: '#7dd3fc',
      textMuted: '#0284c7',
      glow: 'rgba(56, 189, 248, 0.40)',
    },
    background: {
      type: 'blueprint',
      gridSize: 64,
      gridColor: 'rgba(56, 189, 248, 0.12)',
      particles: 36,
      particleColor: 'rgba(56, 189, 248, 0.25)',
      scanlines: false,
      vignette: true,
      vignetteStrength: 0.5,
    },
    ui: {
      hudStyle: 'minimal',
      subtitles: {
        bg: 'rgba(4, 15, 36, 0.90)',
        border: 'rgba(56, 189, 248, 0.40)',
        textColor: '#f0f9ff',
        maxWidth: 1600,
        radius: 12,
      },
    },
    music: {
      genre: 'tech_pulse',
      bpm: 124,
      mood: 'focused',
    }
  },

  modern_business: {
    id: 'modern_business',
    name: '现代科技轻商务 (Modern Business)',
    description: '高级深灰、翡翠绿与紫金点缀、毛玻璃微透质感，适合商业财经、产品商业化与战略思维',
    font: {
      sans: '"PingFang SC", "Noto Sans CJK SC", -apple-system, sans-serif',
      mono: '"SF Mono", "JetBrains Mono", monospace',
    },
    colors: {
      bg1: '#09090b',
      bg2: '#121217',
      bg3: '#181822',
      surface: 'rgba(24, 24, 32, 0.90)',
      surfaceHighlight: 'rgba(38, 38, 52, 0.95)',
      border: 'rgba(255, 255, 255, 0.14)',
      borderActive: '#a855f7',
      primary: '#a855f7',       // 灵动紫
      secondary: '#c084fc',
      accent: '#10b981',        // 财富绿
      warning: '#f43f5e',
      gold: '#f59e0b',
      textPrimary: '#fafafa',
      textSecondary: '#a1a1aa',
      textMuted: '#71717a',
      glow: 'rgba(168, 85, 247, 0.30)',
    },
    background: {
      type: 'mesh',
      particles: 20,
      particleColor: 'rgba(168, 85, 247, 0.18)',
      scanlines: false,
      vignette: true,
      vignetteStrength: 0.65,
    },
    ui: {
      hudStyle: 'pill',
      subtitles: {
        bg: 'rgba(18, 18, 24, 0.88)',
        border: 'rgba(168, 85, 247, 0.25)',
        textColor: '#fafafa',
        maxWidth: 1620,
        radius: 18,
      },
    },
    music: {
      genre: 'ambient',
      bpm: 96,
      mood: 'confident',
    }
  },

  academic_paper: {
    id: 'academic_paper',
    name: '极简纸质 / 思考者白板 (Academic Paper)',
    description: '暖白沉稳低饱和纸面、墨黑线条、马克笔重点提亮与清晰框线，适合论文精读、数理逻辑与知识科普',
    font: {
      sans: '"PingFang SC", "Noto Sans CJK SC", -apple-system, sans-serif',
      mono: '"JetBrains Mono", Courier, monospace',
    },
    colors: {
      bg1: '#f8f9fa',
      bg2: '#edf0f4',
      bg3: '#e2e7ee',
      surface: 'rgba(255, 255, 255, 0.95)',
      surfaceHighlight: '#f1f5f9',
      border: 'rgba(15, 23, 42, 0.18)',
      borderActive: '#0f172a',
      primary: '#1e293b',       // 墨黑主色
      secondary: '#334155',
      accent: '#0284c7',        // 知识蓝
      warning: '#e11d48',       // 批注红
      gold: '#d97706',          // 荧光橙
      textPrimary: '#0f172a',   // 深黑文字
      textSecondary: '#475569',
      textMuted: '#94a3b8',
      glow: 'rgba(2, 132, 199, 0.15)',
    },
    background: {
      type: 'clean',
      particles: 0,
      scanlines: false,
      vignette: false,
    },
    ui: {
      hudStyle: 'minimal',
      subtitles: {
        bg: 'rgba(255, 255, 255, 0.96)',
        border: 'rgba(15, 23, 42, 0.25)',
        textColor: '#0f172a',
        maxWidth: 1600,
        radius: 14,
      },
    },
    music: {
      genre: 'minimal_piano',
      bpm: 88,
      mood: 'thoughtful',
    }
  },

  retro_rpg: {
    id: 'retro_rpg',
    name: '极客像素 / 8-Bit 冒险 (Retro RPG)',
    description: '深邃赛博网格、CRT 扫描线、金币经验槽与游戏勋章，适合游戏化成长、挑战突破与黑客精神',
    font: {
      sans: '"PingFang SC", "Noto Sans CJK SC", sans-serif',
      mono: '"JetBrains Mono", "SF Mono", monospace',
    },
    colors: {
      bg1: '#070a16',
      bg2: '#0b1024',
      bg3: '#0d1330',
      surface: 'rgba(13, 18, 36, 0.94)',
      surfaceHighlight: 'rgba(24, 32, 60, 0.95)',
      border: 'rgba(76, 201, 240, 0.35)',
      borderActive: '#4cc9f0',
      primary: '#4cc9f0',       // 赛博电青
      secondary: '#70d6ff',
      accent: '#3ddc84',        // 经验绿
      warning: '#ff4d6d',       // 危险红
      gold: '#ffd23f',          // 金币金
      textPrimary: '#ffffff',
      textSecondary: '#8fa3c8',
      textMuted: '#51658c',
      glow: '#4cc9f0',
    },
    background: {
      type: 'retro_grid',
      particles: 46,
      scanlines: true,
      vignette: true,
      vignetteStrength: 0.8,
    },
    ui: {
      hudStyle: 'retro',
      subtitles: {
        bg: 'rgba(4, 6, 14, 0.76)',
        border: 'rgba(76, 201, 240, 0.35)',
        textColor: '#eef4ff',
        maxWidth: 1620,
        radius: 18,
      },
    },
    music: {
      genre: 'chiptune',
      bpm: 132,
      mood: 'heroic',
    }
  }
};

/**
 * Resolve a theme by name string or custom object.
 * Returns a complete merged theme configuration.
 */
function resolveTheme(themeInput = 'minimal_dark') {
  if (typeof themeInput === 'string') {
    const preset = THEME_PRESETS[themeInput];
    if (preset) return JSON.parse(JSON.stringify(preset));
    console.warn(`[Themes] Unknown theme "${themeInput}", falling back to minimal_dark`);
    return JSON.parse(JSON.stringify(THEME_PRESETS.minimal_dark));
  }

  if (typeof themeInput === 'object' && themeInput !== null) {
    // Custom theme: merge with minimal_dark as fallback
    const base = JSON.parse(JSON.stringify(THEME_PRESETS[themeInput.extends || 'minimal_dark'] || THEME_PRESETS.minimal_dark));
    return {
      ...base,
      ...themeInput,
      colors: { ...base.colors, ...(themeInput.colors || {}) },
      background: { ...base.background, ...(themeInput.background || {}) },
      ui: { ...base.ui, ...(themeInput.ui || {}) },
      music: { ...base.music, ...(themeInput.music || {}) },
    };
  }

  return JSON.parse(JSON.stringify(THEME_PRESETS.minimal_dark));
}

// Universal export
const Themes = {
  PRESETS: THEME_PRESETS,
  resolve: resolveTheme,
};

if (typeof window !== 'undefined') {
  window.Themes = Themes;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Themes;
}
