const CARD_RENDER_WIDTH = 240;
const CARD_RENDER_HEIGHT = 336;

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

  stage.style.aspectRatio = `${composition.canvas.width} / ${composition.canvas.height}`;
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
      link.style.left = `${placement.x / composition.canvas.width * 100}%`;
      link.style.top = `${placement.y / composition.canvas.height * 100}%`;
      link.style.width = `${placement.width / composition.canvas.width * 100}%`;
      link.style.zIndex = String(placement.z);
      link.style.transform = `rotate(${placement.rotation}deg)`;

      const frame = document.createElement('iframe');
      frame.className = 'card-showcase-frame';
      frame.src = `/card-design/card-showcase-embed.html?card=${encodeURIComponent(placement.id)}&fit=production`;
      frame.title = '';
      frame.tabIndex = -1;
      frame.loading = 'lazy';
      frame.scrolling = 'no';
      frame.setAttribute('aria-hidden', 'true');

      link.append(frame);
      stage.append(link);
      return { link, frame };
    });

  const scaleFrames = () => {
    for (const { link, frame } of cardElements) {
      const scale = link.clientWidth / CARD_RENDER_WIDTH;
      frame.style.width = `${CARD_RENDER_WIDTH}px`;
      frame.style.height = `${CARD_RENDER_HEIGHT}px`;
      frame.style.transform = `scale(${scale})`;
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
