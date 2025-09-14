describe('Lose flow', () => {
  const apiUrl = 'http://localhost:4000/graphql';

  const interceptOnce = (operationName: string, responseBody: Record<string, unknown>) => {
    cy.intercept('POST', apiUrl, (req) => {
      const { query } = req.body as { query: string };
      if (query && query.includes(operationName)) {
        req.reply({ statusCode: 200, body: { data: responseBody } });
      }
    }).as(operationName);
  };

  it('plays a round and loses', () => {
    interceptOnce('GetOrCreatePlayer', { getOrCreatePlayer: { id: 'e2e', balance: 100, activeWinnings: 0 } });
    interceptOnce('Player', { player: { id: 'e2e', balance: 100, activeWinnings: 0 } });
    interceptOnce('PlayRound', { playRound: { drawnCard: 9, didWin: false, winnings: 0, newBalance: 100 } });
    interceptOnce('Player', { player: { id: 'e2e', balance: 100, activeWinnings: 0 } });

    cy.visit('/');
    cy.contains('Large (8-13)', { timeout: 15000 }).click();
    cy.contains('You Lose!', { timeout: 15000 }).should('be.visible');
    cy.contains('Play Again?', { timeout: 15000 }).should('be.visible');
  });
});


