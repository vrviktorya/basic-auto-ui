// modules/layoutStructure.js

function buildLayoutStructure(rawLayout) {
    if (!rawLayout || !rawLayout.sections) {
        return { sections: [], blocks: [] };
    }

    const sections = rawLayout.sections;
    const blocks = [];
    let currentContentBlock = null;

    const pushContent = () => {
        if (currentContentBlock && currentContentBlock.sections.length) {
            blocks.push(currentContentBlock);
        }
        currentContentBlock = null;
    };

    sections.forEach(sec => {
        const role = sec.role || 'content';
        const bgRole = sec.backgroundRole || 'bgNeutral';
        const hasGridClasses =
            (sec.className || '').includes('row') ||
            (sec.className || '').includes('col-') ||
            (sec.className || '').includes('card');

        // nav, hero, footer, contact – отдельные блоки
        if (role === 'nav') {
            pushContent();
            blocks.push(makeBlock('nav', sec));
            return;
        }
        if (role === 'hero') {
            pushContent();
            blocks.push(makeBlock('hero', sec));
            return;
        }
        if (role === 'footer') {
            pushContent();
            blocks.push(makeBlock('footer', sec));
            return;
        }
        if (role === 'contact') {
            pushContent();
            blocks.push(makeBlock('contact', sec));
            return;
        }

        // gridSection – карточная/строчная сетка
        if (role === 'gridSection' || hasGridClasses) {
            pushContent();
            const cols = sec.columns || 3;
            blocks.push({
                type: 'gridSection',
                mainSectionIndex: sec.index,
                backgroundRole: bgRole,
                columns: cols,
                paddingY: sec.paddingY,
                maxWidthPx: sec.maxWidthPx,
                sections: [sec]
            });
            return;
        }

        // strip – полоса с фоном, отличным от bgNeutral
        if (bgRole !== 'bgNeutral') {
            pushContent();
            blocks.push({
                type: 'strip',
                mainSectionIndex: sec.index,
                backgroundRole: bgRole,
                columns: sec.columns || 1,
                paddingY: sec.paddingY,
                maxWidthPx: sec.maxWidthPx,
                sections: [sec]
            });
            return;
        }

        // обычный контент – группируем
        if (!currentContentBlock) {
            currentContentBlock = {
                type: 'content',
                mainSectionIndex: sec.index,
                backgroundRole: 'bgNeutral',
                columns: sec.columns || 1,
                paddingY: sec.paddingY,
                maxWidthPx: sec.maxWidthPx,
                sections: [sec]
            };
        } else {
            currentContentBlock.sections.push(sec);
        }
    });

    pushContent();

    return {
        sections,
        blocks
    };
}

function makeBlock(type, sec) {
    return {
        type,
        mainSectionIndex: sec.index,
        backgroundRole: sec.backgroundRole || 'bgNeutral',
        columns: sec.columns || 1,
        paddingY: sec.paddingY,
        maxWidthPx: sec.maxWidthPx,
        sections: [sec]
    };
}

module.exports = {
    buildLayoutStructure
};
