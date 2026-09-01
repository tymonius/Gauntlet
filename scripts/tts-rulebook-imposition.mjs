export function imposedPlacementForLogicalPage(totalLogicalPages, logicalIndex) {
  if (!Number.isInteger(totalLogicalPages) || totalLogicalPages < 4 || totalLogicalPages % 4 !== 0) {
    throw new Error(`Logical Rulebook page count must be a positive multiple of four; found ${totalLogicalPages}.`);
  }
  if (!Number.isInteger(logicalIndex) || logicalIndex < 0 || logicalIndex >= totalLogicalPages) {
    throw new Error(`Logical Rulebook page index ${logicalIndex} is outside 0..${totalLogicalPages - 1}.`);
  }

  for (let sheet = 0; sheet < totalLogicalPages / 4; sheet += 1) {
    const frontSide = sheet * 2;
    const backSide = frontSide + 1;
    const placements = [
      [totalLogicalPages - 1 - 2 * sheet, frontSide, 'left'],
      [2 * sheet, frontSide, 'right'],
      [1 + 2 * sheet, backSide, 'left'],
      [totalLogicalPages - 2 - 2 * sheet, backSide, 'right'],
    ];
    const match = placements.find(([page]) => page === logicalIndex);
    if (match) return { imposedPageIndex: match[1], slot: match[2] };
  }

  throw new Error(`Could not resolve imposed placement for logical page ${logicalIndex}.`);
}
