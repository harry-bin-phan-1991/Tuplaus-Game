import axios from 'axios';

export const graphqlRequest = async <TData = unknown, TVariables extends Record<string, unknown> | undefined = undefined>(apiUrl: string, query: string, variables?: TVariables): Promise<TData> => {
  const response = await axios.post(apiUrl, { query, variables }, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (response.data?.errors) {
    const messages = (response.data.errors as Array<{ message: string }>).map(e => e.message).join('\n');
    throw new Error(messages);
  }
  return response.data.data as TData;
};


