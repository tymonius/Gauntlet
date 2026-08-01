(() => {
  const node = document.querySelector('#rulebook-data');
  if (!node) throw new Error('Rulebook data is missing before layout normalization.');

  const data = JSON.parse(node.textContent);
  const tokens = data.tokens;
  let syntheticIndex = 0;
  let movedFactionAddenda = 0;
  let retiredLegacyPageBreaks = 0;

  for (let sectionStart = 0; sectionStart < tokens.length;) {
    if (!(tokens[sectionStart].kind === 'heading' && tokens[sectionStart].level === 1)) {
      sectionStart += 1;
      continue;
    }

    let sectionEnd = sectionStart + 1;
    while (sectionEnd < tokens.length && !(tokens[sectionEnd].kind === 'heading' && tokens[sectionEnd].level === 1)) {
      sectionEnd += 1;
    }

    const sectionTitle = tokens[sectionStart].title;
    const factionName = Object.keys(data.metadata.factions).find(name => sectionTitle.endsWith(name));
    if (factionName) {
      const [firstLeader, secondLeader] = data.metadata.factions[factionName].leaders;
      const firstLeaderIndex = tokens.findIndex((token, index) =>
        index > sectionStart && index < sectionEnd &&
        token.kind === 'heading' && token.level === 2 && token.title === firstLeader
      );
      const secondLeaderIndex = tokens.findIndex((token, index) =>
        index > firstLeaderIndex && index < sectionEnd &&
        token.kind === 'heading' && token.level === 2 && token.title === secondLeader
      );
      const addendumHeadingIndex = tokens.findIndex((token, index) =>
        index > secondLeaderIndex && index < sectionEnd &&
        token.kind === 'heading' && token.level === 2
      );

      if (firstLeaderIndex >= 0 && secondLeaderIndex > firstLeaderIndex && addendumHeadingIndex > secondLeaderIndex) {
        let addendumStart = addendumHeadingIndex;
        while (addendumStart > secondLeaderIndex && tokens[addendumStart - 1]?.kind === 'pagebreak') {
          addendumStart -= 1;
        }
        const addendum = tokens.splice(addendumStart, sectionEnd - addendumStart);
        let insertionIndex = firstLeaderIndex;
        while (insertionIndex > sectionStart && tokens[insertionIndex - 1]?.kind === 'pagebreak') {
          insertionIndex -= 1;
        }
        tokens.splice(insertionIndex, 0, ...addendum);
        movedFactionAddenda += 1;
      }
    }

    const howIndex = tokens.findIndex((token, index) =>
      index > sectionStart && index < sectionEnd &&
      token.kind === 'heading' && token.level === 2 && token.title === 'How it works'
    );
    const completeIndex = tokens.findIndex((token, index) =>
      index > sectionStart && index < sectionEnd &&
      token.kind === 'heading' && token.level === 2 && token.title === 'Complete rules'
    );

    if (howIndex >= 0 && completeIndex < 0) {
      const boundary = tokens.findIndex((token, index) =>
        index > howIndex && index < sectionEnd &&
        token.kind === 'heading' && token.level <= 2
      );
      if (boundary >= 0) {
        syntheticIndex += 1;
        tokens.splice(boundary, 0, {
          id: `layout-complete-rules-${syntheticIndex}`,
          kind: 'heading',
          level: 2,
          title: 'Complete rules',
          html: 'Complete rules',
          plain: 'Complete rules',
          layoutOnly: true,
        });
        sectionEnd += 1;
      }
    }

    sectionStart = sectionEnd;
  }

  /*
   * The canonical Markdown still carries fixed page-break elements from the
   * retired document renderer. They are not player-facing content and must not
   * dictate this publication's pagination. Part, faction, Leader, recto, and
   * booklet boundaries are created explicitly by the approved page model.
   */
  for (const token of tokens) {
    if (token.kind !== 'pagebreak' || token.layoutOnly) continue;
    token.kind = 'divider';
    token.legacyPagebreak = true;
    retiredLegacyPageBreaks += 1;
  }

  data.metadata.layoutNormalization = {
    insertedCompleteRulesHeadings: syntheticIndex,
    movedFactionAddendaBeforeLeaderProfiles: movedFactionAddenda,
    retiredLegacyPageBreaks,
  };
  node.textContent = JSON.stringify(data);
})();
