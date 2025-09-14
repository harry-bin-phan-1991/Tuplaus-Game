describe('Deterministic Tuplaus Game E2E', () => {
  const apiUrl = 'http://localhost:4000/graphql';

  const interceptOnce = (operationName: string, responseBody: Record<string, unknown>) => {
    cy.intercept('POST', apiUrl, (req) => {
      const { query } = req.body as { query: string };
      if (query && query.includes(operationName)) {
        req.reply({ statusCode: 200, body: { data: responseBody } });
      }
    }).as(operationName);
  };

  beforeEach(() => {
    cy.visit('/');
  });

  it('forces a win path then cashes out', () => {
    interceptOnce('GetOrCreatePlayer', { getOrCreatePlayer: { id: 'e2e', balance: 100, activeWinnings: 0 } });
    interceptOnce('Player', { player: { id: 'e2e', balance: 100, activeWinnings: 0 } });
    interceptOnce('PlayRound', { playRound: { drawnCard: 4, didWin: true, winnings: 20, newBalance: 90 } });
    interceptOnce('Player', { player: { id: 'e2e', balance: 90, activeWinnings: 20 } });
    interceptOnce('CashOut', { cashOut: { id: 'e2e', balance: 110, activeWinnings: 0 } });
    interceptOnce('Player', { player: { id: 'e2e', balance: 110, activeWinnings: 0 } });

    cy.get('[data-testid="btn-small"]', { timeout: 15000 }).click();
    cy.contains('You Win!', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="btn-cashout"]', { timeout: 15000 }).click();
    cy.contains('$110.00', { timeout: 15000 }).should('be.visible');
  });

  it('forces a losing round', () => {
    interceptOnce('GetOrCreatePlayer', { getOrCreatePlayer: { id: 'e2e', balance: 100, activeWinnings: 0 } });
    interceptOnce('Player', { player: { id: 'e2e', balance: 100, activeWinnings: 0 } });
    interceptOnce('PlayRound', { playRound: { drawnCard: 9, didWin: false, winnings: 0, newBalance: 100 } });
    interceptOnce('Player', { player: { id: 'e2e', balance: 100, activeWinnings: 0 } });

    cy.contains('Large (8-13)', { timeout: 15000 }).click();
    cy.contains('You Lose!', { timeout: 15000 }).should('be.visible');
    cy.contains('Play Again?', { timeout: 15000 }).should('be.visible');
  });
});


