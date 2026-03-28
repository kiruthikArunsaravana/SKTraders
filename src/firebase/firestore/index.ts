export function collection(_firestoreOrNull: any, collectionName: string) {
  return { type: 'collection', collectionName };
}

function notifyCollectionChanged(collectionName: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('firestore-shim:changed', { detail: { collectionName } }));
}

export function doc(firestoreOrCollection: any, pathOrId?: string, maybeId?: string) {
  // Firebase-like overload: doc(firestore, 'collection', 'id')
  if (typeof pathOrId === 'string' && typeof maybeId === 'string') {
    return { type: 'doc', collectionName: pathOrId, id: maybeId };
  }

  // Convenience overload: doc('collection', 'id')
  if (typeof firestoreOrCollection === 'string') {
    return { type: 'doc', collectionName: firestoreOrCollection, id: pathOrId };
  }

  // doc(collectionRef) / doc(collectionRef, 'id')
  if (firestoreOrCollection && firestoreOrCollection.type === 'collection') {
    return { type: 'doc', collectionName: firestoreOrCollection.collectionName, id: pathOrId };
  }

  // Defensive fallback
  return { type: 'doc', collectionName: undefined, id: pathOrId };
}

export function query(collectionRef: any, ...args: any[]) {
  return { ...collectionRef, type: 'query', args };
}

export function orderBy(field: string, dir: 'asc' | 'desc' = 'asc') {
  return { op: 'orderBy', field, dir };
}

export function where(field: string, op: string, value: any) {
  return { op: 'where', field, comp: op, value };
}

export class Timestamp {
  private readonly date: Date;

  constructor(date: Date) {
    this.date = new Date(date);
  }

  static now() {
    return new Timestamp(new Date());
  }

  static fromDate(date: Date) {
    return new Timestamp(date);
  }

  toDate() {
    return new Date(this.date);
  }

  toMillis() {
    return this.date.getTime();
  }

  toJSON() {
    return this.date.toISOString();
  }
}

export function serverTimestamp() {
  return Timestamp.now();
}

export function limit(n: number) {
  return { op: 'limit', n };
}

// Lightweight getDocs that returns a snapshot-like object: { docs: [{ id, data, ref }] }
export async function getDocs(collectionRef: any) {
  const data = await fetchCollection(collectionRef.collectionName);
  return {
    docs: (data || []).map((item: any) => ({ id: item.id, data: () => item, ref: { collectionName: collectionRef.collectionName, id: item.id } }))
  };
}

// Lightweight writeBatch stub. Accumulates operations and performs them on commit.
export function writeBatch(_firestore?: any) {
  const ops: any[] = [];
  return {
    set(ref: any, data: any, options?: any) {
      ops.push({ op: 'set', collection: ref.collectionName, id: ref.id, data, options });
    },
    delete(ref: any) {
      ops.push({ op: 'delete', collection: ref.collectionName, id: ref.id });
    },
    async commit() {
      // Execute operations sequentially (best effort). Not atomic.
      for (const o of ops) {
        if (o.op === 'delete') {
          await fetch(`/api/${o.collection}/${o.id}`, { method: 'DELETE' }).catch(() => {});
        } else if (o.op === 'set') {
          if (o.id) {
            await fetch(`/api/${o.collection}/${o.id}`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(o.data) }).catch(() => {});
          } else {
            await fetch(`/api/${o.collection}`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(o.data) }).catch(() => {});
          }
        }
      }
    }
  };
}

// Transactions are performed server-side via API endpoints — throw helpful error if used on client.
export async function runTransaction(_firestore: any, _transactionFunc: any) {
  throw new Error('Transactions are now performed on the server. Call the appropriate API endpoint instead.');
}

export async function addDoc(collectionRef: any, data: any) {
  const res = await fetch(`/api/${collectionRef.collectionName}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    let message = '';
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      message = parsed?.error || '';
    } catch {
      message = raw;
    }
    throw new Error(message || `Failed to add document (HTTP ${res.status})`);
  }
  const json = await res.json();
  notifyCollectionChanged(collectionRef.collectionName);
  return json;
}

export async function setDoc(docRef: any, data: any, options?: any) {
  // If creating new (no id), POST to collection
  if (!docRef.id) {
    const res = await fetch(`/api/${docRef.collectionName}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to set document');
    const json = await res.json();
    notifyCollectionChanged(docRef.collectionName);
    return json;
  }
  const res = await fetch(`/api/${docRef.collectionName}/${docRef.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to set document');
  const json = await res.json();
  notifyCollectionChanged(docRef.collectionName);
  return json;
}

export async function updateDoc(docRef: any, data: any) {
  if (!docRef.id) throw new Error('Document reference requires an id for update');
  const res = await fetch(`/api/${docRef.collectionName}/${docRef.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to update document');
  const json = await res.json();
  notifyCollectionChanged(docRef.collectionName);
  return json;
}

// Simple read-only helpers for fetching lists and docs
export async function fetchCollection(collectionName: string) {
  const res = await fetch(`/api/${collectionName}`);
  if (!res.ok) throw new Error('Failed to fetch collection');
  return res.json();
}

export async function fetchDoc(collectionName: string, id: string) {
  const res = await fetch(`/api/${collectionName}/${id}`);
  if (!res.ok) return null;
  return res.json();
}
