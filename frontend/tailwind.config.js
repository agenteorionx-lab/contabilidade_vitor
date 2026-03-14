import { mergeConfig } from 'vite';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#0f172a', /* slate-900 */
                card: '#1e293b', /* slate-800 */
                border: 'rgba(255, 255, 255, 0.08)',
                primary: '#3b82f6', /* Blue 500 */
                success: '#10b981', /* Green 500 */
                danger: '#ef4444', /* Red 500 */
                warning: '#f59e0b', /* Amber 500 */
            }
        },
    },
    plugins: [],
}
