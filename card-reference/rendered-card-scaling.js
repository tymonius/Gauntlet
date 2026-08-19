function scaleRenderStage(stage) {
  const frame = stage.querySelector('.rendered-card-frame');
  if (!frame) return;

  const isTerritory = frame.src.includes('/card-design/territory-review-render.html');
  const sourceWidth = isTerritory ? 336 : 240;
  const sourceHeight = isTerritory ? 240 : 336;
  const maximumPreviewWidth = 420;

  frame.style.width = `${sourceWidth}px`;
  frame.style.height = `${sourceHeight}px`;

  const availableWidth = Math.max(0, stage.clientWidth);
  const targetWidth = Math.min(maximumPreviewWidth, availableWidth || sourceWidth);
  const scale = targetWidth / sourceWidth;

  stage.style.height = `${sourceHeight * scale}px`;
  frame.style.transform = `translateX(-50%) scale(${scale})`;
}
