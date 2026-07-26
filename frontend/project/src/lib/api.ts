export const API_URL = 'http://localhost:8000';
export const API_TOKEN = '26ec0df5540460dc9befae5e3565b8d49473b4c362616c58';

export function getHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${API_TOKEN}`,
  };
}
