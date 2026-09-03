export async function deleteOldImage(url: string | null | undefined): Promise<void> {
  if (!url) return;

  try {
    const res = await fetch('/api/uploads/delete', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      console.error('Failed to delete old image:', url, res.status);
    }
  } catch (err) {
    console.error('Failed to delete old image:', url, err);
  }
}
