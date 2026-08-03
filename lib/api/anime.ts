export async function fetchAnimeApi<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('API Error');
    return await res.json() as T;
  } catch (error) {
    console.error('Fetch error:', error);
    return fallback;
  }
}
