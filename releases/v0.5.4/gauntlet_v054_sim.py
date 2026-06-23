from __future__ import annotations

import json
import random
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

SEED = 20260619
MAX_TURNS = 180

DECKS = {
    "Vanguard Coalition": {
        "cards": [
            "Rallying Cry", "Rallying Cry", "Rallying Cry", "Rallying Cry",
            "Scouting Report", "Scouting Report", "Scouting Report",
            "New Recruits", "New Recruits", "New Recruits", "New Recruits",
            "Supplies", "Stand Ground", "Stand Ground", "Entrenchment", "Fealty",
            "Sabotage", "Sabotage", "Embargo", "Counterintelligence", "Conscription",
            "Fortifications", "Strategic Withdrawal", "Valor", "Invasion", "Assimilation",
            "Shock and Awe", "Court Martial", "Reinforcements", "Rousing Speech"
        ],
        # listed from own Heartland toward the center
        "territories": ["King's Road", "High Ground", "Supply Depot"],
    },
    "Reclamation Front": {
        "cards": [
            "Rallying Cry", "Rallying Cry", "Rallying Cry", "Rallying Cry",
            "Scouting Report", "Scouting Report", "Scouting Report",
            "New Recruits", "New Recruits", "New Recruits", "New Recruits",
            "Supplies", "Stand Ground", "Stand Ground", "Entrenchment", "Resistance",
            "Liberation", "Illegal Occupation", "Patriotism", "Strategic Withdrawal",
            "Redemption", "Valor", "Sabotage", "Embargo", "Fealty", "Assimilation",
            "Invasion", "Court Martial", "Reinforcements", "Rousing Speech"
        ],
        "territories": ["Exposed Flank", "Field Hospital", "King's Road"],
    },
}

ASSET_CARDS = {
    "Entrenchment", "Fealty", "Counterintelligence", "Fortifications", "Valor",
    "Rousing Speech", "Resistance", "Liberation", "Illegal Occupation", "Patriotism", "Attrition",
}
CONDITION_CARDS = {"Supplies", "Embargo", "Assimilation", "Shock and Awe", "Court Martial", "Reinforcements", "Redemption"}

# Battle eligibility and coarse human evaluation. Positive values are strength/utility, not exact rules power.
BATTLE_BASE = {
    "Rallying Cry": 3.0, "Scouting Report": 1.2, "New Recruits": 3.0,
    "Supplies": 1.8, "Stand Ground": 3.7, "Entrenchment": 3.8, "Fealty": 3.2,
    "Sabotage": 4.2, "Embargo": 4.0, "Counterintelligence": 3.0,
    "Conscription": 2.5, "Fortifications": 2.6, "Strategic Withdrawal": 2.0,
    "Valor": 3.0, "Invasion": 3.8, "Assimilation": 4.6, "Shock and Awe": 5.8,
    "Court Martial": 4.4, "Reinforcements": 2.8, "Rousing Speech": 2.5,
    "Resistance": 4.2, "Liberation": 4.3, "Illegal Occupation": 4.2,
    "Patriotism": 4.2, "Redemption": 1.3, "Attrition": 2.1,
}

@dataclass
class Card:
    name: str
    uid: str
    graveyard_origin: Optional[str] = None

@dataclass
class Territory:
    name: str
    owner: int
    controller: int
    revealed: bool = False

@dataclass
class Condition:
    card: Card
    owner: int
    target: int
    data: dict = field(default_factory=dict)

@dataclass
class Player:
    idx: int
    name: str
    deck_name: str
    direction: int
    position: int
    deck: list[Card]
    hand: list[Card] = field(default_factory=list)
    discard: list[Card] = field(default_factory=list)
    graveyard: list[Card] = field(default_factory=list)
    assets: list[Card] = field(default_factory=list)
    facedown_assets: set[str] = field(default_factory=set)
    conditions: list[Condition] = field(default_factory=list)
    occupied_since_turn: Optional[int] = None
    occupied_pos: Optional[int] = None
    delayed_capture_until: Optional[int] = None
    extra_action_next_turn: int = 0
    extra_actions_this_turn: int = 0
    skip_normal_draw: bool = False
    no_post_action: bool = False
    cannot_be_moved_by_effects_until_turn: Optional[int] = None
    known_enemy_territories: set[int] = field(default_factory=set)
    # telemetry
    reshuffles: int = 0
    incomplete_normal_draws: int = 0
    incomplete_battle_draws: int = 0
    cards_drawn_normal: int = 0
    cards_drawn_battle: int = 0
    cards_seen: set[str] = field(default_factory=set)
    grave_from_hand: int = 0
    grave_from_battle_draw: int = 0
    grave_other: int = 0
    battle_draw_to_discard: int = 0
    min_deck_plus_discard: int = 999
    min_not_graveyarded: int = 999
    threshold_turns: dict = field(default_factory=lambda: {15: None, 10: None, 5: None})

    def active_asset_names(self) -> set[str]:
        return {c.name for c in self.assets if c.uid not in self.facedown_assets}

class Game:
    def __init__(self, seed: int = SEED, battle_card_rule: str = 'draw_recycle', attrition_variant: str = 'two', attrition_carriers: str = 'both'):
        self.rng = random.Random(seed)
        valid_rules = {'all_graveyard', 'draw_recycle', 'outcome_based', 'outcome_hand_only', 'outcome_one_loss'}
        if battle_card_rule not in valid_rules:
            raise ValueError(f'Unknown battle_card_rule: {battle_card_rule}')
        self.battle_card_rule = battle_card_rule
        if attrition_variant not in {'two','three'}:
            raise ValueError(f'Unknown attrition_variant: {attrition_variant}')
        if attrition_carriers not in {'none','both','vanguard','reclamation'}:
            raise ValueError(f'Unknown attrition_carriers: {attrition_carriers}')
        self.attrition_variant = attrition_variant
        self.attrition_carriers = attrition_carriers
        self.seed = seed
        self.turn = 0
        self.round_no = 0
        self.current = 0
        self.winner: Optional[int] = None
        self.ending_reason: Optional[str] = None
        self.battles = 0
        self.captures = 0
        self.battle_sides = 0
        self.battle_sides_short_initial_draw = 0
        self.battle_sides_zero_initial_draw = 0
        self.battle_sides_no_card_played = 0
        self.battles_both_sides_no_card_played = 0
        self.battle_cards_from_hand = 0
        self.battle_cards_from_draw = 0
        self.attrition_action_plays = [0, 0]
        self.attrition_battle_plays = [0, 0]
        self.attrition_battle_successes = [0, 0]
        self.attrition_battle_failures = [0, 0]
        self.attrition_action_triggers = [0, 0]
        self.attrition_action_cards_graveyarded = [0, 0]
        self.attrition_battle_cards_graveyarded = [0, 0]
        self.battle_wins = [0, 0]
        self.first_battle_winner: Optional[int] = None
        self.last_battle_winner: Optional[int] = None
        self.current_battle_win_streak = 0
        self.max_battle_win_streak = 0
        self.max_battle_deficit = [0, 0]
        self.log: list[str] = []
        self.compact_turns: list[dict] = []
        self.no_progress_turns = 0
        self.max_no_progress = 0
        self.last_battle_pos: Optional[int] = None
        self.repeated_battles = 0
        self.max_same_position_streak = 0
        self.same_position_streak = 0
        self.board: dict[int, Territory] = {}
        self.players = self._setup_players()
        self._setup_board()
        for p in self.players:
            p.hand.extend(self.draw(p, 3, "opening"))
            self.update_depletion(p)
        first_rolls = [self.rng.randint(1, 6), self.rng.randint(1, 6)]
        while first_rolls[0] == first_rolls[1]:
            first_rolls = [self.rng.randint(1, 6), self.rng.randint(1, 6)]
        self.current = 0 if first_rolls[0] > first_rolls[1] else 1
        self.log.append(f"SETUP | Initiative roll {first_rolls[0]}–{first_rolls[1]}; {self.players[self.current].name} goes first.")
        self.log.append(self.board_string())

    def _setup_players(self):
        out = []
        for idx, (name, dname, direction, pos) in enumerate([
            ("Vanguard", "Vanguard Coalition", +1, 0),
            ("Reclamation", "Reclamation Front", -1, 7),
        ]):
            card_names = list(DECKS[dname]["cards"])
            carries = self.attrition_carriers == "both" or (self.attrition_carriers == "vanguard" and idx == 0) or (self.attrition_carriers == "reclamation" and idx == 1)
            if carries:
                # Replace one generic Rallying Cry so decks remain at 30 cards.
                card_names.remove("Rallying Cry")
                card_names.append("Attrition")
            cards = [Card(n, f"P{idx}-{i:02d}-{n}") for i, n in enumerate(card_names)]
            self.rng.shuffle(cards)
            out.append(Player(idx, name, dname, direction, pos, cards))
        return out

    def _setup_board(self):
        p0t = DECKS["Vanguard Coalition"]["territories"]
        p1t = DECKS["Reclamation Front"]["territories"]
        for i, name in enumerate(p0t, start=1):
            self.board[i] = Territory(name, 0, 0, False)
        # P1 list is own Heartland -> center, so reverse it onto positions 4,5,6
        for pos, name in zip([6, 5, 4], p1t):
            self.board[pos] = Territory(name, 1, 1, False)

    def board_string(self):
        cells = ["V-Heartland"]
        for pos in range(1, 7):
            t = self.board[pos]
            label = t.name if t.revealed else "?"
            label += f"(C{t.controller})"
            tokens = [p.name[0] for p in self.players if p.position == pos]
            if tokens:
                label += "[" + "/".join(tokens) + "]"
            cells.append(label)
        cells.append("R-Heartland")
        if self.players[0].position == 0:
            cells[0] += "[V]"
        if self.players[1].position == 7:
            cells[7] += "[R]"
        return "BOARD | " + " — ".join(cells)

    def opponent(self, p: Player) -> Player:
        return self.players[1 - p.idx]

    def draw(self, p: Player, n: int, purpose: str) -> list[Card]:
        drawn = []
        for _ in range(n):
            if not p.deck:
                if p.discard:
                    self.rng.shuffle(p.discard)
                    p.deck = p.discard
                    p.discard = []
                    p.reshuffles += 1
                    self.log.append(f"  DECK | {p.name} reshuffles {len(p.deck)} recyclable cards (reshuffle #{p.reshuffles}).")
                else:
                    if purpose == "battle":
                        p.incomplete_battle_draws += 1
                    elif purpose in ("normal", "opening", "effect"):
                        p.incomplete_normal_draws += 1
                    label = "battle" if purpose == "battle" else "non-battle"
                    self.log.append(
                        f"  DECK | {p.name} cannot complete a {label} draw: {len(drawn)}/{n} cards available; draws as many as possible."
                    )
                    break
            c = p.deck.pop()
            drawn.append(c)
            p.cards_seen.add(c.uid)
        if purpose == "battle":
            p.cards_drawn_battle += len(drawn)
        else:
            p.cards_drawn_normal += len(drawn)
        self.update_depletion(p)
        return drawn

    def update_depletion(self, p: Player):
        deck_discard = len(p.deck) + len(p.discard)
        not_gy = 30 - len(p.graveyard)
        p.min_deck_plus_discard = min(p.min_deck_plus_discard, deck_discard)
        p.min_not_graveyarded = min(p.min_not_graveyarded, not_gy)
        for threshold in (15, 10, 5):
            if not_gy < threshold and p.threshold_turns[threshold] is None:
                p.threshold_turns[threshold] = self.turn

    def move_to_grave(self, p: Player, card: Card, source: str):
        card.graveyard_origin = source
        p.graveyard.append(card)
        if source == "hand":
            p.grave_from_hand += 1
        elif source == "battle_draw":
            p.grave_from_battle_draw += 1
        else:
            p.grave_other += 1
        self.update_depletion(p)

    def discard_card(self, p: Player, card: Card):
        p.discard.append(card)
        self.update_depletion(p)

    def remove_from_zone(self, zone: list[Card], card: Card):
        zone.remove(card)

    def reveal_territory(self, pos: int, reason: str):
        if pos in self.board and not self.board[pos].revealed:
            self.board[pos].revealed = True
            self.log.append(f"  REVEAL | Position {pos} is {self.board[pos].name} ({reason}).")

    def is_counterattack(self, attacker: Player, defender: Player, pos: int) -> bool:
        t = self.board.get(pos)
        return bool(t and t.controller == attacker.idx and defender.occupied_pos == pos and defender.occupied_since_turn is not None)

    def controlled_territory(self, p: Player, pos: int) -> bool:
        return pos in self.board and self.board[pos].controller == p.idx

    def on_enemy_territory(self, p: Player, pos: int) -> bool:
        return pos in self.board and self.board[pos].controller != p.idx

    def score_action(self, p: Player, c: Card, before_move: bool) -> float:
        opp = self.opponent(p)
        name = c.name
        distance = abs(opp.position - p.position)
        likely_battle = distance == 1 or (name == "Invasion" and distance <= 3)
        early = self.turn < 14
        handn = len(p.hand)
        active = p.active_asset_names()
        score = -0.2
        if name == "Rallying Cry": score = 2.3 if handn <= 2 else 1.0
        elif name == "New Recruits": score = 2.8 if handn >= 2 else -5
        elif name == "Supplies": score = 2.6 if not any(x.card.name == "Supplies" for x in p.conditions) else -2
        elif name == "Scouting Report":
            hidden_ahead = [x for x in self.board if (x-p.position)*p.direction > 0 and not self.board[x].revealed]
            score = 1.8 if hidden_ahead else 0.2
        elif name in ASSET_CARDS:
            if name in active: score = -3
            else:
                base = {"Entrenchment":3.2,"Fealty":3.0,"Counterintelligence":1.8,"Fortifications":3.4,
                        "Valor":3.0,"Rousing Speech":2.0,"Resistance":3.7,"Liberation":3.1,
                        "Illegal Occupation":3.5,"Patriotism":3.8,"Attrition":3.35}.get(name,2.5)
                score = base + (0.7 if early else 0)
                if len(p.assets) >= 3: score -= 1.5
        elif name == "Sabotage": score = 3.4 if opp.active_asset_names() else -1
        elif name == "Embargo": score = 2.8 if not any(x.card.name == "Embargo" for x in opp.conditions) and len(opp.hand)>=2 else 0.4
        elif name == "Conscription": score = 3.2 if any(x.name in ASSET_CARDS and x.name not in active for x in p.hand if x.uid != c.uid) else 1.5
        elif name == "Strategic Withdrawal": score = 2.4 if p.assets and before_move else -0.5
        elif name == "Stand Ground": score = 0.4
        elif name == "Valor": score = 3.0
        elif name == "Invasion":
            target = opp.position
            ready = self.battle_readiness(p, attacking=True, pos=target, exclude_uid=c.uid)
            defense = self.battle_readiness(opp, attacking=False, pos=target)
            score = 4.8 if before_move and 2 <= distance <= 3 and ready >= defense - 0.35 else 0.8
        elif name in ("Assimilation", "Shock and Awe"):
            score = (5.5 if name == "Shock and Awe" else 4.6) if before_move and likely_battle and self.on_enemy_territory_target(p) else -1.2
        elif name == "Court Martial": score = 3.8 if likely_battle else 1.2
        elif name == "Reinforcements": score = 2.6
        elif name == "Redemption": score = 1.5 if not any(x.card.name == "Redemption" for x in p.conditions) else -2
        return score + self.rng.uniform(-0.15,0.15)

    def on_enemy_territory_target(self, p: Player) -> bool:
        target = p.position + p.direction
        return target in self.board and self.board[target].controller != p.idx

    def choose_action(self, p: Player, before_move: bool) -> Optional[Card]:
        if not p.hand:
            return None
        scored = [(self.score_action(p,c,before_move), c) for c in p.hand]
        scored.sort(key=lambda x:x[0], reverse=True)
        threshold = 1.65 if before_move else 1.85
        return scored[0][1] if scored[0][0] >= threshold else None

    def play_action(self, p: Player, c: Card, before_move: bool) -> str:
        opp = self.opponent(p)
        p.hand.remove(c)
        n = c.name
        detail = ""
        goes_discard = True
        if n == "Rallying Cry":
            got = self.draw(p,1,"effect"); p.hand.extend(got); detail=f"draws {self.names(got)}"
        elif n == "Scouting Report":
            hidden = [pos for pos in sorted(self.board) if (pos-p.position)*p.direction > 0 and not self.board[pos].revealed]
            if hidden:
                pos = hidden[0]
                p.known_enemy_territories.add(pos)
                detail=f"scouts position {pos}: {self.board[pos].name}"
            elif opp.hand:
                seen=self.rng.choice(opp.hand); detail=f"sees one opposing hand card ({seen.name})"
            else: detail="finds no hidden information"
        elif n == "New Recruits":
            if p.hand:
                victim = min(p.hand, key=lambda x:BATTLE_BASE.get(x.name,1))
                p.hand.remove(victim); self.discard_card(p,victim)
                got=self.draw(p,2,"effect"); p.hand.extend(got); detail=f"discards {victim.name}, draws {self.names(got)}"
            else:
                # illegal fallback: return card to hand
                p.hand.append(c); return "does not play New Recruits (no other card)"
        elif n == "Supplies":
            p.conditions.append(Condition(c,p.idx,p.idx,{"resolve_turn":self.turn+2})); goes_discard=False; detail="will draw two extra cards next turn"
        elif n in ASSET_CARDS:
            if len(p.assets)>=3:
                # replace weakest asset
                old=min(p.assets,key=lambda x:self.asset_value(x.name))
                p.assets.remove(old); p.facedown_assets.discard(old.uid); self.discard_card(p,old)
                detail=f"replaces {old.name}"
            p.assets.append(c); goes_discard=False
            if n == "Attrition":
                self.attrition_action_plays[p.idx] += 1
            detail=(detail+"; " if detail else "")+"enters Assets"
            # Rousing Speech trigger for opponent
            if "Rousing Speech" in opp.active_asset_names():
                got=self.draw(opp,1,"effect"); opp.hand.extend(got)
                if opp.hand:
                    d=min(opp.hand,key=lambda x:BATTLE_BASE.get(x.name,1)); opp.hand.remove(d); self.discard_card(opp,d)
                    self.log.append(f"    TRIGGER | {opp.name}'s Rousing Speech filters: draws {self.names(got)}, discards {d.name}.")
        elif n == "Sabotage":
            candidates=[x for x in opp.assets if x.uid not in opp.facedown_assets]
            if candidates:
                target=max(candidates,key=lambda x:self.asset_value(x.name)); opp.facedown_assets.add(target.uid)
                p.conditions.append(Condition(c,p.idx,p.idx,{"type":"sabotage_return","target_uid":target.uid,"resolve_turn":self.turn+2})); goes_discard=False
                detail=f"turns {opp.name}'s {target.name} face down until {p.name}'s next turn"
            else: detail="has no opposing Asset to suppress"
        elif n == "Embargo":
            opp.conditions.append(Condition(c,p.idx,opp.idx,{"resolve_on_next_turn":True})); goes_discard=False; detail=f"{opp.name} must discard randomly next turn"
        elif n == "Conscription":
            got=self.draw(p,1,"effect"); p.hand.extend(got); detail=f"draws {self.names(got)}"
            assets=[x for x in p.hand if x.name in ASSET_CARDS and x.name not in p.active_asset_names()]
            if assets:
                a=max(assets,key=lambda x:self.asset_value(x.name)); extra=self.play_action(p,a,before_move); detail+=f"; immediately {extra}"
        elif n == "Strategic Withdrawal":
            if p.assets:
                old=min(p.assets,key=lambda x:self.asset_value(x.name)); p.assets.remove(old); p.facedown_assets.discard(old.uid); p.hand.append(old)
                p.extra_actions_this_turn += 0
                p.conditions.append(Condition(c,p.idx,p.idx,{"type":"extra_movement","moves":1,"turn":self.turn})); goes_discard=True
                detail=f"returns {old.name} to hand and gains one additional movement"
            else: detail="has no Asset to return"
        elif n == "Stand Ground":
            p.cannot_be_moved_by_effects_until_turn=self.turn+2; detail="cannot be moved by opposing card effects until next turn"
        elif n == "Invasion":
            p.conditions.append(Condition(c,p.idx,p.idx,{"type":"extra_movement","moves":2,"turn":self.turn,"advance_only":True})); goes_discard=True; detail="gains two additional advance movements"
        elif n in ("Assimilation","Shock and Awe"):
            p.conditions.append(Condition(c,p.idx,p.idx,{"type":n,"turn":self.turn})); goes_discard=False; detail=f"primes {n} for an offensive capture this turn"
        elif n == "Court Martial":
            opp.conditions.append(Condition(c,p.idx,opp.idx,{"type":"court_martial","expires_after_battle":True})); goes_discard=False; detail=f"{opp.name}'s next lost battle causes an extra retreat"
        elif n == "Reinforcements":
            p.conditions.append(Condition(c,p.idx,p.idx,{"type":"reinforcements","resolve_turn":self.turn+2})); goes_discard=False; detail="gains an additional Action next turn"
        elif n == "Redemption":
            p.conditions.append(Condition(c,p.idx,p.idx,{"type":"redemption"})); goes_discard=False; detail="protects the next card discarded by an opposing effect"
        else:
            detail="uses its Action effect"
        if goes_discard:
            self.discard_card(p,c)
        return f"plays {n}: {detail}"

    def asset_value(self,n):
        return {"Patriotism":5,"Resistance":4.6,"Fortifications":4.4,"Illegal Occupation":4.2,"Entrenchment":4,
                "Fealty":3.9,"Valor":3.7,"Liberation":3.6,"Attrition":3.55,"Rousing Speech":2.8,"Counterintelligence":2.5}.get(n,2)

    def process_start_conditions(self,p:Player):
        # Restore sabotage at start of owner's next turn
        for owner in self.players:
            for cond in list(owner.conditions):
                if cond.data.get("type")=="sabotage_return" and cond.data.get("resolve_turn")<=self.turn and owner.idx==p.idx:
                    target_uid=cond.data["target_uid"]
                    for q in self.players:
                        q.facedown_assets.discard(target_uid)
                    owner.conditions.remove(cond); self.discard_card(owner,cond.card)
                    self.log.append(f"  CONDITION | Sabotage expires; suppressed Asset turns face up.")
        # Supplies and reinforcements owned by p
        for cond in list(p.conditions):
            if cond.card.name=="Supplies" and cond.data.get("resolve_turn")<=self.turn:
                got=self.draw(p,2,"effect"); p.hand.extend(got); p.conditions.remove(cond); self.discard_card(p,cond.card)
                self.log.append(f"  CONDITION | Supplies resolves: {p.name} draws {self.names(got)}.")
            elif cond.data.get("type")=="reinforcements" and cond.data.get("resolve_turn")<=self.turn:
                p.extra_actions_this_turn += 1; p.conditions.remove(cond); self.discard_card(p,cond.card)
                self.log.append(f"  CONDITION | Reinforcements grants {p.name} one additional Action this turn.")
        # Embargo on p, resolves after normal draw (called later separately)

    def process_embargo(self,p:Player):
        for cond in list(p.conditions):
            if cond.card.name=="Embargo" and cond.data.get("resolve_on_next_turn"):
                if p.hand:
                    victim=self.rng.choice(p.hand); p.hand.remove(victim); self.discard_card(p,victim)
                    self.log.append(f"  CONDITION | Embargo forces {p.name} to discard {victim.name} at random.")
                p.conditions.remove(cond); self.discard_card(self.players[cond.owner],cond.card)

    def capture_check(self,p:Player) -> bool:
        if p.occupied_pos is None or p.position != p.occupied_pos:
            return False
        pos=p.position
        if pos not in self.board or self.board[pos].controller==p.idx:
            p.occupied_pos=None; p.occupied_since_turn=None; return False
        if p.delayed_capture_until is not None and self.turn < p.delayed_capture_until:
            self.log.append(f"  CAPTURE | {p.name}'s capture at position {pos} remains delayed.")
            return False
        self.board[pos].controller=p.idx
        p.occupied_pos=None; p.occupied_since_turn=None; p.delayed_capture_until=None
        self.captures += 1
        self.log.append(f"  CAPTURE | {p.name} captures {self.board[pos].name} at position {pos}.")
        return True

    def count_movements(self,p:Player) -> int:
        moves=1
        if p.position in self.board and self.board[p.position].revealed and self.board[p.position].name=="King's Road":
            moves=2
        for cond in p.conditions:
            if cond.data.get("type")=="extra_movement" and cond.data.get("turn")==self.turn:
                moves += cond.data.get("moves",0)
        return moves

    def choose_movement(self,p:Player,moves_left:int) -> str:
        opp=self.opponent(p)
        target=p.position+p.direction
        # Heartland entry always desirable
        if target == (7 if p.idx==0 else 0):
            return "advance"
        if target == opp.position:
            readiness=self.battle_readiness(p, attacking=True, pos=target)
            defensive=self.battle_readiness(opp, attacking=False, pos=target)
            urgency=min(2.2,self.no_progress_turns/8)
            # Counterattacks are strongly favored; normal attacks require plausible readiness.
            # A player who has already committed a one-turn offensive Condition follows through
            # rather than wasting Assimilation or Shock and Awe by suddenly becoming cautious.
            counter=self.is_counterattack(p,opp,target)
            primed_attack=any(
                c.card.name in ("Assimilation", "Shock and Awe") and c.data.get("turn") == self.turn
                for c in p.conditions
            )
            if counter or primed_attack or readiness + urgency >= defensive - 0.6 or self.no_progress_turns>=12:
                return "advance"
            return "hold"
        # If open space, advance unless preserving position for strong controlled benefit and enemy is far.
        if 0 <= target <= 7:
            return "advance"
        return "hold"

    def battle_readiness(self,p:Player,attacking:bool,pos:int,exclude_uid:Optional[str]=None) -> float:
        active=p.active_asset_names()
        score=sum(sorted([BATTLE_BASE.get(c.name,1) for c in p.hand if c.uid != exclude_uid], reverse=True)[:1])
        if not attacking and "Fortifications" in active: score += 1.2
        if not attacking and "Entrenchment" in active: score += 1.1
        if "Fealty" in active: score += .5
        if "Patriotism" in active and self.controlled_territory(p,pos): score += 1.1
        if pos in self.board and self.board[pos].revealed and self.board[pos].name=="High Ground" and not attacking: score += 1.4
        return score

    def battle_card_score(self,p:Player,c:Card,attacker:bool,pos:int,counter:bool,from_hand:bool,opp:Player) -> float:
        s=BATTLE_BASE.get(c.name,0)
        n=c.name
        if n in ("Stand Ground","Entrenchment") and attacker: s=-1.5
        if n=="Fortifications" and attacker: s=-1
        if n=="Invasion" and not attacker: s=0.5
        if n in ("Assimilation","Shock and Awe") and not (attacker and self.on_enemy_territory(p,pos)): s=0.2
        if n in ("Resistance","Liberation","Illegal Occupation") and not counter: s=0.3
        if n=="Patriotism" and not (not attacker and self.controlled_territory(p,pos)): s=.5
        if n=="Rousing Speech" and len(opp.active_asset_names())<=len(p.active_asset_names()): s=.3
        if n=="Redemption": s=.1
        if n=="Attrition":
            # Attrition does not improve the roll; use it mainly when the player already looks competitive.
            readiness_gap = self.battle_readiness(p, attacking=attacker, pos=pos, exclude_uid=c.uid) - self.battle_readiness(opp, attacking=not attacker, pos=pos)
            s = 2.45 if (counter or readiness_gap >= -0.25) else 1.05
        # Hand cards are more valuable because they could be saved for later.
        if from_hand: s -= 0.65
        # Preserve premium finishers unless the battle can take enemy ground.
        if from_hand and n in ("Shock and Awe","Assimilation") and not self.on_enemy_territory(p,pos): s -= 2
        return s + self.rng.uniform(-0.1,.1)

    def choose_hand_battle(self,p:Player,attacker:bool,pos:int,counter:bool,opp:Player) -> Optional[Card]:
        if not p.hand: return None
        # Exposed Flank prevents the occupier from committing from hand during controller counterattack.
        if counter and pos in self.board and self.board[pos].name=="Exposed Flank" and self.board[pos].controller==p.idx:
            # p is attacker/controller, restriction is on defender, handled for defender below
            pass
        if counter and pos in self.board and self.board[pos].name=="Exposed Flank" and self.board[pos].controller==opp.idx and p.idx!=self.board[pos].controller:
            return None
        scored=sorted([(self.battle_card_score(p,c,attacker,pos,counter,True,opp),c) for c in p.hand],reverse=True,key=lambda x:x[0])
        threshold=2.1 if self.on_enemy_territory(p,pos) or counter else 2.7
        return scored[0][1] if scored[0][0]>=threshold else None

    def choose_draw_battle(self,p:Player,cards:list[Card],attacker:bool,pos:int,counter:bool,opp:Player,max_cards:int=1) -> list[Card]:
        scored=sorted([(self.battle_card_score(p,c,attacker,pos,counter,False,opp),c) for c in cards],reverse=True,key=lambda x:x[0])
        chosen=[]
        for score,c in scored[:max_cards]:
            if score>=1.25:
                chosen.append(c)
        return chosen

    def played_card_goes_to_graveyard(self, player: Player, source: str, winner: Player) -> bool:
        if self.battle_card_rule == 'all_graveyard':
            return True
        if self.battle_card_rule == 'draw_recycle':
            return source != 'battle_draw'
        if self.battle_card_rule == 'outcome_based':
            return player is not winner
        if self.battle_card_rule == 'outcome_hand_only':
            return source == 'hand' and player is not winner
        raise RuntimeError(self.battle_card_rule)

    def resolve_battle(self,attacker:Player,defender:Player,pos:int,follow_up=False):
        self.battles += 1
        self.reveal_territory(pos,"battle begins")
        territory=self.board.get(pos)
        counter=self.is_counterattack(attacker,defender,pos)
        if self.last_battle_pos==pos:
            self.repeated_battles += 1; self.same_position_streak += 1
        else:
            self.same_position_streak=1
        self.max_same_position_streak=max(self.max_same_position_streak,self.same_position_streak)
        self.last_battle_pos=pos

        # determine active Assets (Illegal Occupation can blank occupier assets during counterattack)
        a_active=set(attacker.active_asset_names()); d_active=set(defender.active_asset_names())
        if counter and "Illegal Occupation" in a_active:
            d_active=set()
        # Hand commitments simultaneously
        a_hand=self.choose_hand_battle(attacker,True,pos,counter,defender)
        d_hand=self.choose_hand_battle(defender,False,pos,counter,attacker)
        if counter and territory and territory.name=="Exposed Flank" and territory.controller==attacker.idx:
            d_hand=None
        if a_hand: attacker.hand.remove(a_hand)
        if d_hand: defender.hand.remove(d_hand)

        # battle draw sizes
        a_n=3; d_n=3
        if counter and "Resistance" in a_active: a_n+=2
        # Battle Fortifications adds selection only
        a_draw=self.draw(attacker,a_n,"battle"); d_draw=self.draw(defender,d_n,"battle")
        a_initial_draw=list(a_draw); d_initial_draw=list(d_draw)
        self.battle_sides += 2
        self.battle_sides_short_initial_draw += int(len(a_draw) < a_n) + int(len(d_draw) < d_n)
        self.battle_sides_zero_initial_draw += int(len(a_draw) == 0) + int(len(d_draw) == 0)
        a_max=2 if ("Fortifications" in a_active and not True) else 1
        d_max=2 if "Fortifications" in d_active else 1
        a_chosen=self.choose_draw_battle(attacker,a_draw,True,pos,counter,defender,a_max)
        d_chosen=self.choose_draw_battle(defender,d_draw,False,pos,counter,attacker,d_max)

        # Battle effects that add extra draw/play.
        if (a_hand and a_hand.name=="Invasion") or any(c.name=="Invasion" for c in a_chosen):
            extra=self.draw(attacker,1,"battle"); a_draw+=extra
            if extra:
                pick=self.choose_draw_battle(attacker,extra,True,pos,counter,defender,1)
                a_chosen += pick
        if (d_hand and d_hand.name=="Fortifications") or any(c.name=="Fortifications" for c in d_chosen):
            extra=self.draw(defender,1,"battle"); d_draw+=extra
            # selection only; possibly replace weakest chosen
            pool=[x for x in d_draw if x not in d_chosen]
            best=self.choose_draw_battle(defender,pool,False,pos,counter,attacker,1)
            if best and (not d_chosen or self.battle_card_score(defender,best[0],False,pos,counter,False,attacker) > self.battle_card_score(defender,d_chosen[-1],False,pos,counter,False,attacker)):
                if d_chosen: d_chosen=d_chosen[:-1]
                d_chosen+=best
        for side_p,hand,chosen,draw,att,opp in [(attacker,a_hand,a_chosen,a_draw,True,defender),(defender,d_hand,d_chosen,d_draw,False,attacker)]:
            if (hand and hand.name=="Reinforcements") or any(c.name=="Reinforcements" for c in chosen):
                extra=self.draw(side_p,1,"battle"); draw+=extra
                pick=self.choose_draw_battle(side_p,extra,att,pos,counter,opp,1)
                chosen+=pick

        a_cards=([a_hand] if a_hand else [])+a_chosen
        d_cards=([d_hand] if d_hand else [])+d_chosen
        self.battle_sides_no_card_played += int(not a_cards) + int(not d_cards)
        self.battles_both_sides_no_card_played += int(not a_cards and not d_cards)
        self.battle_cards_from_hand += int(a_hand is not None) + int(d_hand is not None)
        self.battle_cards_from_draw += len(a_chosen) + len(d_chosen)
        a_sources={c.uid:("hand" if a_hand and c.uid==a_hand.uid else "battle_draw") for c in a_cards}
        d_sources={c.uid:("hand" if d_hand and c.uid==d_hand.uid else "battle_draw") for c in d_cards}

        # Cancellation. Attacker resolves first; choose highest-value opposing card.
        canceled_to_discard=[]; canceled_to_hand=[]
        def cancel_from(source_cards, target_cards, source_player, target_player):
            nonlocal canceled_to_discard,canceled_to_hand
            cancelers=[c for c in source_cards if c.name in ("Sabotage","Embargo")]
            for can in cancelers:
                eligible=[x for x in target_cards if x not in canceled_to_discard and x not in canceled_to_hand]
                if not eligible: continue
                target=max(eligible,key=lambda x:BATTLE_BASE.get(x.name,1))
                if can.name=="Sabotage": canceled_to_discard.append(target)
                else: canceled_to_hand.append(target)
        cancel_from(a_cards,d_cards,attacker,defender)
        # Remove canceled attacker cards before defender cancellation can target them if defender's canceler itself was canceled.
        if not any(c in canceled_to_discard or c in canceled_to_hand for c in d_cards if c.name in ("Sabotage","Embargo")):
            cancel_from(d_cards,a_cards,defender,attacker)

        a_effective=[c for c in a_cards if c not in canceled_to_discard and c not in canceled_to_hand]
        d_effective=[c for c in d_cards if c not in canceled_to_discard and c not in canceled_to_hand]
        a_attrition_played = any(c.name == "Attrition" for c in a_effective)
        d_attrition_played = any(c.name == "Attrition" for c in d_effective)
        if a_attrition_played: self.attrition_battle_plays[attacker.idx] += 1
        if d_attrition_played: self.attrition_battle_plays[defender.idx] += 1

        # Base dice pools and modifiers
        a_adv=0; d_adv=0; a_dis=0; d_dis=0; a_mod=0; d_mod=0
        if territory and territory.name=="High Ground": d_adv+=1
        if "Entrenchment" in d_active: a_dis+=1
        if "Fealty" in a_active and a_dis>0: a_dis-=1
        if "Fealty" in d_active and d_dis>0: d_dis-=1

        def apply_cards(cards, owner, is_attacker, own_active, opp_active):
            adv=dis=mod=opp_dis=0
            reroll=False; immediate=False; shock=False; extra_retreat=False; supplies=False; strategic=False; liberation_follow=False
            for c in cards:
                n=c.name
                if n in ("Rallying Cry","New Recruits","Counterintelligence"): mod+=1
                elif n=="Stand Ground" and not is_attacker: adv+=1
                elif n=="Entrenchment" and not is_attacker: opp_dis+=1
                elif n=="Fealty":
                    if dis>0: dis-=1
                    else: mod+=1
                elif n=="Court Martial": opp_dis+=1; extra_retreat=True
                elif n=="Rousing Speech" and len(opp_active)>len(own_active): adv+=1
                elif n=="Resistance" and counter and owner.idx==attacker.idx: adv+=1
                elif n=="Illegal Occupation" and counter and owner.idx==attacker.idx: adv+=1
                elif n=="Patriotism" and (not is_attacker) and self.controlled_territory(owner,pos): adv+=1
                elif n=="Valor": reroll=True
                elif n=="Assimilation" and is_attacker and self.on_enemy_territory(owner,pos): immediate=True
                elif n=="Shock and Awe" and is_attacker and self.on_enemy_territory(owner,pos): immediate=True; shock=True
                elif n=="Supplies": supplies=True
                elif n=="Strategic Withdrawal": strategic=True
                elif n=="Liberation" and counter and owner.idx==attacker.idx: liberation_follow=True
            return dict(adv=adv,dis=dis,mod=mod,opp_dis=opp_dis,reroll=reroll,immediate=immediate,shock=shock,extra_retreat=extra_retreat,supplies=supplies,strategic=strategic,liberation_follow=liberation_follow)

        ae=apply_cards(a_effective,attacker,True,a_active,d_active)
        de=apply_cards(d_effective,defender,False,d_active,a_active)
        a_adv+=ae['adv']; a_dis+=ae['dis']+de['opp_dis']; a_mod+=ae['mod']
        d_adv+=de['adv']; d_dis+=de['dis']+ae['opp_dis']; d_mod+=de['mod']
        # Fealty active cancels disadvantages after all card effects
        if "Fealty" in a_active: a_dis=0
        if "Fealty" in d_active: d_dis=0
        # Patriotism asset doubles first +1/advantage from a battle card on controlled territory.
        if "Patriotism" in a_active and self.controlled_territory(attacker,pos):
            if ae['adv']>0: a_adv+=1
            elif ae['mod']>0: a_mod+=1
        if "Patriotism" in d_active and self.controlled_territory(defender,pos):
            if de['adv']>0: d_adv+=1
            elif de['mod']>0: d_mod+=1

        a_rolls=self.roll_pool(a_adv,a_dis); d_rolls=self.roll_pool(d_adv,d_dis)
        a_nat=max(a_rolls) if a_adv>a_dis else min(a_rolls) if a_dis>a_adv else a_rolls[0]
        d_nat=max(d_rolls) if d_adv>d_dis else min(d_rolls) if d_dis>d_adv else d_rolls[0]
        # Valor reroll if behind pre-modifier
        if ae['reroll'] and a_nat+a_mod < d_nat+d_mod:
            a_nat=self.rng.randint(1,6)
        if de['reroll'] and d_nat+d_mod < a_nat+a_mod:
            d_nat=self.rng.randint(1,6)
        # v0.5.4 Last Stand: a player defending in their own Heartland has Homeland Advantage and +1.
        heartland_pos = 0 if defender.idx == 0 else 7
        last_stand = territory is None and pos == heartland_pos
        if last_stand:
            d_mod += 1
        a_total=a_nat+a_mod; d_total=d_nat+d_mod
        homeland = (territory is not None and territory.controller==defender.idx) or last_stand
        tie_rerolls=0
        while a_total==d_total and not homeland:
            tie_rerolls+=1
            a_rolls=self.roll_pool(a_adv,a_dis); d_rolls=self.roll_pool(d_adv,d_dis)
            a_nat=max(a_rolls) if a_adv>a_dis else min(a_rolls) if a_dis>a_adv else a_rolls[0]
            d_nat=max(d_rolls) if d_adv>d_dis else min(d_rolls) if d_dis>d_adv else d_rolls[0]
            a_total=a_nat+a_mod; d_total=d_nat+d_mod
        winner=defender if (d_total>a_total or (d_total==a_total and homeland)) else attacker
        loser=attacker if winner is defender else defender
        self.battle_wins[winner.idx] += 1
        if self.first_battle_winner is None:
            self.first_battle_winner = winner.idx
        if self.last_battle_winner == winner.idx:
            self.current_battle_win_streak += 1
        else:
            self.last_battle_winner = winner.idx
            self.current_battle_win_streak = 1
        self.max_battle_win_streak = max(self.max_battle_win_streak, self.current_battle_win_streak)
        diff = self.battle_wins[0] - self.battle_wins[1]
        self.max_battle_deficit[0] = max(self.max_battle_deficit[0], -diff)
        self.max_battle_deficit[1] = max(self.max_battle_deficit[1], diff)

        # Attrition can redirect the losing opponent's battle-draw cards to the Graveyard.
        # Base rule remains: hand commitments -> Graveyard, battle-draw cards -> discard.
        attrition_target_uids=set()
        attrition_target_source={}
        winner_effective = a_effective if winner is attacker else d_effective
        loser_effective = d_effective if loser is defender else a_effective
        loser_sources = d_sources if loser is defender else a_sources
        loser_initial = d_initial_draw if loser is defender else a_initial_draw
        loser_chosen = d_chosen if loser is defender else a_chosen
        winner_played_attrition = any(c.name == "Attrition" for c in winner_effective)
        loser_played_attrition = any(c.name == "Attrition" for c in loser_effective)
        if winner_played_attrition:
            self.attrition_battle_successes[winner.idx] += 1
            eligible_initial=[c for c in loser_initial if c not in canceled_to_discard and c not in canceled_to_hand]
            played_initial=[c for c in loser_chosen if c in eligible_initial and loser_sources.get(c.uid)=="battle_draw"]
            if self.attrition_variant == "three":
                targets=list(eligible_initial)
            else:
                targets=list(played_initial)
                remaining=[c for c in eligible_initial if c not in targets]
                # The losing player sacrifices the least valuable additional cards, to a total of two.
                remaining.sort(key=lambda x:BATTLE_BASE.get(x.name,1))
                targets += remaining[:max(0,2-len(targets))]
            for c in targets:
                attrition_target_uids.add(c.uid); attrition_target_source[c.uid]="battle"
        elif loser_played_attrition:
            self.attrition_battle_failures[loser.idx] += 1

        # Active Attrition has the weaker ongoing effect: played battle-draw cards are lost after its owner wins.
        if "Attrition" in winner.active_asset_names():
            eligible_played=[c for c in loser_chosen if c not in canceled_to_discard and c not in canceled_to_hand and loser_sources.get(c.uid)=="battle_draw"]
            if eligible_played:
                self.attrition_action_triggers[winner.idx] += 1
            for c in eligible_played:
                if c.uid not in attrition_target_uids:
                    attrition_target_uids.add(c.uid); attrition_target_source[c.uid]="action"

        self.log.append(f"  BATTLE {self.battles} | {attacker.name} attacks {defender.name} at position {pos} ({territory.name if territory else 'Heartland'}{'; counterattack' if counter else ''}).")
        self.log.append(f"    COMMIT | {attacker.name}: hand={a_hand.name if a_hand else 'none'}, draw={self.names(a_chosen)}; {defender.name}: hand={d_hand.name if d_hand else 'none'}, draw={self.names(d_chosen)}.")
        if canceled_to_discard or canceled_to_hand:
            self.log.append(f"    CANCEL | to discard={self.names(canceled_to_discard)}, returned to hand={self.names(canceled_to_hand)}.")
        self.log.append(f"    ROLL | {attacker.name} {a_rolls}+{a_mod} => {a_total}; {defender.name} {d_rolls}+{d_mod} => {d_total}{' (Last Stand: Homeland Advantage +1)' if last_stand else ''}{' (Homeland Advantage wins tie)' if a_total==d_total and homeland else ''}{f'; {tie_rerolls} tie reroll(s)' if tie_rerolls else ''}.")
        self.log.append(f"    RESULT | {winner.name} wins; {loser.name} retreats.")
        if attrition_target_uids:
            self.log.append(f"    ATTRITION | {winner.name} sends {len(attrition_target_uids)} of {loser.name}'s battle-draw cards to the Graveyard.")

        enemy_heartland_pos = 7 if defender.idx == 1 else 0
        heartland_conquest = pos == enemy_heartland_pos and winner is attacker

        # Resolve canceled card destinations immediately
        for c in canceled_to_discard:
            owner=attacker if c in a_cards else defender
            self.discard_card(owner,c)
        for c in canceled_to_hand:
            owner=attacker if c in a_cards else defender
            owner.hand.append(c)

        # Forced retreat, possibly extra
        old_loser_pos=loser.position
        retreat_steps=1
        losing_effect = ae if loser is defender else de  # opponent's effect? simpler below
        # Court Martial battle from winner or condition on loser
        if (winner is attacker and ae['extra_retreat']) or (winner is defender and de['extra_retreat']): retreat_steps+=1
        for cond in list(loser.conditions):
            if cond.data.get("type")=="court_martial":
                retreat_steps+=1; loser.conditions.remove(cond); self.discard_card(self.players[cond.owner],cond.card)
        loser.position=max(0,min(7,loser.position-loser.direction*retreat_steps))
        # Winner position
        if winner is attacker:
            attacker.position=pos
            defender.position=max(0,min(7,old_loser_pos-defender.direction*retreat_steps))
            if pos in self.board and self.board[pos].controller!=attacker.idx:
                attacker.occupied_pos=pos; attacker.occupied_since_turn=self.turn
            defender.occupied_pos=None; defender.occupied_since_turn=None
        else:
            attacker.position=max(0,min(7,old_loser_pos-attacker.direction*retreat_steps))
            defender.position=pos
            attacker.occupied_pos=None; attacker.occupied_since_turn=None

        # Immediate capture from Battle cards or primed Action conditions
        immediate = False; shock=False
        if winner is attacker and pos in self.board and self.board[pos].controller!=attacker.idx:
            immediate=ae['immediate']; shock=ae['shock']
            for cond in list(attacker.conditions):
                if cond.data.get("turn")==self.turn and cond.data.get("type") in ("Assimilation","Shock and Awe"):
                    immediate=True; shock = shock or cond.data.get("type")=="Shock and Awe"
                    attacker.conditions.remove(cond); self.discard_card(attacker,cond.card)
            if immediate:
                self.board[pos].controller=attacker.idx; attacker.occupied_pos=None; attacker.occupied_since_turn=None
                self.captures+=1
                self.log.append(f"    CAPTURE | {attacker.name} captures {territory.name} immediately{' with Shock and Awe' if shock else ''}.")

        # Valor asset draw on loss
        if "Valor" in loser.active_asset_names():
            got=self.draw(loser,1,"effect"); loser.hand.extend(got)
            self.log.append(f"    TRIGGER | {loser.name}'s Valor draws {self.names(got)} after the loss.")
        # Liberation counterattack trigger
        liberation_follow = winner is attacker and counter and ("Liberation" in a_active or ae['liberation_follow'])
        if liberation_follow:
            got=self.draw(attacker,1,"effect"); attacker.hand.extend(got)
            self.log.append(f"    TRIGGER | Liberation draws {self.names(got)} after winning the counterattack.")
        # Supplies battle effects
        for player,effect in [(attacker,ae),(defender,de)]:
            if effect['supplies']:
                got=self.draw(player,2,"effect"); player.hand.extend(got)
                if player.hand:
                    d=min(player.hand,key=lambda x:BATTLE_BASE.get(x.name,1)); player.hand.remove(d); self.discard_card(player,d)
                    self.log.append(f"    AFTER | {player.name}'s Supplies draws {self.names(got)} then discards {d.name}.")

        # Field Hospital controller saves one card that would otherwise enter the Graveyard.
        saved_uid=None
        if territory and territory.name=="Field Hospital":
            controller=self.players[territory.controller]
            own_cards=a_cards if controller is attacker else d_cards
            own_sources=a_sources if controller is attacker else d_sources
            own_draw=a_draw if controller is attacker else d_draw
            candidates=[]
            for c in own_cards:
                if c in canceled_to_discard or c in canceled_to_hand:
                    continue
                if own_sources[c.uid] == "hand" or c.uid in attrition_target_uids:
                    candidates.append(c)
            for c in own_draw:
                if c.uid in attrition_target_uids and c not in candidates:
                    candidates.append(c)
            if candidates:
                save=max(candidates,key=lambda x:BATTLE_BASE.get(x.name,1)); saved_uid=save.uid
                self.log.append(f"    TERRITORY | Field Hospital saves {controller.name}'s {save.name} to discard instead of Graveyard.")

        # Cleanup under the adopted base rule: hand commitments are permanent; battle-draw cards recycle,
        # except cards redirected by Attrition.
        for player,cards,sources,draw,chosen in [
            (attacker,a_cards,a_sources,a_draw,a_chosen),
            (defender,d_cards,d_sources,d_draw,d_chosen),
        ]:
            handled=set()
            for c in cards:
                if c in canceled_to_discard or c in canceled_to_hand: continue
                handled.add(c.uid)
                if c.uid==saved_uid:
                    self.discard_card(player,c)
                elif c.uid in attrition_target_uids:
                    self.move_to_grave(player,c,"attrition_"+attrition_target_source[c.uid])
                    if attrition_target_source[c.uid]=="battle": self.attrition_battle_cards_graveyarded[winner.idx]+=1
                    else: self.attrition_action_cards_graveyarded[winner.idx]+=1
                elif sources[c.uid] == "hand":
                    self.move_to_grave(player,c,"hand")
                else:
                    self.discard_card(player,c); player.battle_draw_to_discard += 1
            for c in draw:
                if c.uid in handled or c in canceled_to_discard or c in canceled_to_hand:
                    continue
                if c.uid==saved_uid:
                    self.discard_card(player,c)
                elif c.uid in attrition_target_uids:
                    self.move_to_grave(player,c,"attrition_"+attrition_target_source[c.uid])
                    if attrition_target_source[c.uid]=="battle": self.attrition_battle_cards_graveyarded[winner.idx]+=1
                    else: self.attrition_action_cards_graveyarded[winner.idx]+=1
                else:
                    self.discard_card(player,c)

        # Strategic Withdrawal on loser: voluntary extra retreat and recover one other played card.
        loser_effect = ae if loser is attacker else de
        loser_cards = a_cards if loser is attacker else d_cards
        if loser_effect['strategic'] and loser_cards:
            newpos=max(0,min(7,loser.position-loser.direction))
            if newpos!=loser.position:
                loser.position=newpos
                recoverable=[c for c in loser_cards if c.name!="Strategic Withdrawal" and c in loser.graveyard]
                if recoverable:
                    rec=max(recoverable,key=lambda x:BATTLE_BASE.get(x.name,1)); loser.graveyard.remove(rec); rec.graveyard_origin=None; loser.hand.append(rec)
                    self.log.append(f"    WITHDRAW | {loser.name} withdraws one extra tile and recovers {rec.name} to hand.")

        if heartland_conquest:
            attacker.position = pos
            self.winner = attacker.idx
            self.ending_reason = "won_battle_in_enemy_heartland"
            self.log.append(f"    VICTORY | {attacker.name} defeats the defender in the enemy Heartland.")

        # Shock and Awe / Liberation follow-up movement
        follow=False
        if self.winner is None and winner is attacker and ((immediate and shock) or liberation_follow):
            target=attacker.position+attacker.direction
            if 0<=target<=7:
                self.log.append(f"    FOLLOW-UP | {attacker.name} advances one additional tile.")
                if target==defender.position:
                    self.resolve_battle(attacker,defender,target,follow_up=True)
                else:
                    attacker.position=target
                    if target in self.board and self.board[target].controller!=attacker.idx:
                        self.reveal_territory(target,"follow-up advance")
                        attacker.occupied_pos=target; attacker.occupied_since_turn=self.turn
                    elif target in (0,7):
                        self.winner=attacker.idx; self.ending_reason="entered_enemy_heartland"
                follow=True

        self.update_depletion(attacker); self.update_depletion(defender)
        return winner

    def roll_pool(self,adv:int,dis:int):
        net=adv-dis
        n=1+abs(net)
        return [self.rng.randint(1,6) for _ in range(n)]

    def take_turn(self):
        if self.winner is not None: return
        p=self.players[self.current]; opp=self.opponent(p)
        self.turn+=1
        if self.current==0: self.round_no+=1
        p.extra_actions_this_turn=0; p.no_post_action=False
        start_pos=p.position
        captures_before=self.captures; battles_before=self.battles
        self.log.append(f"\nTURN {self.turn} | {p.name} (position {p.position})")
        self.process_start_conditions(p)
        self.capture_check(p)
        # Restore assets suppressed by territory when no longer there is omitted; only Sabotage facedown tracked.
        # Normal draw: Supply Depot gives two if occupying and controlling.
        draw_n=0 if p.skip_normal_draw else 1
        p.skip_normal_draw=False
        if p.position in self.board and self.board[p.position].revealed and self.board[p.position].name=="Supply Depot" and self.board[p.position].controller==p.idx:
            draw_n=2
            self.reveal_territory(p.position,"Supply Depot used")
        got=self.draw(p,draw_n,"normal"); p.hand.extend(got)
        self.log.append(f"  DRAW | {p.name} draws {self.names(got)}; hand now {self.names(p.hand)}.")
        self.process_embargo(p)

        actions_allowed=1+p.extra_actions_this_turn
        action_notes=[]
        # Before movement actions. Use one if valuable.
        while actions_allowed>0:
            c=self.choose_action(p,True)
            if not c: break
            note=self.play_action(p,c,True); action_notes.append(note); self.log.append(f"  ACTION | {p.name} {note}.")
            actions_allowed-=1
            # Avoid chaining forever except Conscription internal action.
            if actions_allowed<=0: break

        # Movement phase
        moves=self.count_movements(p)
        moved=[]
        for mi in range(moves):
            if self.winner is not None: break
            choice=self.choose_movement(p,moves-mi)
            if choice=="hold":
                self.log.append(f"  MOVE | {p.name} holds at position {p.position}; available attack looked unfavorable.")
                moved.append("hold"); break
            target=p.position+p.direction
            # Entrenchment stops extra movement when advancing onto adjacent territory to opponent.
            if target==opp.position:
                self.resolve_battle(p,opp,target)
                moved.append(f"battle@{target}")
                break
            if target==(7 if p.idx==0 else 0):
                # Enemy Heartland, no defender present
                p.position=target; self.winner=p.idx; self.ending_reason="entered_enemy_heartland"
                self.log.append(f"  MOVE | {p.name} enters the empty enemy Heartland and wins.")
                moved.append("heartland"); break
            old=p.position; p.position=target; moved.append(f"{old}->{target}")
            if target in self.board and self.board[target].controller!=p.idx:
                self.reveal_territory(target,"enemy entry")
                p.occupied_pos=target; p.occupied_since_turn=self.turn
            self.log.append(f"  MOVE | {p.name} advances from {old} to {target}.")
            # Entrenchment: if advancing onto a Territory adjacent to enemy, end movement and no post action.
            if abs(p.position-opp.position)==1 and "Entrenchment" in opp.active_asset_names():
                p.no_post_action=True
                self.log.append(f"    ASSET | {opp.name}'s Entrenchment ends further movement and blocks a post-movement Action.")
                break

        # Post-movement action if unused and allowed
        if actions_allowed>0 and not p.no_post_action and self.winner is None:
            c=self.choose_action(p,False)
            if c:
                note=self.play_action(p,c,False); action_notes.append(note); self.log.append(f"  ACTION | {p.name} {note}.")
                actions_allowed-=1
        # Expire unused one-turn offensive conditions
        for cond in list(p.conditions):
            if cond.data.get("turn")==self.turn and cond.data.get("type") in ("Assimilation","Shock and Awe","extra_movement"):
                p.conditions.remove(cond)
                if cond.card.name in ("Assimilation","Shock and Awe"):
                    self.discard_card(p,cond.card)
        # Cleanup hand to three, discard lowest current battle utility
        discarded=[]
        while len(p.hand)>3:
            d=min(p.hand,key=lambda x:BATTLE_BASE.get(x.name,1)); p.hand.remove(d); self.discard_card(p,d); discarded.append(d)
        if discarded:
            self.log.append(f"  CLEANUP | {p.name} discards down to three: {self.names(discarded)}.")
        self.log.append(f"  END | hand={self.names(p.hand)}; deck/discard/GY/assets/conditions={len(p.deck)}/{len(p.discard)}/{len(p.graveyard)}/{len(p.assets)}/{len(p.conditions)}.")
        self.log.append(self.board_string())

        progress=(self.captures>captures_before) or (self.battles>battles_before) or (p.position!=start_pos)
        self.no_progress_turns=0 if progress else self.no_progress_turns+1
        self.max_no_progress=max(self.max_no_progress,self.no_progress_turns)
        self.compact_turns.append({
            "turn":self.turn,"player":p.name,"start":start_pos,"end":p.position,
            "actions":action_notes,"movement":moved,"battles":self.battles-battles_before,
            "captures":self.captures-captures_before,"hand":len(p.hand),"deck":len(p.deck),
            "discard":len(p.discard),"graveyard":len(p.graveyard),"assets":[x.name for x in p.assets],
        })
        self.current=1-self.current

    def names(self,cards):
        if not cards: return "none"
        return ", ".join(c.name for c in cards)

    def run(self):
        while self.winner is None and self.turn<MAX_TURNS:
            self.take_turn()
        if self.winner is None:
            # tiebreak: farther progress toward enemy Heartland, then captures, then die
            progress=[self.players[0].position,7-self.players[1].position]
            if progress[0]!=progress[1]: self.winner=0 if progress[0]>progress[1] else 1
            else: self.winner=self.rng.randrange(2)
            self.ending_reason="turn_limit_tiebreak"
        self.log.append(f"\nGAME OVER | {self.players[self.winner].name} wins on turn {self.turn} by {self.ending_reason}. Battles={self.battles}, captures={self.captures}.")
        return self.summary()

    def summary(self):
        players=[]
        for p in self.players:
            players.append({
                "name":p.name,"deck_name":p.deck_name,"position":p.position,
                "zones":{"deck":len(p.deck),"discard":len(p.discard),"hand":len(p.hand),"graveyard":len(p.graveyard),"assets":len(p.assets),"conditions":len(p.conditions)},
                "reshuffles":p.reshuffles,"cards_drawn_outside_battle":p.cards_drawn_normal,"cards_drawn_battle":p.cards_drawn_battle,
                "deck_equivalents_drawn":round((p.cards_drawn_normal+p.cards_drawn_battle)/30,2),
                "individual_cards_seen":len(p.cards_seen),
                "graveyard_entries":{"from_hand":p.grave_from_hand,"from_battle_draw":p.grave_from_battle_draw,"other":p.grave_other},
                "battle_draw_cards_recycled":p.battle_draw_to_discard,
                "final_graveyard_by_origin":dict(Counter(c.graveyard_origin or "unknown" for c in p.graveyard)),
                "incomplete_normal_draws":p.incomplete_normal_draws,"incomplete_battle_draws":p.incomplete_battle_draws,
                "min_deck_plus_discard":p.min_deck_plus_discard,"min_not_graveyarded":p.min_not_graveyarded,"threshold_turns":p.threshold_turns,
                "graveyard_cards":[c.name for c in p.graveyard],"assets":[c.name for c in p.assets],"hand":[c.name for c in p.hand],
            })
        return {"seed":self.seed,"rule":self.battle_card_rule,
                "winner":self.players[self.winner].name,"ending_reason":self.ending_reason,"turns":self.turn,"rounds_approx":(self.turn+1)//2,
                "battles":self.battles,"captures":self.captures,"repeated_battles":self.repeated_battles,"max_same_position_streak":self.max_same_position_streak,
                "max_no_progress_turns":self.max_no_progress,
                "snowball":{"battle_wins":self.battle_wins,"first_battle_winner":None if self.first_battle_winner is None else self.players[self.first_battle_winner].name,
                            "max_battle_win_streak":self.max_battle_win_streak,"max_battle_deficit":self.max_battle_deficit,
                            "winner_max_battle_deficit":self.max_battle_deficit[self.winner]},
                "battle_quality":{"battle_sides":self.battle_sides,"short_initial_draw_sides":self.battle_sides_short_initial_draw,
                                  "zero_initial_draw_sides":self.battle_sides_zero_initial_draw,"no_card_played_sides":self.battle_sides_no_card_played,
                                  "both_sides_no_card_battles":self.battles_both_sides_no_card_played,
                                  "cards_from_hand":self.battle_cards_from_hand,"cards_from_draw":self.battle_cards_from_draw},
                "attrition":{"variant":self.attrition_variant,"carriers":self.attrition_carriers,
                             "action_plays":self.attrition_action_plays,"battle_plays":self.attrition_battle_plays,
                             "battle_successes":self.attrition_battle_successes,"battle_failures":self.attrition_battle_failures,
                             "action_triggers":self.attrition_action_triggers,
                             "cards_graveyarded_by_action":self.attrition_action_cards_graveyarded,
                             "cards_graveyarded_by_battle":self.attrition_battle_cards_graveyarded},
                "players":players}

if __name__ == "__main__":
    g=Game(battle_card_rule='draw_recycle', attrition_variant='two', attrition_carriers='both')
    summary=g.run()
    out=Path("/mnt/data")
    (out/"gauntlet_ab_single_game.log").write_text("\n".join(g.log),encoding="utf-8")
    (out/"gauntlet_ab_single_game_summary.json").write_text(json.dumps(summary,indent=2),encoding="utf-8")
    (out/"gauntlet_ab_single_turns.json").write_text(json.dumps(g.compact_turns,indent=2),encoding="utf-8")
    print(json.dumps(summary,indent=2))
