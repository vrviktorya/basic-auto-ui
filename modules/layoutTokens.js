// modules/layoutTokens.js

function analyzeLayout(rawLayout) {
    if (!rawLayout || !rawLayout.sections || rawLayout.sections.length === 0) {
        return {
            container: { maxWidth: '1200px' },
            spacing: { sectionY: '4rem', sectionGap: '2rem', cardPadding: '2rem' },
            radius: { card: '8px', button: '6px' },
            shadow: {
                card: '0 4px 6px rgba(0,0,0,0.1)',
                soft: '0 2px 4px rgba(0,0,0,0.08)'
            },
            grid: {
                columnsDesktop: 3,
                columnsTablet: 2,
                columnsMobile: 1
            }
        };
    }

    const sections = rawLayout.sections;

    const containerMaxWidth = detectContainerMaxWidth(rawLayout);
    const sectionPaddingY = median(
        sections
            .map(s => s.paddingY)
            .filter(v => typeof v === 'number' && v > 0)
    ) || 64;

    const cardRadius = median(
        sections
            .flatMap(s => s.cardStyles?.map(c => c.borderRadius) || [])
            .filter(v => typeof v === 'number' && v > 0)
    ) || 8;

    const columnsDesktop = median(
        sections
            .flatMap(s => s.gridColumns || [])
            .filter(v => typeof v === 'number' && v > 0)
    ) || 3;

    const tokens = {
        container: {
            maxWidth: px(containerMaxWidth || 1200)
        },
        spacing: {
            sectionY: px(roundToNice(sectionPaddingY || 64)),
            sectionGap: '2rem',
            cardPadding: '2rem'
        },
        radius: {
            card: px(roundToNice(cardRadius || 8)),
            button: px(roundToNice(cardRadius || 6))
        },
        shadow: {
            card: '0 4px 6px rgba(0,0,0,0.1)',
            soft: '0 2px 4px rgba(0,0,0,0.08)'
        },
        grid: {
            columnsDesktop: Math.max(1, Math.min(4, Math.round(columnsDesktop))),
            columnsTablet: 2,
            columnsMobile: 1
        }
    };

    return tokens;
}

function detectContainerMaxWidth(rawLayout) {
    if (rawLayout.common && rawLayout.common.containerMaxWidthPx) {
        return rawLayout.common.containerMaxWidthPx;
    }
    const widths = rawLayout.sections
        .map(s => s.maxWidthPx)
        .filter(v => typeof v === 'number' && v > 0);
    if (widths.length === 0) return 1200;
    return median(widths);
}

function median(arr) {
    if (!arr || arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
}

function roundToNice(value) {
    if (!value) return 0;
    const step = 8; // 8px‑grid
    return Math.round(value / step) * step;
}

function px(value) {
    if (typeof value === 'string') return value;
    return `${Math.round(value)}px`;
}

module.exports = {
    analyzeLayout
};
