/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                gray: {
                    750: '#2d3748',
                    850: '#1a202c',
                    950: '#0d1117',
                },
                neon: {
                    blue: '#00f3ff',
                    purple: '#bc13fe',
                    cyan: '#00ffff'
                }
            },
            fontFamily: {
                sans: ['"Noto Sans KR"', 'sans-serif'],
                ai: ['"Orbitron"', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
