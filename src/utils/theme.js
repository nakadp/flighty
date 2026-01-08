export const THEME_COLORS = {
    cyan: {
        400: '#22d3ee',
        500: '#06b6d4',
        600: '#0891b2',
        900: '#164e63',
    },
    violet: {
        400: '#a78bfa',
        500: '#8b5cf6',
        600: '#7c3aed',
        900: '#4c1d95',
    },
    orange: {
        400: '#fb923c',
        500: '#f97316',
        600: '#ea580c',
        900: '#7c2d12',
    },
    emerald: {
        400: '#34d399',
        500: '#10b981',
        600: '#059669',
        900: '#064e3b',
    },
    rose: {
        400: '#fb7185',
        500: '#f43f5e',
        600: '#e11d48',
        900: '#881337',
    }
};

export const getThemeHex = (colorName, shade = 500) => {
    return THEME_COLORS[colorName]?.[shade] || THEME_COLORS['cyan'][shade];
};
