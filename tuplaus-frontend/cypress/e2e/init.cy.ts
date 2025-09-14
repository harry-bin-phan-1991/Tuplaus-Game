describe('Game initialization', () => {
  const apiUrl = 'http://localhost:4000/graphql';

  const interceptOnce = (operationName: string, responseBody: Record<string, unknown>) => {
    cy.intercept('POST', apiUrl, (req) => {
      const { query } = req.body as { query: string };
      if (query && query.includes(operationName)) {
        req.reply({ statusCode: 200, body: { data: responseBody } });
      }
    }).as(operationName);
  };

  it('loads player and shows controls', () => {
    interceptOnce('GetOrCreatePlayer', { getOrCreatePlayer: { id: 'e2e', balance: 123, activeWinnings: 45 } });
    interceptOnce('Player', { player: { id: 'e2e', balance: 123, activeWinnings: 45 } });

    cy.visit('/');

    cy.contains('$123.00', { timeout: 15000 }).should('be.visible');
    cy.contains('$45.00', { timeout: 15000 }).should('be.visible');
    cy.contains('Small (1-6)', { timeout: 15000 }).should('be.visible');
  });
});


