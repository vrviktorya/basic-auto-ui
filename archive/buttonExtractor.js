// modules/components/buttonExtractor.js
function safeParsePx(value) {
    if (!value) return null;
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  
  function normColor(value) {
    if (!value) return null;
    const v = value.trim().toLowerCase();
    if (v === "transparent" || v === "rgba(0, 0, 0, 0)") return null;
    return value;
  }
  
  function keyOfPattern(p) {
    // Грубый ключ (можно расширять)
    return [
      p.bgColor,
      p.textColor,
      p.borderColor,
      p.borderWidth,
      p.borderRadius,
      p.fontFamily,
      p.fontSize,
      p.fontWeight,
      p.paddingY,
      p.height,
      p.boxShadow
    ].join("|");
  }
  
  async function extractButtonPatterns(page, { maxSamples = 80 } = {}) {
    return await page.evaluate(({ maxSamples }) => {
      const candidates = Array.from(
        document.querySelectorAll("button, a, input[type='button'], input[type='submit'], [role='button']")
      );
  
      const patterns = [];
      for (const el of candidates) {
        try {
          const cs = window.getComputedStyle(el);
  
          // Фильтр: должен быть кликабельный и видимый
          const rect = el.getBoundingClientRect();
          if (rect.width < 40 || rect.height < 24) continue;
          if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity || "1") < 0.1) continue;
  
          const hasIcon =
            !!el.querySelector("svg, img, i, [class*='icon'], [class*='fa'], [class*='material']") ||
            (cs.fontFamily || "").toLowerCase().includes("material") ||
            (el.className || "").toLowerCase().includes("icon");
  
          const p = {
            tag: el.tagName.toLowerCase(),
            classes: (el.className || "").toString().split(/\s+/).filter(Boolean).slice(0, 8),
            bgColor: cs.backgroundColor,
            textColor: cs.color,
            borderColor: cs.borderColor,
            borderWidth: cs.borderTopWidth,
            borderStyle: cs.borderTopStyle,
            borderRadius: cs.borderRadius,
            fontFamily: (cs.fontFamily || "").split(",")[0].replace(/['"]/g, "").trim(),
            fontSize: cs.fontSize,
            fontWeight: cs.fontWeight,
            letterSpacing: cs.letterSpacing,
            textTransform: cs.textTransform,
            lineHeight: cs.lineHeight,
            paddingTop: cs.paddingTop,
            paddingRight: cs.paddingRight,
            paddingBottom: cs.paddingBottom,
            paddingLeft: cs.paddingLeft,
            height: cs.height,
            minHeight: cs.minHeight,
            boxShadow: cs.boxShadow,
            hasIcon
          };
  
          patterns.push(p);
          if (patterns.length >= maxSamples) break;
        } catch (e) {}
      }
  
      return patterns;
    }, { maxSamples });
  }
  
  function aggregateButtonPatterns(rawPatterns) {
    // Группируем по ключу и считаем частоты
    const map = new Map();
    for (const p of rawPatterns || []) {
      const norm = {
        ...p,
        bgColor: normColor(p.bgColor),
        textColor: normColor(p.textColor),
        borderColor: normColor(p.borderColor)
      };
  
      const key = keyOfPattern(norm);
      const item = map.get(key) || { ...norm, count: 0 };
      item.count += 1;
      map.set(key, item);
    }
  
    const patterns = Array.from(map.values()).sort((a, b) => b.count - a.count);
  
    // Попытка выбрать "главную" кнопку (primary): цветная заливка + контрастный текст
    const primary =
      patterns.find(p => p.bgColor && p.bgColor !== "rgb(255, 255, 255)" && p.bgColor !== "rgba(0, 0, 0, 0)") ||
      patterns[0] ||
      null;
  
    // Вторичная (outline/ghost): прозрачный фон, есть border
    const secondary =
      patterns.find(p => (!p.bgColor || p.bgColor === "rgba(0, 0, 0, 0)") && p.borderWidth && p.borderWidth !== "0px") ||
      patterns[1] ||
      null;
  
    return {
      totalSamples: (rawPatterns || []).length,
      uniquePatterns: patterns.length,
      primary,
      secondary,
      patterns: patterns.slice(0, 12)
    };
  }
  
  module.exports = {
    extractButtonPatterns,
    aggregateButtonPatterns
  };
  