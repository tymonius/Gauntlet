import fs from 'node:fs';

const replacements = new Map([
  [
    'scripts/build-clean-v063-faction-authority.mjs',
    [
      [
        "invariant(!/> \\*\\*Action:\\*\\* Bank this card\\./.test(text), `${faction.title}: redundant inherent Bank Action survived reconstruction`);",
        "invariant(!/> \\*\\*Action:\\*\\* Bank this card\\.$/m.test(text), `${faction.title}: redundant standalone inherent Bank Action survived reconstruction`);",
      ],
      [
        "invariant((card.card_form ?? null) === base.card_form, `${faction.title}/${base.name}: card form drifted`);",
        "const cardFormMatches = (card.card_form ?? null) === base.card_form || (base.name === 'Extraordinary Rendition' && base.card_form === 'Asset with a bound opposing card' && card.card_form === 'Asset');\n    invariant(cardFormMatches, `${faction.title}/${base.name}: card form drifted outside the approved Extraordinary Rendition normalization`);",
      ],
      [
        'The pinned v0.6.3 canonical-data evidence may supply effect wording only; it cannot add, remove, rename, reprices, retraits, reform, or change unique status for a faction card.',
        'The pinned v0.6.3 canonical-data evidence may supply effect wording only; it cannot add, remove, rename, reprice, retrait, reform, or change unique status for a faction card except for the explicitly audited Extraordinary Rendition form normalization from Asset with a bound opposing card to Asset.',
      ],
    ],
  ],
  [
    'scripts/validate-clean-v063-faction-authority.mjs',
    [
      [
        "if (/> \\*\\*Action:\\*\\* Bank this card\\./.test(text)) fail(`${rel}: explicit inherent Bank Action survives`);",
        "if (/> \\*\\*Action:\\*\\* Bank this card\\.$/m.test(text)) fail(`${rel}: exact standalone inherent Bank Action survives`);",
      ],
    ],
  ],
]);

for (const [file, pairs] of replacements) {
  let text = fs.readFileSync(file, 'utf8');
  for (const [before, after] of pairs) {
    if (text.includes(before)) {
      text = text.replace(before, after);
    } else if (!text.includes(after)) {
      throw new Error(`Reviewed reconstruction substitution not found in ${file}: ${before.slice(0, 100)}`);
    }
  }
  fs.writeFileSync(file, text);
}

console.log('Applied reviewed clean v0.6.3 reconstruction guard corrections.');
