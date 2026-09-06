import { elementFromMarkup, esc } from './common.mjs';

function factionLabel(value) {
  const text = String(value || 'neutral').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Neutral';
}

function trackerMarks(maximum, resourceName) {
  return Array.from({ length: maximum }, (_, index) => index + 1).map(value => {
    const linePosition = (value / maximum) * 100;
    const bandBottom = ((value - 1) / maximum) * 100;
    const major = maximum <= 4 || value === maximum || value % 5 === 0;
    return `<div class="tracker-mark${major ? ' tracker-mark-major' : ''}" style="--tracker-line-position:${linePosition.toFixed(4)}%;--tracker-band-bottom:${bandBottom.toFixed(4)}%">
      <span class="tracker-registration-line" aria-hidden="true"></span>
      <strong class="tracker-band-label">${value} ${esc(resourceName)}</strong>
    </div>`;
  }).join('');
}

export function render(spec) {
  const { component, trackedValue, presentation } = spec.content;
  if (!trackedValue || !presentation) throw new Error(`Tracker FaceSpec ${spec.id} is missing canonical tracker authority.`);

  const maximum = Number(presentation.scaleMaximum);
  const labelSizePt = Number(presentation.labelSizePt);
  if (!Number.isInteger(maximum) || maximum <= 0 || !Number.isFinite(labelSizePt) || labelSizePt <= 0) {
    throw new Error(`Tracker FaceSpec ${spec.id} has invalid presentation geometry.`);
  }

  const resourceName = String(trackedValue.name || component.name || '').trim();
  const title = String(presentation.title || component.name || resourceName).trim();
  const capLabel = String(presentation.capLabel || '');
  const instruction = String(presentation.instruction || '').trim();
  const titleLetterSpacingEm = presentation.titleLetterSpacingEm == null
    ? null
    : Number(presentation.titleLetterSpacingEm);
  if (titleLetterSpacingEm != null && !Number.isFinite(titleLetterSpacingEm)) {
    throw new Error(`Tracker FaceSpec ${spec.id} has invalid title letter spacing.`);
  }
  if (!resourceName || !title || !instruction) throw new Error(`Tracker FaceSpec ${spec.id} has incomplete presentation copy.`);
  const titleStyle = titleLetterSpacingEm == null
    ? ''
    : ` style="letter-spacing:${titleLetterSpacingEm}em"`;

  const faction = spec.faction || component.faction || 'neutral';
  const label = factionLabel(faction);
  const version = spec.provenance.displayVersion || 'Current';
  const element = elementFromMarkup(`
    <article class="gauntlet-card faction-component-card sliding-tracker-card ${esc(faction)}-card"
      data-faction="${esc(faction)}"
      data-component-id="${esc(component.id)}"
      data-contract-component-id="${esc(component.id)}"
      aria-label="${esc(component.name)} sliding tracker, physical scale 0 through ${maximum}">
      <div class="card-interior tracker-interior">
        <span class="tracker-watermark" aria-hidden="true"></span>
        <header class="tracker-heading">
          <span class="tracker-faction-emblem" aria-hidden="true"></span>
          <span class="tracker-faction-name">${esc(label)}</span>
          <h3${titleStyle}>${esc(title)}</h3>
          ${capLabel
            ? `<p class="tracker-cap">${esc(capLabel)}</p>`
            : '<p class="tracker-cap tracker-cap-empty" aria-hidden="true"></p>'}
        </header>
        <div class="tracker-instructions">${esc(instruction)}</div>
        <div class="tracker-scale" style="--tracker-max:${maximum};--tracker-label-size:${labelSizePt}pt" aria-label="Registration bands 1 through ${maximum}">
          ${trackerMarks(maximum, resourceName)}
        </div>
        <footer class="card-footer tracker-footer"><span>${esc(label)}</span><span>Tracker</span><span>${esc(version)}</span></footer>
      </div>
    </article>`
  );

  element.dataset.faceId = spec.id;
  element.dataset.faceTemplate = spec.template;
  return { element, preparation: { parchment: true, fit: 'tracker' } };
}
