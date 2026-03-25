const API_URL = 'https://en.wikipedia.org/w/api.php';

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
  const data = await response.json() as {
    query: { pages: Array<{ extract: string }> };
  };

  return data.query.pages[0].extract;
}
