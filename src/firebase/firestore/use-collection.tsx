'use client';

import { useState, useEffect } from 'react';
import {
  DocumentData,
  FirestoreError,
} from '@/firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 * 
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *  
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const collectionName = memoizedTargetRefOrQuery?.collectionName || memoizedTargetRefOrQuery?.collection;
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
  }, [memoizedTargetRefOrQuery]);

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    // If this looks like our custom query object
    try {
      const collectionName = memoizedTargetRefOrQuery.collectionName || memoizedTargetRefOrQuery.collection;
      if (collectionName) {
        fetch(`/api/${collectionName}`)
          .then(async (r) => {
            if (!r.ok) throw new Error('Failed to fetch collection');
            const json = await r.json();
            // Convert date-like strings to objects with toDate()
            const results: ResultItemType[] = (json || []).map((item: any) => ({
              ...transformDates(item),
              id: item.id || item.ID || item.id,
            }));
            setData(results);
            setIsLoading(false);
          })
          .catch((err) => {
            const contextualError = new FirestorePermissionError({ operation: 'list', path: collectionName });
            setError(contextualError);
            setData(null);
            setIsLoading(false);
            errorEmitter.emit('permission-error', contextualError);
          });
        return;
      }
    } catch (err) {
      // fallthrough to old behavior if not our query
    }

    // Fallback: if unknown type, set error
    setError(new Error('Unsupported query type'));
    setIsLoading(false);
  }, [memoizedTargetRefOrQuery, refreshTick]); // Re-run if the target query/reference changes or collection is mutated.

  if(memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    throw new Error(memoizedTargetRefOrQuery + ' was not properly memoized using useMemoFirebase');
  }

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
