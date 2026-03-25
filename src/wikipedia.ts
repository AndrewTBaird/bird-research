const API_URL = 'https://en.wikipedia.org/w/api.php';

export class BirdNotFoundError extends Error {
  constructor(name: string) {
    super(`No Wikipedia page found for "${name}"`);
    this.name = 'BirdNotFoundError';
  }
}

type WikiPage = { missing: true } | { extract: string };

export async function fetchBirdSummary(name: string): Promise<string> {
  const params = new URLSearchParams({
    action: 'query',
    prop: 'extracts',
    exintro: '1',
    explaintext: '1',
    redirects: '1',
    titles: name,
    format: 'json',
    formatversion: '2',
  });

  const response = await fetch(`${API_URL}?${params}`);
  if (!response.ok) {
    throw new Error(`Wikipedia API error: ${response.status}`);
  }

  const data = await response.json() as {
    query: { pages: WikiPage[] };
  };

  const page = data.query.pages[0];
  if ('missing' in page) {
    throw new BirdNotFoundError(name);
  }

  return page.extract;
}
