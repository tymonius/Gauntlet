import './homepage-tts.js';

const CARD_RENDER_WIDTH = 240;
const CARD_RENDER_HEIGHT = 336;
const CARD_ASPECT_RATIO = 5 / 7;
const STAGE_BOTTOM_PADDING = 110;
const SHOWCASE_MANIFEST = '/assets/homepage-card-showcase.json';
const SHOWCASE_SCHEMA_VERSION = 1;

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

  const [manifestResponse, currentGameModule] = await Promise.all([
    fetch(SHOWCASE_MANIFEST, { cache: 'no-cache' }),
    import('/game-data/current-game.mjs'),
  ]);
  if (!manifestResponse.ok) throw new Error(`Homepage showcase manifest returned ${manifestResponse.status}.`);

  const composition = await manifestResponse.json();
  if (composition?.schemaVersion !== SHOWCASE_SCHEMA_VERSION) {
    throw new Error(`Unsupported homepage showcase schema ${composition?.schemaVersion ?? '(missing)'}.`);
  }
  if (composition.id !== root.dataset.cardShowcase) {
    throw new Error(`Homepage showcase manifest ${composition.id || '(missing)'} does not match ${root.dataset.cardShowcase}.`);
  }
  if (!composition.canvas || !Number.isFinite(Number(composition.canvas.width)) || !Number.isFinite(Number(composition.canvas.height))) {
    throw new Error('Homepage showcase manifest has invalid canvas geometry.');
  }
  if (!Array.isArray(composition.cards) || composition.cards.length !== 7) {
    throw new Error(`Homepage showcase manifest must contain 7 cards; found ${composition.cards?.length ?? 0}.`);
  }

  const ids = composition.cards.map((placement) => String(placement?.id || '').trim());
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
    throw new Error('Homepage showcase manifest contains missing or duplicate card ids.');
  }

  const currentGame = await currentGameModule.loadCurrentGame();
  const cardNames = new Map(currentGame.cards.map((card) => [card.id, card.name]));
  const missingCards = ids.filter((id) => !cardNames.has(id));
  if (missingCards.length) throw new Error(`Homepage showcase contains unknown current card ids: ${missingCards.join(', ')}.`);

  const visibleHeight = Math.min(
    Number(composition.canvas.height),
    Math.ceil(Math.max(...composition.cards.map((placement) => placementBottom(placement))) + STAGE_BOTTOM_PADDING),
  );

  stage.replaceChildren();

  const cardElements = composition.cards
    .slice()
    .sort((a, b) => Number(a.z) - Number(b.z))
    .map((placement) => {
      const link = document.createElement('a');
      const name = cardNames.get(placement.id);
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
    const scale = stage.clientWidth / Number(composition.canvas.width);
    stage.style.height = `${visibleHeight * scale}px`;

    for (const { placement, link, frame } of cardElements) {
      const cardWidth = Number(placement.width) * scale;
      link.style.left = `${Number(placement.x) * scale}px`;
      link.style.top = `${Number(placement.y) * scale}px`;
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
  const width = Number(placement.width);
  const height = width / CARD_ASPECT_RATIO;
  const originX = Number(placement.x) + width / 2;
  const originY = Number(placement.y) + height;
  const radians = Number(placement.rotation) * Math.PI / 180;
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
