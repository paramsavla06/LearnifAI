/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // New Glassmorphism base
                'background-base': '#0A0A0A',
                'surface-elevation-1': '#141414',
                'primary-accent': '#FFD85F',
                'text-primary': '#FFFFFF',
                'text-secondary': '#A1A1AA',
                
                // Old colors for gradual migration safety
                bg:           '#1B1D24',
                card:         '#242730',
                muted:        '#2d3040',
                border:       'rgba(255,255,255,0.1)',
                accent:       '#FF0000',
                'accent-dim': 'rgba(255,0,0,0.12)',
                'accent-glow':'rgba(255,0,0,0.25)',
                fg:           '#FFFFFF',
                'fg-muted':   '#9BA1B0',
                'fg-dim':     '#4a4f5e',
                primary:      '#1B1D24',
                surface:      '#242730',
                'surface-2':  '#2d3040',
                'text-muted': '#9BA1B0',
                'text-dim':   '#4a4f5e',
                'border-subtle': 'rgba(255,255,255,0.08)',
                'border-accent': 'rgba(255,0,0,0.3)',
                neon:         '#FF0000',
                'neon-dim':   'rgba(255,0,0,0.12)',
                'neon-glow':  'rgba(255,0,0,0.25)',
                magenta:      '#ff6b6b',
                cyan:         '#9BA1B0',
                danger:       '#ff3366',
                gold:         '#f59e0b',
                success:      '#22c55e',
                teal:         '#9BA1B0',
            },
            borderRadius: {
                'card': '32px',
                'button': '999px',
            },
            fontFamily: {
                display: ['"Orbitron"', '"Share Tech Mono"', 'monospace'],
                mono:    ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
                sans:    ['Inter', 'system-ui', 'sans-serif'],
            },
            animation: {
                'blink':       'blink 1s step-end infinite',
                'glitch':      'glitch 4s ease-in-out infinite',
                'float':       'float 5s ease-in-out infinite',
                'float-slow':  'float-slow 8s ease-in-out infinite',
                'float-medium':'float-medium 6s ease-in-out infinite',
                'float-fast':  'float-fast 4s ease-in-out infinite',
                'marquee':     'marquee 30s linear infinite',
                'cuboid-rotate':'cuboid-rotate 20s infinite linear'
            },
            keyframes: {
                blink: {
                    '50%': { opacity: '0' },
                },
                glitch: {
                    '0%, 90%, 100%': { transform: 'translate(0)', filter: 'none' },
                    '93%': { transform: 'translate(-2px, 2px)', filter: 'hue-rotate(30deg)' },
                    '95%': { transform: 'translate(2px, -1px)' },
                    '97%': { opacity: '0.8' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%':      { transform: 'translateY(-10px)' },
                },
                'float-slow': {
                  '0%, 100%': { transform: 'translateY(0px) rotateX(30deg) rotateZ(-15deg)' },
                  '50%': { transform: 'translateY(-20px) rotateX(28deg) rotateZ(-12deg)' }
                },
                'float-medium': {
                  '0%, 100%': { transform: 'translateY(0px) rotateX(30deg) rotateZ(-15deg)' },
                  '50%': { transform: 'translateY(-15px) rotateX(32deg) rotateZ(-18deg)' }
                },
                'float-fast': {
                  '0%, 100%': { transform: 'translateY(0px) rotateX(30deg) rotateZ(-15deg)' },
                  '50%': { transform: 'translateY(-10px) rotateX(30deg) rotateZ(-15deg)' }
                },
                'cuboid-rotate': {
                  'from': { transform: 'rotateX(0deg) rotateY(0deg)' },
                  'to': { transform: 'rotateX(360deg) rotateY(360deg)' }
                },
                marquee: {
                    '0%':   { transform: 'translateX(0%)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
            },
            boxShadow: {
                'neon':     '0 0 5px #FF0000, 0 0 10px rgba(255,0,0,0.4)',
                'neon-lg':  '0 8px 32px rgba(255,0,0,0.25)',
                'neon-sm':  '0 0 3px rgba(255,0,0,0.5)',
                'glass':    '0 4px 24px rgba(0,0,0,0.3)',
                'glass-lg': '0 8px 48px rgba(0,0,0,0.4)',
            },
        },
    },
    plugins: [],
}
