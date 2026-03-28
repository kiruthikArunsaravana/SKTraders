'use client';
    
import { useState, useEffect } from 'react';
import { DocumentData, FirestoreError } from '@/firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useDoc hook.
 * @template T Type of the document data.
 */
export interface UseDocResult<T> {
  data: WithId<T> | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/**
 * React hook to subscribe to a single Firestore document in real-time.
 * Handles nullable references.
 * 
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {DocumentReference<DocumentData> | null | undefined} docRef -
 * The Firestore DocumentReference. Waits if null/undefined.
 * @returns {UseDocResult<T>} Object with data, isLoading, error.
 */
export function useDoc<T = any>(
  memoizedDocRef: DocumentReference<DocumentData> | null | undefined,
): UseDocResult<T> {
  type StateDataType = WithId<T> | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const collectionName = memoizedDocRef?.collectionName;
    const onChanged = (event: Event) => {
      const changedCollection = (event as CustomEvent<{ collectionName?: string }>)?.detail?.collectionName;
      if (collectionName && changedCollection === collectionName) {
        setRefreshTick((v) => v + 1);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('firestore-shim:changed', onChanged as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('firestore-shim:changed', onChanged as EventListener);
      }
    };
  }, [memoizedDocRef]);

  useEffect(() => {
    if (!memoizedDocRef) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const collectionName = memoizedDocRef.collectionName;
      const id = memoizedDocRef.id;
      if (collectionName && id) {
        fetch(`/api/${collectionName}/${id}`)
          .then(async (r) => {
            if (!r.ok) {
              setData(null);
              setIsLoading(false);
              setError(new Error('Not found'));
              return;
            }
            const item = await r.json();
            setData({ ...(transformDates(item) as T), id: item.id });
            setIsLoading(false);
          })
          .catch((err) => {
            const contextualError = new FirestorePermissionError({ operation: 'get', path: `${collectionName}/${id}` });
            setError(contextualError);
            setData(null);
            setIsLoading(false);
            errorEmitter.emit('permission-error', contextualError);
          });
        return;
      }
    } catch (err) {
      // fallthrough
    }

    setError(new Error('Unsupported doc ref'));
    setIsLoading(false);
  }, [memoizedDocRef, refreshTick]); // Re-run if the memoizedDocRef changes or its collection mutates.

  function transformDates(obj: any) {
    const out: any = {};
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      const looksLikeDateField = /date|createdAt|updatedAt|modifiedDate|weekStart/i.test(k);
      if (looksLikeDateField && typeof v === 'string' && !Number.isNaN(Date.parse(v))) {
        out[k] = { toDate: () => new Date(v) };
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  return { data, isLoading, error };
}
