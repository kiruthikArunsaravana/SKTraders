export async function signInWithEmailAndPassword(_auth: any, email: string, password: string) {
  const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (!res.ok) throw new Error('Login failed');
  return res.json();
}

export async function createUserWithEmailAndPassword(_auth: any, email: string, password: string) {
  const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (!res.ok) throw new Error('Registration failed');
  return res.json();
}

export async function signOut() {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
}
