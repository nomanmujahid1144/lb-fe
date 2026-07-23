'use client';

import { ThemeProvider, createTheme } from '@mui/material/styles';

// Create a theme instance
const theme = createTheme({
    palette: {
        mode: 'light',
    },
});

// NOTE: CssBaseline was removed intentionally. Tailwind's preflight (`@tailwind base`
// in globals.css) already provides the global CSS reset, so CssBaseline was redundant.
// It also injected an Emotion global <style> during SSR that did not match client
// hydration under React 19 / Next App Router, causing a hydration error. ThemeProvider
// is kept only to supply a theme to the @mui/x-charts BarChart on the statistics page.
export default function ClientThemeProvider({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider theme={theme}>
            {children}
        </ThemeProvider>
    );
}