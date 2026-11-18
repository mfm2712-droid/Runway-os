export default {
  content: ['./index.html', './src/**/*.ts'],
  theme: { extend: {
    colors: { void: '#03040a', cyan: { neon: '#3ff8ff' }, uv: '#8a3dff', chrome: '#cfd8ff' },
    fontFamily: { display: ['"Unbounded"', 'system-ui', 'sans-serif'], mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'] },
  } },
};
