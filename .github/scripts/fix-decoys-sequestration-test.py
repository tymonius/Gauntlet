from pathlib import Path

path = Path("src/state/neutral-sequestration.test.ts")
text = path.read_text()
old = """    expect(state.pendingNeutralChoice).toMatchObject({ kind: 'decoys_asset', playerId: 'player_2' });
    expect(state.players.player_2.zones.assetBank).toEqual([DECOYS]);
  });"""
new = """    expect(state.pendingNeutralChoice).toMatchObject({ kind: 'decoys_asset', playerId: 'player_2' });
    expect(state.players.player_2.zones.assetBank).toEqual([DECOYS, ASSET_A, ASSET_B]);
    const pending = state.pendingNeutralChoice;
    if (!pending || pending.kind !== 'decoys_asset') throw new Error('Expected a Decoys replacement choice.');
    const protectedAsset = pending.assetOptions.find((asset) => asset.cardId === ASSET_A);
    if (!protectedAsset) throw new Error('Expected Asset A to be protectable with Decoys.');

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'use',
      targetKey: protectedAsset.exitId,
    }).state;

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.players.player_2.zones.assetBank).toEqual([ASSET_A]);
    expect(state.players.player_2.zones.discard).toEqual(expect.arrayContaining([DECOYS, ASSET_B]));
  });"""
if text.count(old) != 1:
    raise RuntimeError(f"Expected one Sequestration/Decoys assertion block, found {text.count(old)}")
path.write_text(text.replace(old, new, 1))
Path(__file__).unlink()
