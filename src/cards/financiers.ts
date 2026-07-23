import type { CardID } from '../types';

export interface FinancierCardDefinition {
  id: CardID;
  name: string;
  cost: number;
  unique?: boolean;
  cardForm?: 'Asset';
  action: string;
  battle: string;
  supplemental?: string[];
}

export const financierCardDefinitions: readonly FinancierCardDefinition[] = [
  {
    id: 'financiers-speculation', name: 'Speculation', cost: 1,
    action: 'Choose one Territory you neither control nor occupy. Place this face up beside that Territory. At the start of your next turn, if you occupy or control that Territory, gain 2 Capital and discard this. Otherwise, put this in your Graveyard.',
    battle: 'If you initiated this battle, you may spend 1 Capital. If you do and win, gain 2 Capital during battle cleanup. If you do and do not win, put this in your Graveyard instead of its normal destination.',
    supplemental: ['Speculation is not an Asset or Overlay and does not alter the chosen Territory.'],
  },
  {
    id: 'financiers-monetary-crisis', name: 'Monetary Crisis', cost: 2,
    action: 'Each player discards their hand, then draws two cards.',
    battle: 'During battle cleanup, each player with more than one card in hand chooses one of those cards and discards the rest.',
  },
  {
    id: 'financiers-liquidation', name: 'Liquidation', cost: 2,
    action: 'Choose one card in your Treasury and place it in your discard pile. Gain Capital equal to its value, then you may immediately buy or buy out one Deed.',
    battle: 'Before dice are rolled, you may choose one card in your Treasury and place it in your discard pile. If you do, gain Capital equal to its value, then you may immediately Subsidize.',
  },
  {
    id: 'financiers-underwriting', name: 'Underwriting', cost: 2, cardForm: 'Asset',
    action: 'Bank Underwriting as an Asset. After you lose a battle in which you used Subsidize, you may discard Underwriting. If you do, gain Capital equal to the bonus you purchased.',
    battle: 'After this battle, if you lose and used Subsidize, gain Capital equal to the bonus you purchased.',
  },
  {
    id: 'financiers-capital-gains', name: 'Capital Gains', cost: 3,
    action: 'Place Capital Gains beneath one card in your Treasury. At the start of your next turn, after captures and income, return that Treasury card to your hand and gain Capital equal to its value, then discard Capital Gains. If you lose a battle before then, place both cards in your discard pile instead. If the chosen card leaves your Treasury before this effect resolves, discard Capital Gains.',
    battle: 'During battle cleanup, if you won, choose one other card you played during this battle that would enter your discard pile or Graveyard. Place that card face up in your Treasury instead.',
  },
  {
    id: 'financiers-tariffs', name: 'Tariffs', cost: 3, cardForm: 'Asset',
    action: 'Bank Tariffs as an Asset. Draw two cards, then take an extra action this turn.',
    battle: 'Your opponent may discard one card from their hand. If they do not, add +1 to your battle total.',
    supplemental: ['While Tariffs is banked, skip your normal draw. You cannot bank Tariffs while you control another banked Tariffs. You cannot cause Tariffs to leave play during the turn it is banked.'],
  },
  {
    id: 'financiers-divestment', name: 'Divestment', cost: 3,
    action: 'Make one Deed you own unowned. Gain Capital equal to the number of Deeds you owned before doing so, then take an extra action.',
    battle: 'Before dice are rolled, you may make one Deed you own unowned. If you do, gain Capital equal to the number of Deeds you owned before doing so, then you may immediately Subsidize.',
  },
  {
    id: 'financiers-margin-loan', name: 'Margin Loan', cost: 3, cardForm: 'Asset',
    action: 'Choose one other card in your hand or Treasury and place it beneath Margin Loan as collateral. Bank Margin Loan as an Asset. Gain Capital equal to the collateral card’s value plus 2, then take an extra action.',
    battle: 'Before dice are rolled, you may place one other card from your hand or Treasury beneath Margin Loan as collateral. If you do, gain Capital equal to its value, then you may immediately Subsidize. During battle cleanup, if you won, return the collateral card to your hand. Otherwise, place Margin Loan and its collateral in your Graveyard.',
    supplemental: ['At the start of your next turn, after captures and income, choose one: Repay the loan by paying Capital equal to the collateral card’s value plus 3, returning the collateral card to your hand, then discarding Margin Loan; or default by placing Margin Loan and its collateral in your Graveyard.', 'If Margin Loan leaves play before the loan is resolved, you default.'],
  },
  {
    id: 'financiers-leveraged-buyout', name: 'Leveraged Buyout', cost: 4,
    action: 'Buy or buy out one Deed. For this purchase, you may use any number of cards from your hand or Treasury as collateral. Each collateral card contributes Capital equal to its value and is placed in your Graveyard after the purchase. Collateral may pay the entire cost.',
    battle: 'During battle cleanup, if you won as the attacker on a Territory whose Deed you do not own, you may immediately buy or buy out that Deed, treating the Territory as occupied. For this purchase, you may use any number of other cards you played in this battle as collateral. Each contributes Capital equal to its value and is placed in your Graveyard instead of its normal destination. Collateral may pay the entire cost.',
  },
  {
    id: 'financiers-foreclosure', name: 'Foreclosure', cost: 4,
    action: 'Choose one unoccupied Territory whose Deed you own that is adjacent to a Territory you control. Take control of that Territory.',
    battle: 'If you initiated this battle on a Territory whose Deed you owned when the battle began and you win, capture that Territory immediately instead of occupying it.',
  },
  {
    id: 'financiers-property-dues', name: 'Property Dues', cost: 4, cardForm: 'Asset',
    action: 'Bank Property Dues as an Asset. The first time each turn your opponent advances onto a Territory whose Deed you own, they choose one: discard one card from their hand; or you gain 2 Capital.',
    battle: 'If this battle takes place on a Territory whose Deed you own, your opponent chooses one: discard one card from their hand; or you gain 3 Capital during battle cleanup.',
  },
  {
    id: 'financiers-corner-the-market', name: 'Corner the Market', cost: 5, unique: true,
    action: 'Buy or buy out any number of Deeds. Fully resolve each purchase before calculating the cost of the next.',
    battle: 'During battle cleanup, if you won, you may buy or buy out any number of Deeds. Fully resolve each purchase before calculating the cost of the next.',
  },
] as const;

export const financierCardsById = new Map(financierCardDefinitions.map((card) => [card.id, card]));
