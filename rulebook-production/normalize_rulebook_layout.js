(() => {
  const node = document.querySelector('#rulebook-data');
  if (!node) throw new Error('Rulebook data is missing before layout normalization.');

  const data = JSON.parse(node.textContent);
  const tokens = data.tokens;
  let syntheticIndex = 0;

  for (let sectionStart = 0; sectionStart < tokens.length;) {
    if (!(tokens[sectionStart].kind === 'heading' && tokens[sectionStart].level === 1)) {
      sectionStart += 1;
      continue;
    }

    let sectionEnd = sectionStart + 1;
    while (sectionEnd < tokens.length && !(tokens[sectionEnd].kind === 'heading' && tokens[sectionEnd].level === 1)) {
      sectionEnd += 1;
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

  data.metadata.layoutNormalization = {
    insertedCompleteRulesHeadings: syntheticIndex,
  };
  node.textContent = JSON.stringify(data);
})();
