function replaceRequired(source, search, replacement, label = search) {
  if (!source.includes(search)) {
    throw new Error(`Faction-feature Rulebook migration could not locate ${label}.`);
  }
  return source.replace(search, replacement);
}

function replaceSectionRequired(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`Faction-feature Rulebook migration could not locate ${label} start.`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`Faction-feature Rulebook migration could not locate ${label} end.`);
  return `${source.slice(0, start)}${replacement.trim()}\n\n${source.slice(end)}`;
}

const CHAPTER_5 = `# 5. Actions, Faction Features, Leader Abilities, and Assets

## How it works

Each turn, take one Action during either your Opening or your Denouement.

An Action may be used to:

- play one card from Hand for its **Action** effect;
- use one **Faction Feature** or **Leader Ability** marked **1 Action**, when its timing permits; or
- discard one Asset you control.

A **Faction Feature** is a named rule, option, procedure, passive effect, or special mechanic shared by a faction. A **Leader Ability** is supplied specifically by your chosen Leader.

Neither term implies whether an Action is spent. Each Feature or Ability states the properties that matter in play: **1 Action**, **No Action**, or **Automatic**, together with its timing, resource cost, frequency, and other limits as applicable.

## Complete rules

### Normal Action limit

The active player normally takes one Action total during the turn.

No more than one Action may normally be taken during Opening, and no more than one Action may normally be taken during Denouement.

The two limits are independent:

1. the total number of Actions the player may take that turn; and
2. the number of Actions the player may take during a particular phase.

### Additional Actions

An effect that says a player may take one additional Action that turn increases the total number of Actions available that turn. It does not change the normal limit of one Action in each phase.

Unless another effect expressly permits otherwise, a player with two Actions available must take one during Opening and one during Denouement.

An effect intended to permit more than one Action during the same phase must say so directly. For example:

> You may take one additional Action this turn. You may take both Actions during your Denouement.

Permission to take more Actions during a phase does not itself grant an additional Action unless the effect also says that it does.

### Action profiles

Faction Features and Leader Abilities state how they interact with the Action system.

- **1 Action:** Using the Feature or Ability spends one Action. Its entry states the legal phase or timing.
- **No Action:** The Feature or Ability may be used at its stated timing without spending an Action. It does not grant another Action.
- **Automatic:** The Feature or Ability applies when its stated condition or timing occurs. It does not spend an Action.

Resource costs, frequency limits, requirements, and other restrictions are separate from Action use and still apply.

### Directly permitted effects

A rule or effect may directly permit a card play, Faction Feature, Leader Ability, or other operation at a stated timing.

A directly permitted effect:

- occurs at the stated timing;
- spends an Action only if it says **1 Action** or expressly instructs the player to spend or take an Action;
- does not create another Action phase; and
- does not create implicit permission to take multiple Actions in one phase.

When an effect expressly permits something **without taking an Action**, follow that permission even if the ordinary use of the Feature or Ability is marked **1 Action**.

### Playing a card for its Action effect

To play a card for its Action effect:

1. take an Action during a phase in which that Action is legal;
2. play the card from Hand;
3. satisfy all requirements and costs;
4. resolve the Action effect; and
5. put the card in the Discard Pile unless it becomes an Asset, becomes an Overlay, or its effect gives another destination.

### Faction Features

A **Faction Feature** is a named faction-specific rule, option, procedure, passive effect, or special mechanic shared by the faction.

Names such as **Terms**, **Purge**, **Mission**, **Rite**, **Surveillance**, and similar faction mechanics remain the names of those Features; they are not separate top-level rules categories.

The faction chapter and Faction Reference state each Feature's Action profile, timing, resource cost, frequency, and other limits. A Feature marked **1 Action** may be used only by spending an Action at a legal timing. A Feature marked **No Action** or **Automatic** does not consume the player's normal Action.

### Leader Abilities

A **Leader Ability** is a mechanic supplied specifically by the chosen Leader.

Leader Abilities use the same **1 Action**, **No Action**, and **Automatic** profiles as Faction Features. Their timing, resource costs, frequency, and other limits are stated on the Leader Card and in the relevant faction chapter.

Military **Orders** are the named Leader Ability for the General and Commandant. Each individual Order states its Command cost and timing.

### Discarding an Asset as an Action

During Opening or Denouement, a player may take an Action to discard one Asset they control.

Using an Asset does not take an Action unless the Asset or another rule expressly says otherwise.

### Replacing an Asset

When banking an Asset at the Asset limit, the player may discard one Asset they control to make room and bank the new Asset as part of the same effect.

This replacement is not a separate Action. An effect that prevents an Asset from leaving play also prevents replacing it this way. Any consequence of the replaced Asset leaving play still occurs.

### Inquisition Purge exception

The shared Action rules support this faction-specific exception:

> **Purge — Faction Feature · 1 Action · Opening or Denouement · Once per turn:** Spend the listed Conviction to perform one Purge. If one Action that turn is Purge, you may also take one Action in the other Action phase that turn.

Purge never permits two Actions during the same phase.

A Purge performed through the Grand Inquisitor's **Final Judgment** Leader Ability does not spend an Action. It does not use the once-per-turn permission to spend an Action on Purge and does not activate the two-phase permission above.

### Assets and the Asset Bank

A card with an **Asset** effect has an inherent banking Action:

> **Bank:** As an Action, play this card from your Hand and bank it.

**Asset is the only banked-card effect heading.** A printed special banking Action overrides the inherent Bank procedure.

A player's Asset limit equals the number of Territories they control. If that limit falls below the number of banked Assets, immediately discard Assets until within the limit; each Asset forced to leave this way is **Removed**. Voluntary use/discard and normal self-expiration are not Removal unless expressly stated.

An Asset is **Removed** whenever a rule or effect forces it to leave play, regardless of destination.

Overlays are not Assets and follow Chapter 12.`;

const HOW_FACTIONS_WORK = `## How Factions Work

Each player chooses one faction and one of that faction's two Leaders. The faction determines which faction cards may be included in that player's Deck, which supplemental components are prepared, which public resources or progress are tracked, and which shared **Faction Features** are available. The chosen Leader adds that Leader's **Leader Ability**.

A **Faction Feature** is the umbrella term for a named rule, option, procedure, passive effect, or special mechanic shared by the faction. A **Leader Ability** is supplied specifically by the chosen Leader. Neither term implies Action use.

Every Feature or Ability states the properties that matter in play:

- **1 Action** when using it spends an Action;
- **No Action** when it is used at its stated timing without spending an Action; or
- **Automatic** when it applies at its stated condition or timing;
- plus any legal timing, resource cost, frequency, requirements, or other limits.

Names such as **Terms**, **Purge**, **Mission**, **Rite**, and **Surveillance** remain the names of faction mechanics. They are Faction Features rather than separate top-level rules categories. Military **Orders** are Leader Abilities.

Every faction may still win by running the Gauntlet. Some factions also have an alternate victory condition. An alternate victory applies only when its complete faction rules are satisfied.

Read the shared Learn to Play rules first. Then read the chapter for the faction and Leader used in the game. Players do not need to learn every other faction before their first game, but both players should be able to inspect all public faction rules and components in use.`;

export function applyFactionFeatureTerminology(source) {
  let result = String(source || '');

  result = replaceSectionRequired(
    result,
    '# 5. Actions, Faction Actions, Faction Abilities, and Assets',
    '# 6. Movement and Position',
    CHAPTER_5,
    'Chapter 5',
  );

  result = replaceSectionRequired(
    result,
    '## How Factions Work',
    '## Faction Components',
    HOW_FACTIONS_WORK,
    'How Factions Work',
  );

  result = replaceRequired(
    result,
    'Terms are a Diplomat faction procedure resolved during Onset',
    'Terms are a Diplomat Faction Feature used during Onset',
    'Terms classification',
  );

  result = result.replaceAll('## Faction Actions', '## Faction Features');

  result = replaceRequired(
    result,
    '| Faction Actions | None. Orders use their printed timings and do not spend Actions. |',
    '| Faction Features | None. |\n| Leader Ability | Orders; each Leader has their own Orders with printed Command costs and timings. |',
    'Military summary classification',
  );
  result = replaceRequired(
    result,
    'Military has **no Faction Actions**. Orders are Faction Abilities used at their printed timings; they do not use an Action. Playing a Military card for its Action effect still uses the normal Action rules.',
    'Military has no shared Faction Feature that spends an Action. **Orders** are Leader Abilities, not Faction Features. Each Order states its Command cost and timing and does not spend an Action. Playing a Military card for its Action effect still uses the normal Action rules.',
    'Military feature explanation',
  );

  result = replaceRequired(
    result,
    '| Faction procedure | Offer Terms during Onset before other pre-Gambit effects. |\n| Faction Actions | None. Terms and Leverage do not spend Actions. |',
    '| Faction Features | Terms — No Action · During Onset; Leverage — No Action · Before dice after refused Terms. |',
    'Diplomat summary classification',
  );
  result = replaceRequired(
    result,
    'Diplomats have **no Faction Actions**. Offering Terms is a faction procedure during Onset before other pre-Gambit effects, and Leverage is a Faction Ability used before dice are rolled after refused Terms. Neither takes an Action. Playing a Diplomat card for its Action effect still uses the normal Action rules.',
    '**Terms** and **Leverage** are Diplomat Faction Features marked **No Action**. Terms is used during Onset before other pre-Gambit effects, and Leverage is used before dice are rolled after refused Terms. Playing a Diplomat card for its Action effect still uses the normal Action rules.',
    'Diplomat feature explanation',
  );

  result = replaceRequired(
    result,
    '| Financial Capacity | If Treasury value exceeds Territories controlled at the start of your turn, gain 1 additional Action that turn; at least one Action must be spent on a Financier Faction Action. |',
    '| Financial Capacity | If Treasury value exceeds Territories controlled at the start of your turn, gain 1 additional Action that turn; at least one Action must be spent on a Financier Faction Feature marked 1 Action. |',
    'Financial Capacity summary terminology',
  );
  result = replaceRequired(
    result,
    '| Faction Actions | Place a card in Treasury, buy or buy out a Deed, Play the Market, or use Hostile Takeover; each is taken during Denouement. |',
    '| Faction Features | Treasury, Buy / Buy Out Deed, and Play the Market — 1 Action · Denouement; Subsidize — No Action · Before dice; Financial Capacity — No Action · After Capture; Income — Automatic · After Capture. |',
    'Financier summary classification',
  );
  result = replaceRequired(
    result,
    'Financiers have the following Faction Actions. Each costs 1 Action and may be used only during an Denouement:',
    'Financiers have the following shared Faction Features marked **1 Action · Denouement**:',
    'Financier action-feature introduction',
  );
  result = replaceRequired(
    result,
    '- **Hostile Takeover — Executive only:** After winning a battle as the attacker that turn and becoming the occupier of the enemy Territory, buy or buy out its Deed; a successful purchase also gives you control of that Territory.',
    '**Hostile Takeover — Executive Leader Ability:** After winning a battle as the attacker that turn and becoming the occupier of the enemy Territory, spend 1 Action during Denouement to buy or buy out its Deed; a successful purchase also gives you control of that Territory.',
    'Hostile Takeover classification',
  );
  result = replaceRequired(
    result,
    'When Financial Capacity grants an additional Action, at least one Action spent that turn must be spent on one of these Faction Actions. Line of Credit modifies a Deed purchase, and Subsidize modifies a battle; neither is a separate Faction Action.',
    'When Financial Capacity grants an additional Action, at least one Action spent that turn must be spent on a Financier Faction Feature marked **1 Action**. **Line of Credit** is the Banker\'s Leader Ability. **Subsidize** is a shared Faction Feature marked **No Action**; neither is part of the 1-Action feature list above.',
    'Financier feature distinctions',
  );
  result = result.replaceAll('Financier Faction Action', 'Financier Faction Feature marked 1 Action');

  result = replaceRequired(
    result,
    '| Faction Actions | Start, complete, or abort a Mission; start or complete a Special Operation; all are Denouement Actions. |',
    '| Faction Features | Start / Complete / Abort Mission and Start / Complete Special Operation — 1 Action · Denouement; Surveillance and Interference — No Action at their stated battle timings. |',
    'Intelligence summary classification',
  );
  result = replaceRequired(
    result,
    'Intelligence has the following Faction Actions. Each costs one Action and is legal only during Denouement:',
    'Intelligence has the following Faction Features marked **1 Action · Denouement**:',
    'Intelligence action-feature introduction',
  );
  result = replaceRequired(
    result,
    'Surveillance, Interference, Fieldcraft, and Mission Control are Faction Abilities, not Faction Actions. Mission Control may start a Mission without spending an Action only because its text expressly permits it.',
    '**Surveillance** and **Interference** are shared Faction Features marked **No Action**. **Fieldcraft** and **Mission Control** are Leader Abilities. Mission Control may start a Mission without spending an Action because that Leader Ability expressly permits it.',
    'Intelligence feature distinctions',
  );

  result = replaceRequired(
    result,
    '| Faction Actions | Begin a Rite or, after all three Rites are complete, begin the Ritual of Ascendance; both are normally Denouement Actions. |',
    '| Faction Features | Begin a Rite and Begin the Ritual of Ascendance — 1 Action · Denouement; Invocation and Transmutation — No Action; Convergence — Automatic. |',
    'Mystics summary classification',
  );
  result = replaceRequired(
    result,
    'Mystics have the following Faction Actions. Each costs one Action and is normally legal only during Denouement:',
    'Mystics have the following Faction Features marked **1 Action · Denouement**:',
    'Mystics action-feature introduction',
  );
  result = replaceRequired(
    result,
    'Completing a Rite is not a Faction Action; it occurs when that Rite\'s completion condition and timing are satisfied. Invocation, Transmutation, Convergence, and the Leader abilities are Faction Abilities, not Faction Actions.',
    'Completing a Rite is automatic when that Rite\'s completion condition and timing are satisfied. **Invocation** and **Transmutation** are Faction Features marked **No Action**; **Convergence** is **Automatic**. The Alchemist and Spirit Walker mechanics are Leader Abilities.',
    'Mystics feature distinctions',
  );
  result = replaceRequired(
    result,
    'You may take the Begin a Rite Faction Action for Rite of Crossing during Denouement only after winning a battle that turn that made you the occupier of a Territory the opponent controlled immediately before that battle.',
    'You may use the **Begin a Rite** Faction Feature for Rite of Crossing during Denouement only after winning a battle that turn that made you the occupier of a Territory the opponent controlled immediately before that battle.',
    'Rite of Crossing terminology',
  );

  result = replaceRequired(
    result,
    '| Faction Actions | Purge — Opening or Denouement. If one phase Action is Purge, the Inquisition may take one Action in the other phase as well. |',
    '| Faction Features | Purge — 1 Action · Opening or Denouement · Once per turn; Conviction, Condemnation, Blasphemy, and Purification — Automatic at their stated timings. |',
    'Inquisition summary classification',
  );
  result = replaceRequired(
    result,
    '**Purge is the Inquisition\'s only Faction Action.**',
    '**Purge is an Inquisition Faction Feature marked 1 Action · Opening or Denouement · Once per turn.**',
    'Purge classification',
  );
  result = replaceRequired(
    result,
    '> **Purge — Opening or Denouement:** Spend one Action and the listed Conviction to perform one Purge. You may take one Action during both Opening and Denouement that turn, provided one of those Actions is Purge.',
    '> **Purge — Faction Feature · 1 Action · Opening or Denouement · Once per turn:** Spend the listed Conviction to perform one Purge. If one Action that turn is Purge, you may also take one Action in the other Action phase that turn.',
    'Purge profile',
  );
  result = result.replaceAll(
    'Purge may be taken as a Faction Action no more than once per turn.',
    'You may spend an Action on Purge no more than once per turn.',
  );
  result = result.replaceAll(
    'You may take the Purge Faction Action no more than once per turn.',
    'You may spend an Action on Purge no more than once per turn.',
  );
  result = result.replaceAll(
    'the once-per-turn Purge Faction Action',
    'the once-per-turn permission to spend an Action on Purge',
  );
  result = replaceRequired(
    result,
    'Final Judgment is a Faction Ability. It does not consume the once-per-turn permission to spend an Action on Purge and does not activate the two-phase Purge permission.',
    'Final Judgment is the Grand Inquisitor\'s Leader Ability. It does not consume the once-per-turn permission to spend an Action on Purge and does not activate the two-phase Purge permission.',
    'Final Judgment classification',
  );

  result = replaceRequired(
    result,
    '**Faction Action:** A faction-specific option chosen when taking an Action. Its rules state its legal phase.\n\n**Faction Ability:** A faction-specific effect used or triggered at its stated timing. It does not take an Action unless it expressly says otherwise.',
    '**Faction Feature:** A named faction-specific rule, option, procedure, passive effect, or special mechanic shared by a faction. Its rules state whether it uses **1 Action**, **No Action**, or is **Automatic**, plus any timing, resource cost, frequency, requirements, or other limits.\n\n**Leader Ability:** A mechanic supplied specifically by the chosen Leader. Its rules state Action use, timing, resource cost, frequency, and other limits as applicable.',
    'Glossary faction terminology',
  );

  const retired = [
    /\bFaction Actions?\b/u,
    /\bFaction Abilit(?:y|ies)\b/u,
    /\bfaction procedure\b/iu,
  ];
  for (const pattern of retired) {
    if (pattern.test(result)) {
      throw new Error(`Faction-feature Rulebook migration left retired terminology: ${pattern}.`);
    }
  }

  return result;
}
