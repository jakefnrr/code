// Theme definitions for the IDE. Each theme sets CSS variables on :root.
// applyTheme(name) writes the variables and toggles a body class for special effects.

export const THEMES = [
  {
    id: 'neon-green', label: 'Neon Green', swatch: ['#00ff9c', '#05080a'],
    vars: {
      '--ide-bg': '#05080a', '--ide-bg-grad': '#02050a', '--ide-panel': '#0a1410',
      '--ide-panel-2': '#0d1a14', '--ide-border': '#1f3a2a', '--ide-accent': '#00ff9c',
      '--ide-accent-2': '#00cc7a', '--ide-text': '#d6ffe8', '--ide-text-dim': '#5a8a72',
      '--ide-glow': 'rgba(0,255,156,0.45)', '--ide-editor-bg': '#040b08',
      '--ide-editor-active': 'rgba(0,255,156,0.06)', '--ide-terminal-bg': '#020604',
      '--ide-selection': 'rgba(0,255,156,0.25)'
    }
  },
  {
    id: 'classic', label: 'Classic Gray', swatch: ['#8a8a92', '#0d0d0f'],
    vars: {
      '--ide-bg': '#0d0d0f', '--ide-bg-grad': '#08080a', '--ide-panel': '#15151a',
      '--ide-panel-2': '#1a1a20', '--ide-border': '#2a2a30', '--ide-accent': '#c8c8d0',
      '--ide-accent-2': '#8a8a92', '--ide-text': '#e6e6e9', '--ide-text-dim': '#7a7a82',
      '--ide-glow': 'rgba(200,200,208,0.12)', '--ide-editor-bg': '#0a0a0c',
      '--ide-editor-active': 'rgba(255,255,255,0.04)', '--ide-terminal-bg': '#070709',
      '--ide-selection': 'rgba(200,200,208,0.2)'
    }
  },
  {
    id: 'cyberpunk', label: 'Cyberpunk', swatch: ['#ff2bd6', '#00f0ff'],
    vars: {
      '--ide-bg': '#0a0414', '--ide-bg-grad': '#06020c', '--ide-panel': '#14081f',
      '--ide-panel-2': '#1a0a2a', '--ide-border': '#3a1466', '--ide-accent': '#ff2bd6',
      '--ide-accent-2': '#00f0ff', '--ide-text': '#ffe6fb', '--ide-text-dim': '#9a5ac8',
      '--ide-glow': 'rgba(255,43,214,0.5)', '--ide-editor-bg': '#08030f',
      '--ide-editor-active': 'rgba(255,43,214,0.07)', '--ide-terminal-bg': '#050208',
      '--ide-selection': 'rgba(0,240,255,0.25)'
    }
  },
  {
    id: 'electric-blue', label: 'Electric Blue', swatch: ['#00b4ff', '#02060f'],
    vars: {
      '--ide-bg': '#02060f', '--ide-bg-grad': '#01030a', '--ide-panel': '#06101f',
      '--ide-panel-2': '#0a1828', '--ide-border': '#123050', '--ide-accent': '#00b4ff',
      '--ide-accent-2': '#0078d4', '--ide-text': '#d6ecff', '--ide-text-dim': '#5a8ab0',
      '--ide-glow': 'rgba(0,180,255,0.45)', '--ide-editor-bg': '#040a14',
      '--ide-editor-active': 'rgba(0,180,255,0.06)', '--ide-terminal-bg': '#01060e',
      '--ide-selection': 'rgba(0,180,255,0.25)'
    }
  },
  {
    id: 'purple', label: 'Purple', swatch: ['#a855f7', '#0a0614'],
    vars: {
      '--ide-bg': '#0a0614', '--ide-bg-grad': '#06030d', '--ide-panel': '#140a1f',
      '--ide-panel-2': '#1a0f2a', '--ide-border': '#3a1f66', '--ide-accent': '#a855f7',
      '--ide-accent-2': '#c084fc', '--ide-text': '#f0e6ff', '--ide-text-dim': '#9a7ac8',
      '--ide-glow': 'rgba(168,85,247,0.5)', '--ide-editor-bg': '#08040f',
      '--ide-editor-active': 'rgba(168,85,247,0.07)', '--ide-terminal-bg': '#050208',
      '--ide-selection': 'rgba(168,85,247,0.25)'
    }
  },
  {
    id: 'sunset', label: 'Sunset', swatch: ['#ff7a3c', '#ff3c6e'],
    vars: {
      '--ide-bg': '#140a08', '--ide-bg-grad': '#0c0404', '--ide-panel': '#1f120f',
      '--ide-panel-2': '#2a1814', '--ide-border': '#5a2a1a', '--ide-accent': '#ff7a3c',
      '--ide-accent-2': '#ff3c6e', '--ide-text': '#ffe6d6', '--ide-text-dim': '#c89a7a',
      '--ide-glow': 'rgba(255,122,60,0.45)', '--ide-editor-bg': '#100604',
      '--ide-editor-active': 'rgba(255,122,60,0.06)', '--ide-terminal-bg': '#0a0402',
      '--ide-selection': 'rgba(255,122,60,0.25)'
    }
  },
  {
    id: 'toxic', label: 'Toxic', swatch: ['#b4ff00', '#0a0f00'],
    vars: {
      '--ide-bg': '#0a0f00', '--ide-bg-grad': '#060a00', '--ide-panel': '#141a05',
      '--ide-panel-2': '#1a2208', '--ide-border': '#3a5a1a', '--ide-accent': '#b4ff00',
      '--ide-accent-2': '#88cc00', '--ide-text': '#e8ffcc', '--ide-text-dim': '#8aa85a',
      '--ide-glow': 'rgba(180,255,0,0.45)', '--ide-editor-bg': '#080d00',
      '--ide-editor-active': 'rgba(180,255,0,0.06)', '--ide-terminal-bg': '#050800',
      '--ide-selection': 'rgba(180,255,0,0.25)'
    }
  },
  {
    id: 'ocean', label: 'Ocean', swatch: ['#00d4c8', '#020f14'],
    vars: {
      '--ide-bg': '#020f14', '--ide-bg-grad': '#010a0e', '--ide-panel': '#061a1f',
      '--ide-panel-2': '#0a242a', '--ide-border': '#123a40', '--ide-accent': '#00d4c8',
      '--ide-accent-2': '#00a8a0', '--ide-text': '#d6f5f0', '--ide-text-dim': '#5aa8a0',
      '--ide-glow': 'rgba(0,212,200,0.45)', '--ide-editor-bg': '#040f14',
      '--ide-editor-active': 'rgba(0,212,200,0.06)', '--ide-terminal-bg': '#010a0e',
      '--ide-selection': 'rgba(0,212,200,0.25)'
    }
  },
  {
    id: 'midnight', label: 'Midnight', swatch: ['#5a7aff', '#060810'],
    vars: {
      '--ide-bg': '#060810', '--ide-bg-grad': '#04050c', '--ide-panel': '#0c1020',
      '--ide-panel-2': '#11142a', '--ide-border': '#1a2540', '--ide-accent': '#5a7aff',
      '--ide-accent-2': '#8aa4ff', '--ide-text': '#d6e0ff', '--ide-text-dim': '#6a7aaa',
      '--ide-glow': 'rgba(90,122,255,0.4)', '--ide-editor-bg': '#080a14',
      '--ide-editor-active': 'rgba(90,122,255,0.06)', '--ide-terminal-bg': '#04060e',
      '--ide-selection': 'rgba(90,122,255,0.25)'
    }
  },
  {
    id: 'rgb', label: 'RGB', swatch: ['#ff0080', '#00ff80'],
    vars: {
      '--ide-bg': '#04040a', '--ide-bg-grad': '#02020a', '--ide-panel': '#0a0a18',
      '--ide-panel-2': '#101028', '--ide-border': '#2a2a4a', '--ide-accent': '#ff0080',
      '--ide-accent-2': '#00ff80', '--ide-text': '#f0f0ff', '--ide-text-dim': '#8a8aaa',
      '--ide-glow': 'rgba(255,0,128,0.5)', '--ide-editor-bg': '#06060f',
      '--ide-editor-active': 'rgba(255,255,255,0.04)', '--ide-terminal-bg': '#03030a',
      '--ide-selection': 'rgba(255,0,128,0.25)'
    },
    effect: 'rgb'
  },
  {
    id: 'lava', label: 'Lava', swatch: ['#ff3c1a', '#100404'],
    vars: {
      '--ide-bg': '#100404', '--ide-bg-grad': '#0a0202', '--ide-panel': '#1a0808',
      '--ide-panel-2': '#240c0c', '--ide-border': '#4a1a14', '--ide-accent': '#ff3c1a',
      '--ide-accent-2': '#ff7a3c', '--ide-text': '#ffe0d6', '--ide-text-dim': '#c87a5a',
      '--ide-glow': 'rgba(255,60,26,0.5)', '--ide-editor-bg': '#0c0303',
      '--ide-editor-active': 'rgba(255,60,26,0.06)', '--ide-terminal-bg': '#080202',
      '--ide-selection': 'rgba(255,60,26,0.25)'
    }
  },
  {
    id: 'ice', label: 'Ice', swatch: ['#9ce6ff', '#060f14'],
    vars: {
      '--ide-bg': '#060f14', '--ide-bg-grad': '#040a0e', '--ide-panel': '#0c1a1f',
      '--ide-panel-2': '#10242a', '--ide-border': '#1a3a45', '--ide-accent': '#9ce6ff',
      '--ide-accent-2': '#c8f0ff', '--ide-text': '#e6f7ff', '--ide-text-dim': '#7aa8b8',
      '--ide-glow': 'rgba(156,230,255,0.4)', '--ide-editor-bg': '#080f14',
      '--ide-editor-active': 'rgba(156,230,255,0.06)', '--ide-terminal-bg': '#040c10',
      '--ide-selection': 'rgba(156,230,255,0.25)'
    }
  }
];

export function applyTheme(id) {
  const theme = THEMES.find(t => t.id === id) || THEMES[0];
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  document.body.classList.toggle('ide-theme-rgb', theme.effect === 'rgb');
}