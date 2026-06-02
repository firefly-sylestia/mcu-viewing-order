export const clampTenPoint = (value) => Math.max(0, Math.min(10, Number.isFinite(value) ? value : 0));

export const drawWrappedText = (ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) => {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  });
  if (line) lines.push(line);
  const renderLines = lines.slice(0, Math.max(1, maxLines));
  if (lines.length > maxLines) {
    const lastIndex = renderLines.length - 1;
    renderLines[lastIndex] = `${renderLines[lastIndex].replace(/[\s.]+$/, '')}…`;
  }
  renderLines.forEach((ln, idx) => ctx.fillText(ln, x, y + (idx * lineHeight)));
};

export const drawPremiumStars = (ctx, { x, y, size = 38, gap = 12, rating10 = 0, active = '#ffd35c', inactive = 'rgba(255,255,255,0.22)', fontFamily = 'Inter, sans-serif' }) => {
  const ratio = clampTenPoint(rating10) / 10;
  const starValue = ratio * 5;
  ctx.font = `700 ${size}px ${fontFamily}`;
  for (let i = 0; i < 5; i += 1) {
    const sx = x + i * (size + gap);
    ctx.fillStyle = inactive;
    ctx.fillText('★', sx, y);
    const fill = Math.max(0, Math.min(1, starValue - i));
    if (fill > 0) {
      const w = size * fill;
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx, y - size, w, size + 8);
      ctx.clip();
      ctx.fillStyle = active;
      ctx.fillText('★', sx, y);
      ctx.restore();
    }
  }
};

export const loadPosterWithFallback = async ({ primarySrc, fallbackText = 'Poster unavailable', width = 220, height = 330 }) => {
  const src = primarySrc || `https://placehold.co/${width}x${height}/1a1f33/f7c4de?text=${encodeURIComponent(fallbackText)}`;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
};

export const fillGradientBackground = (ctx, canvas, stops) => {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
};

export const drawRoundedPanel = (ctx, { x, y, w, h, radius = 28, fill, stroke, lineWidth = 2 }) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
};
