#!/usr/bin/env python3
"""Generate the proof-only v0.6.1 Rulebook design specimens."""

from __future__ import annotations

from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TYPEKIT_IMPORT = '@import url("https://use.typekit.net/vgm6nwi.css");'


def shell(title: str, body: str, *, body_class: str = "", head_extra: str = "") -> str:
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{escape(title)}</title>
<link rel="stylesheet" href="proof-runtime.css" />
<link rel="preconnect" href="https://use.typekit.net" />
<link rel="preconnect" href="https://p.typekit.net" crossorigin />
<link rel="stylesheet" href="https://use.typekit.net/vgm6nwi.css" />
{head_extra}</head><body class="{escape(body_class)}">{body}</body></html>'''


def running(left: str, right: str) -> str:
    return f'<div class="running-head"><span>{left}</span><span>{right}</span></div>'


def page(number: int, content: str, *, cls: str = "", label: str = "") -> str:
    side = "left" if number % 2 == 0 else "right"
    if "cover" in cls:
        furniture = ""
    else:
        folio_label = f'<span class="folio-label">{escape(label)}</span>'
        folio_number = f'<span class="folio-number">{number}</span>'
        folio_content = f'{folio_number}{folio_label}' if side == "left" else f'{folio_label}{folio_number}'
        furniture = f'<div class="footer-rule"></div><div class="folio">{folio_content}</div>'
    return f'<section class="page {side} {cls}" data-page="{number}"><div class="page-inner">{content}</div>{furniture}</section>'


def reference_steps(items: list[tuple[str, str]]) -> str:
    return "".join(
        f'<div class="reference-step"><span class="num">{i}</span><div><h4>{title}</h4><p>{text}</p></div></div>'
        for i, (title, text) in enumerate(items, 1)
    )


def build_pages() -> list[str]:
    pages: list[str] = []

    pages.append(page(1, '''
      <div class="cover-rule"></div><p class="cover-flavor">The canonical rules of Gauntlet</p>
      <h1>Gauntlet</h1><p class="cover-subtitle">Official Rulebook</p>
      <p class="cover-version">Version 0.6.1 · First Playtest Revision</p>
      <div class="cover-art"><img src="../../../images/sketches/hero%20sketch.png" alt="Gauntlet hero sketch" /></div>
      <div class="cover-bottom"><span>Tactical card-and-territory game</span><span>2026</span></div>''', cls="cover front-cover"))

    pages.append(page(2, f'''
      {running("Official Rulebook", "Contents")}<p class="flavor-overline">Begin here</p><h2 class="page-title">Contents</h2>
      <div class="contents-grid"><div>
        <div class="toc-group"><div class="toc-heading"><span class="toc-part">PART I</span><span class="toc-title">Learn to Play</span></div>
          <div class="toc-entry"><span>1</span><span>Game at a Glance</span><span class="toc-page">4</span></div>
          <div class="toc-entry"><span>2</span><span>Cards, Zones, and the Play Area</span><span class="toc-page">8</span></div>
          <div class="toc-entry"><span>3</span><span>Setup</span><span class="toc-page">12</span></div>
          <div class="toc-entry"><span>4</span><span>Your Turn</span><span class="toc-page">14</span></div>
          <div class="toc-entry"><span>5</span><span>Actions and Assets</span><span class="toc-page">17</span></div>
          <div class="toc-entry"><span>6</span><span>Movement and Position</span><span class="toc-page">20</span></div>
          <div class="toc-entry"><span>7</span><span>Battles</span><span class="toc-page">23</span></div></div>
        <div class="toc-group"><div class="toc-heading"><span class="toc-part">PART II</span><span class="toc-title">Complete Shared Rules</span></div>
          <div class="toc-entry"><span>8</span><span>Territory Control and Capture</span><span class="toc-page">28</span></div>
          <div class="toc-entry"><span>9</span><span>Running the Gauntlet</span><span class="toc-page">32</span></div>
          <div class="toc-entry"><span>10</span><span>Constructing a Deck</span><span class="toc-page">35</span></div></div>
      </div><div>
        <div class="toc-group"><div class="toc-heading"><span class="toc-part">PART III</span><span class="toc-title">Factions</span></div>
          <div class="toc-entry"><span>13</span><span>Military</span><span class="toc-page">46</span></div>
          <div class="toc-entry"><span>14</span><span>Diplomats</span><span class="toc-page">52</span></div>
          <div class="toc-entry"><span>15</span><span>Financiers</span><span class="toc-page">60</span></div>
          <div class="toc-entry"><span>16</span><span>Intelligence</span><span class="toc-page">68</span></div>
          <div class="toc-entry"><span>17</span><span>Mystics</span><span class="toc-page">76</span></div>
          <div class="toc-entry"><span>18</span><span>Inquisition</span><span class="toc-page">84</span></div></div>
        <div class="toc-group"><div class="toc-heading"><span class="toc-part">PART IV</span><span class="toc-title">Reference</span></div>
          <div class="toc-entry"><span></span><span>Quick Turn Reference</span><span class="toc-page">92</span></div>
          <div class="toc-entry"><span></span><span>Quick Battle Reference</span><span class="toc-page">93</span></div>
          <div class="toc-entry"><span></span><span>Glossary</span><span class="toc-page">94</span></div></div>
      </div></div><div class="reading-guide"><strong>Reading guide.</strong> Read Part I from front to back. Consult Complete rules when timing, exceptions, or unusual interactions matter.</div>''', label="GAUNTLET V0.6.1"))

    pages.append(page(3, f'''
      {running("Part I", "Learn to Play")}<div class="part-label">PART I</div>
      <p class="flavor-overline">Learn the field before you command it</p><h2>Learn to Play</h2>
      <p class="part-summary">Build a position, move through a shared battlefield, and resolve battles through hidden commitments and precise timing. This part teaches the ordinary flow of play before the detailed rules begin.</p>
      <div class="part-index"><div><strong>1</strong><br />Game at a Glance</div><div><strong>2</strong><br />Cards, Zones, and the Play Area</div><div><strong>3</strong><br />Setup</div><div><strong>4</strong><br />Your Turn</div><div><strong>5</strong><br />Actions and Assets</div><div><strong>7</strong><br />Battles</div></div>''', cls="part-opener", label="PART I"))

    pages.append(page(4, f'''
      {running("Welcome", "Learn to Play")}<p class="flavor-overline">A campaign in one contested column</p><h2 class="page-title">Game at a Glance</h2>
      <div class="body-copy"><p>Gauntlet is a two-player tactical card-and-territory game. Build a deck, choose a faction and Leader, then advance across a shared six-Territory battlefield.</p></div>
      <div class="glance-grid">
        <article class="glance-step"><span class="step-label">1</span><h3>Build your position</h3><p>Develop Assets, protect your Hand, and prepare the faction system that supports your plan.</p></article>
        <article class="glance-step"><span class="step-label">2</span><h3>Advance</h3><p>Move toward the opponent. Entering their position begins a battle.</p></article>
        <article class="glance-step"><span class="step-label">3</span><h3>Fight</h3><p>Risk a Gambit from Hand, draw a Reserve, choose a Tactic, and determine the winner.</p></article>
        <article class="glance-step"><span class="step-label">4</span><h3>Hold and capture</h3><p>Win an attack, hold the Territory, and survive the counterattack window.</p></article></div>
      <div class="victory-band"><h3>Run the Gauntlet</h3><p>Capture the opponent's final Territory, force a Last Stand beyond the Gauntlet, and win that battle.</p></div>
      <div class="turn-sequence"><strong>The ordinary turn</strong><br />Capture · Draw · Action · Movement · Action · Cleanup.</div>''', label="PART I · LEARN TO PLAY"))

    battle_steps = [
        ("Resolve opening effects", "Establish the contested position and resolve effects before Gambits."),
        ("Set Gambits", "Attacker, then defender, may set one eligible card from Hand."),
        ("Form Reserves", "Set Hands aside. Each player draws three temporary cards."),
        ("Reveal Gambits", "Reveal simultaneously and resolve controlled effects."),
        ("Choose and reveal Tactics", "Attacker, then defender, may choose one eligible Reserve card."),
        ("Resolve the battle", "Apply effects, roll, determine totals, and resolve any tie rule."),
        ("Resolve the Aftermath", "Retreat, occupation, destinations, and end-of-Aftermath effects occur in order."),
    ]
    battle_html = "".join(f'<div class="battle-step"><span class="num">{i}</span><div><h4>{title}</h4><p>{text}</p></div></div>' for i, (title, text) in enumerate(battle_steps, 1))
    pages.append(page(5, f'''
      {running("Part I · Learn to Play", "Battles")}<div class="chapter-title-row"><div class="chapter-number">7</div><h2>Battles</h2></div>
      <div class="rule-box"><span class="label">How it works</span><div class="body-copy">A battle begins when one player enters the other's position. Set a Gambit from Hand, draw a three-card Reserve, choose a Tactic, resolve effects, then roll.</div></div>
      <div class="battle-steps">{battle_html}</div><div class="reminder"><strong>Remember:</strong> Gambits normally go to the Graveyard. Tactics and unused Reserve cards normally go to the Discard Pile.</div>''', label="CHAPTER 7"))

    pages.append(page(6, f'''
      {running("Part III", "Factions")}<div class="part-label">PART III</div>
      <p class="flavor-overline">Six institutions contest one battlefield</p><h2>Factions</h2>
      <p class="part-summary">Each faction uses the shared Gauntlet while adding a distinct resource, tactical identity, and strategic pressure. The faction chapters explain those systems before presenting each Leader.</p>
      <div class="part-index"><div><strong>13</strong><br />Military</div><div><strong>14</strong><br />Diplomats</div><div><strong>15</strong><br />Financiers</div><div><strong>16</strong><br />Intelligence</div><div><strong>17</strong><br />Mystics</div><div><strong>18</strong><br />Inquisition</div></div>''', cls="part-opener", label="PART III"))

    pages.append(page(7, f'''
      {running("Part III · Factions", "Military")}<div class="faction-rule"></div><div class="faction-name">Military</div><h2 class="faction-claim">Command the advance.</h2>
      <div class="faction-summary-grid"><div><div class="rule-box"><span class="label">How it works</span><div class="body-copy">The Military turns battle victories into Command, then spends Command on Leader-specific Orders. The General attacks and pursues; the Commandant defends, repels, and captures.</div></div><div class="body-copy" style="margin-top:10px"><p>Military has no alternate victory condition. It wins by running the Gauntlet.</p></div></div>
      <dl class="faction-stats"><div><dt>Resource</dt><dd>Command · maximum 2</dd></div><div><dt>Gain</dt><dd>First battle victory each turn</dd></div><div><dt>Leaders</dt><dd>General · Commandant</dd></div><div><dt>Pool</dt><dd>12 faction titles</dd></div></dl></div>
      <h3 class="subhead">Command and Orders</h3><div class="body-copy"><p>The first battle victory each turn gives 1 Command. Newly gained Command may pay for an Order during that battle's Aftermath.</p></div>
      <div class="ability-strip"><article><h4>Timing</h4><p>Use an Order only at its printed timing.</p></article><article><h4>Cost</h4><p>Spend the listed Command when the Order is used.</p></article><article><h4>Withdrawal</h4><p>No winner means no Command and no victory Order.</p></article></div>''', label="CHAPTER 13"))

    pages.append(page(8, f'''
      {running("Military", "Leader")}<header class="leader-header"><p class="eyebrow">Attack · forward pressure · tempo</p><div class="leader-name">General</div><p class="leader-motto">Forward. Again.</p></header>
      <div class="leader-grid"><div class="leader-portrait"><img src="../../../images/sketches/general.png" alt="General sketch" /></div><div class="leader-copy"><p>The General converts Command into movement, battle strength, and continued advance. Each Order is a distinct timing decision rather than a passive bonus.</p><div class="callout orders-callout"><span class="label">Leader identity</span><h3>Orders</h3><p>Spend Command only at the printed timing. A follow-up advance creates a new movement sequence and may begin another battle.</p></div></div></div>
      <div class="order-list"><article class="order"><h4>Onward — 1 Command</h4><p>During your Movement step, before a battle begins, move one additional position.</p></article><article class="order"><h4>Rally — 1 Command</h4><p>Before dice are rolled in a battle you initiated, add +1 to your battle total.</p></article><article class="order"><h4>Rout — 2 Command</h4><p>At the end of the Aftermath of a battle you initiated and won, advance one position.</p></article></div>''', label="GENERAL"))

    turn = [("Capture", "Rotate an opposing Territory you still occupy."),("Draw", "Draw one card; reshuffle only when needed."),("Action", "Use the normal opportunity now or save it."),("Movement", "Advance, hold, or withdraw; resolve a battle immediately."),("Action", "Use it after movement if still available."),("Cleanup", "Resolve end-turn effects and discard down to three.")]
    battle = [("Opening effects", "Resolve effects before Gambits."),("Gambits", "Attacker, then defender, may set one."),("Reserves", "Each player draws three temporary cards."),("Reveal", "Reveal Gambits simultaneously."),("Tactics", "Attacker, then defender, may choose one."),("Battle", "Resolve effects, roll, and determine the winner."),("Aftermath", "Retreat, occupy, and move cards.")]
    pages.append(page(9, f'''
      {running("Part IV · Reference", "At the Table")}<p class="flavor-overline">Keep play moving</p><h2 class="page-title">Quick Reference</h2>
      <div class="reference-columns"><section><h3>Your turn</h3>{reference_steps(turn)}</section><section><h3>Battle</h3>{reference_steps(battle)}</section></div>
      <div class="destination-grid"><div><strong>Gambit</strong><span>Graveyard</span></div><div><strong>Tactic</strong><span>Discard Pile</span></div><div><strong>Reserve</strong><span>Discard Pile</span></div></div>
      <div class="reminder"><strong>Defender's Advantage:</strong> if totals are tied and the defender controls the contested Territory, the defender wins.</div>''', label="QUICK REFERENCE"))

    pages.append(page(10, f'''
      {running("Part IV · Reference", "Timing and Destinations")}<p class="eyebrow">Dense reference specimen</p><h2 class="page-title">Timing and Destinations</h2>
      <div class="body-copy"><p>Reference pages use compact grids, explicit labels, and repeated destination language. Decorative type is excluded from essential lookup text.</p></div>
      <table class="timing-table"><thead><tr><th>Moment</th><th>What resolves</th><th>Normal destination</th></tr></thead><tbody>
        <tr><td>Before Gambits</td><td>Opening and contested-position effects.</td><td>As printed</td></tr><tr><td>Gambit reveal</td><td>Both reveal simultaneously; controlled effects use shared timing.</td><td>Graveyard</td></tr><tr><td>Tactic reveal</td><td>Attacker chooses first, then defender; reveal together.</td><td>Discard Pile</td></tr><tr><td>Before dice</td><td>Modifiers, substitutions, rerolls, and prevention.</td><td>As printed</td></tr><tr><td>Aftermath</td><td>Retreat, occupation, capture windows, and destinations.</td><td>As modified</td></tr><tr><td>End of turn</td><td>Cleanup, hand limit, and end-turn effects.</td><td>Discard Pile unless stated</td></tr></tbody></table>
      <div class="callout" style="margin-top:13px"><span class="label">Reference principle</span><h3>Specific text controls.</h3><p>When a card, Territory, faction system, or Leader changes a normal timing or destination, follow that specific instruction.</p></div>''', label="REFERENCE"))

    pages.append(page(11, f'''
      {running("Gauntlet v0.6.1", "Publication Notes")}<div class="colophon-block"><p class="flavor-overline">For playtest tables and careful readers</p><h2>About this edition</h2><p>Gauntlet v0.6.1 is the First Playtest Revision. This Rulebook is intended for private review, playtesting, and structured feedback while development continues.</p><p>The Browser Rulebook is the most convenient searchable rules surface. The printed booklet is designed for sustained reading and table reference.</p></div>
      <div class="colophon-meta"><strong>Gauntlet v0.6.1 · First Playtest Revision</strong><br />Copyright © 2026 Tymon Scott. All rights reserved.<br />Repository and release materials are provided for private review and playtesting only. They may not be copied, redistributed, sold, republished, or used to create commercial derivative works without written permission.<br /><br />gauntlet.run · github.com/tymonius/Gauntlet</div>''', cls="colophon", label="PUBLICATION NOTES"))

    pages.append(page(12, '''<p class="back-flavor">Run the Gauntlet.</p><h2>Build. Advance. Contend. Capture.</h2><p class="back-copy">Gauntlet is a two-player tactical card-and-territory game of institutional power, battlefield pressure, and competing paths to victory.</p><div class="back-url">gauntlet.run</div><div class="back-legal"><strong>Gauntlet v0.6.1 · First Playtest Revision</strong><br />Gauntlet is an unpublished playtest project. Copyright © 2026 Tymon Scott. All rights reserved.<br />Repository and release materials are provided for private review and playtesting only. They may not be copied, redistributed, sold, republished, or used to create commercial derivative works without written permission.</div>''', cls="cover back-cover"))
    return pages


def print_document(pages: list[str]) -> str:
    return shell("Gauntlet Rulebook Design Proofs — Iteration 2", "\
".join(pages))


def reader_spreads(pages: list[str]) -> str:
    chunks = ['<div class="mockup-note">Half-letter reader mockup · finished pages shown as facing pages</div>', f'<section class="reader-cover">{pages[0]}</section>']
    chunks += [f'<section class="spread-sheet" data-spread="{left}-{right}">{pages[left-1]}{pages[right-1]}</section>' for left, right in [(2,3),(4,5),(6,7),(8,9),(10,11)]]
    chunks.append(f'<section class="reader-cover">{pages[11]}</section>')
    return shell("Gauntlet Half-Letter Reader Mockup", "\
".join(chunks), body_class="mockup-body", head_extra='<style>@page{size:11in 8.5in;margin:0}</style>')


def imposed_spreads(pages: list[str]) -> str:
    order = [(12,1,"Sheet 1 outside"),(2,11,"Sheet 1 inside"),(10,3,"Sheet 2 outside"),(4,9,"Sheet 2 inside"),(8,5,"Sheet 3 outside"),(6,7,"Sheet 3 inside")]
    chunks = ['<div class="mockup-note">Letter landscape · 12-page saddle-stitch imposition · duplex short-edge flip</div>']
    chunks += [f'<section class="spread-sheet" data-imposition="{left}-{right}"><span class="imposition-label">{label} · pages {left} | {right}</span>{pages[left-1]}{pages[right-1]}</section>' for left, right, label in order]
    return shell("Gauntlet Half-Letter Booklet Imposition", "\
".join(chunks), body_class="mockup-body", head_extra='<style>@page{size:11in 8.5in;margin:0}</style>')


def toner_cover() -> str:
    content = '''<div class="toner-band"><p class="back-flavor">Run the Gauntlet.</p><h2>Build. Advance. Contend. Capture.</h2></div><p class="back-copy">Gauntlet is a two-player tactical card-and-territory game of institutional power, battlefield pressure, and competing paths to victory.</p><div class="back-url" style="color:#111;border-color:#555">gauntlet.run</div><div class="back-legal"><strong>Gauntlet v0.6.1 · First Playtest Revision</strong><br />Gauntlet is an unpublished playtest project. Copyright © 2026 Tymon Scott. All rights reserved.<br />Repository and release materials are provided for private review and playtesting only.</div>'''
    return shell("Gauntlet Toner-Saver Back Cover", page(12, content, cls="cover toner-cover"))


def browser_document() -> str:
    steps = reference_steps([("Resolve opening effects", "Establish the contested position before Gambits."),("Set Gambits", "Attacker, then defender, may set one card."),("Form Reserves", "Each player draws three temporary cards."),("Reveal Gambits", "Reveal simultaneously and resolve controlled effects."),("Choose Tactics", "Attacker, then defender, may choose one."),("Resolve battle and Aftermath", "Apply effects, roll, retreat, occupy, and move cards.")]).replace('reference-step','browser-battle-step')
    body = f'''<div class="browser-proof"><header class="browser-header browser-shell"><div class="browser-brand"><span class="browser-mark">G</span><span>Gauntlet</span></div><nav class="browser-nav"><span>Rulebook</span><span>Card Reference</span><span>Deckbuilder</span></nav></header>
      <section class="browser-hero browser-shell"><p class="flavor-overline">Canonical rules · version 0.6.1</p><h1>Official Browser Rulebook</h1><p>The printed booklet's hierarchy and reading voice, translated into a responsive screen surface that follows the same design language as gauntlet.run.</p></section>
      <main class="browser-layout browser-shell"><aside class="browser-toc"><h2>Contents</h2><div class="part-line"><span class="toc-part">PART I</span><strong>Learn to Play</strong></div><a href="#battles">1. Game at a Glance</a><a href="#battles">7. Battles</a><div class="part-line"><span class="toc-part">PART III</span><strong>Factions</strong></div><a href="#general">13. Military</a><a href="#general">General</a><div class="part-line"><span class="toc-part">PART IV</span><strong>Reference</strong></div><a href="#battles">Quick Reference</a></aside>
      <article class="browser-article" id="battles"><div class="part-label">PART I</div><h2>Battles</h2><div class="rule-box"><span class="label">How it works</span>A battle begins when one player enters the other's position. Set a Gambit, form a Reserve, choose a Tactic, resolve effects, and roll.</div>{steps}<section class="browser-leader" id="general"><img src="../../../images/sketches/general.png" alt="General sketch" /><div><p class="eyebrow">Military leader · attack and tempo</p><div class="leader-name">General</div><p class="leader-motto">Forward. Again.</p><p>The General converts Command into movement, battle strength, and continued advance.</p><div class="rule-box"><span class="label">Leader ability</span><span class="card-name">Orders</span>: Onward adds movement, Rally adds to an initiated battle, and Rout advances after victory.</div></div></section></article></main>
      <footer class="browser-footer browser-shell">Internal design proof for issues #333 and #353. This page does not replace the live Browser Rulebook.</footer></div>'''
    return shell("Gauntlet Browser Rulebook Proof — Iteration 2", body)


def main() -> None:
    source_css = (ROOT / "proof.css").read_text(encoding="utf-8")
    runtime_css = source_css.replace(TYPEKIT_IMPORT, "", 1).lstrip()
    (ROOT / "proof-runtime.css").write_text(runtime_css, encoding="utf-8")
    print(f"generated {ROOT / 'proof-runtime.css'}")

    pages = build_pages()
    outputs = {
        "print-proof.html": print_document(pages),
        "reader-spreads.html": reader_spreads(pages),
        "imposition-proof.html": imposed_spreads(pages),
        "toner-cover-proof.html": toner_cover(),
        "browser-proof.html": browser_document(),
    }
    for name, content in outputs.items():
        (ROOT / name).write_text(content, encoding="utf-8")
        print(f"generated {ROOT / name}")


if __name__ == "__main__":
    main()
