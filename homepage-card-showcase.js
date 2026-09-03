import './homepage-tts.js';

const CARD_RENDER_WIDTH = 240;
const CARD_RENDER_HEIGHT = 336;
const CARD_ASPECT_RATIO = 5 / 7;
const STAGE_BOTTOM_PADDING = 110;

const showcase = document.querySelector('[data-card-showcase]');

if (showcase) {
  initializeShowcase(showcase).catch((error) => {
    console.error('Unable to load homepage card showcase.', error);
    const stage = showcase.querySelector('[data-card-showcase-stage]');
    if (stage) {
      stage.classList.add('card-showcase-error');
      stage.textContent = 'Card showcase unavailable.';
    }
  });
}

async function initializeShowcase(root) {
  const stage = root.querySelector('[data-card-showcase-stage]');
  if (!stage) return;

  const [configResponse, currentGameModule] = await Promise.all([
    fetch('/media/compositions.json', { cache: 'no-cache' }),
    import('/game-data/current-game.mjs'),
  ]);
  if (!configResponse.ok) throw new Error(`Composition config returned ${configResponse.status}.`);

  const config = await configResponse.json();
  const composition = config.compositions?.find((item) => item.id === root.dataset.cardShowcase);
  if (!composition) throw new Error(`Unknown composition: ${root.dataset.cardShowcase}`);

  const currentGame = await currentGameModule.loadCurrentGame();
  const cardNames = new Map(currentGame.cards.map((card) => [card.id, card.name]));
  const visibleHeight = Math.min(
    composition.canvas.height,
    Math.ceil(Math.max(...composition.cards.map((placement) => placementBottom(placement))) + STAGE_BOTTOM_PADDING),
  );

  stage.replaceChildren();

  const cardElements = composition.cards
    .slice()
    .sort((a, b) => a.z - b.z)
    .map((placement) => {
      const link = document.createElement('a');
      const name = cardNames.get(placement.id) || placement.id;
      link.className = 'card-showcase-card';
      link.href = `/card-reference/#${encodeURIComponent(placement.id)}`;
      link.setAttribute('aria-label', `View ${name} in the Card Reference`);
      link.style.zIndex = String(placement.z);
      link.style.transform = `rotate(${placement.rotation}deg)`;

      const frame = document.createElement('iframe');
      frame.className = 'card-showcase-frame';
      frame.src = `/card-design/face-render.html?id=${encodeURIComponent(`card:${placement.id}`)}`;
      frame.title = `${name} card render`;
      frame.tabIndex = -1;
      frame.loading = 'lazy';
      frame.scrolling = 'no';
      frame.setAttribute('aria-hidden', 'true');

      link.append(frame);
      stage.append(link);
      return { placement, link, frame };
    });

  const scaleFrames = () => {
    const scale = stage.clientWidth / composition.canvas.width;
    stage.style.height = `${visibleHeight * scale}px`;

    for (const { placement, link, frame } of cardElements) {
      const cardWidth = placement.width * scale;
      link.style.left = `${placement.x * scale}px`;
      link.style.top = `${placement.y * scale}px`;
      link.style.width = `${cardWidth}px`;

      const cardScale = cardWidth / CARD_RENDER_WIDTH;
      frame.style.width = `${CARD_RENDER_WIDTH}px`;
      frame.style.height = `${CARD_RENDER_HEIGHT}px`;
      frame.style.transform = `scale(${cardScale})`;
    }
  };

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scaleFrames);
    observer.observe(stage);
  }
  window.addEventListener('resize', scaleFrames, { passive: true });
  requestAnimationFrame(scaleFrames);
  stage.dataset.ready = 'true';
}

function placementBottom(placement) {
  const width = placement.width;
  const height = width / CARD_ASPECT_RATIO;
  const originX = placement.x + width / 2;
  const originY = placement.y + height;
  const radians = placement.rotation * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const corners = [
    [-width / 2, -height],
    [width / 2, -height],
    [width / 2, 0],
    [-width / 2, 0],
  ];

  return Math.max(...corners.map(([x, y]) => originY + x * sine + y * cosine));
}
