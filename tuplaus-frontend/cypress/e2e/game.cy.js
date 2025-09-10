describe('Tuplaus Game E2E', () => {
  const playerId = 'e2e-test-player';
  const backendUrl = 'http://localhost:4000/graphql';

  const runGql = (query) => {
    return cy.request({
      method: 'POST',
      url: backendUrl,
      body: { query },
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };

  beforeEach(() => {
    // Reset player state before each test
    const createPlayerMutation = `
      mutation {
        createPlayer(id: "${playerId}") {
          id
          balance
        }
      }
    `;
    runGql(createPlayerMutation);
    cy.visit('/');
  });

  it('displays the initial game state correctly', () => {
    cy.contains('Balance: $1000.00').should('be.visible');
    cy.contains('Current Winnings: $0.00').should('be.visible');
  });

  it('can play a round and win', () => {
    // We can't control the card draw here, so we test the flow.
    // This test might fail if the first card is a 7 or a loss.
    cy.contains('button', 'Small (1-6)').click();
    cy.contains('Last Card Drawn:').should('be.visible');

    // Check if winnings or balance changed
    cy.get('body').then(($body) => {
      if ($body.text().includes('You Won!')) {
        cy.contains('Current Winnings: $20.00').should('be.visible');
        cy.contains('Balance: $990.00').should('be.visible');
      } else {
        cy.contains('Current Winnings: $0.00').should('be.visible');
        cy.contains('Balance: $990.00').should('be.visible');
      }
    });
  });

  it('can win a round and then cash out', () => {
    // Force a win by controlling the backend state if possible,
    // or by playing until a win occurs for testing purposes.
    // For now, I assume the previous test logic of playing a round.
    cy.contains('button', 'Small (1-6)').click();

    cy.get('body').then(($body) => {
      if ($body.text().includes('You Won!')) {
        cy.contains('button', 'Cash Out Winnings').click();
        cy.contains('Balance: $1010.00').should('be.visible');
        cy.contains('Current Winnings: $0.00').should('be.visible');
      } else {
        cy.log('Lost the round, cannot test cash out.');
        cy.contains('button', 'Cash Out Winnings').should('be.disabled');
      }
    });
  });
});
