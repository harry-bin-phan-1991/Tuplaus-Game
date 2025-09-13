import axios from 'axios';

// The base URL is no longer hardcoded here.
// It will be passed in for each request.

export const graphqlRequest = async (apiUrl: string, query: string, variables?: object) => {
  try {
    const response = await axios.post(apiUrl, { query, variables }, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.data.errors) {
      throw new Error(response.data.errors.map((e: any) => e.message).join('\n'));
    }
    return response.data.data;
  } catch (error) {
    console.error('GraphQL Request Failed:', error);
    throw error;
  }
};

export const GET_OR_CREATE_PLAYER_MUTATION = `
  mutation GetOrCreatePlayer($id: String!) {
    getOrCreatePlayer(id: $id) {
      id
      balance
      activeWinnings
    }
  }
`;
