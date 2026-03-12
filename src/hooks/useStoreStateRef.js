import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

export function useStoreStateRef() {
    const storeStateRef = useRef(useStore.getState());

    useEffect(() => {
        storeStateRef.current = useStore.getState();
        return useStore.subscribe((nextState) => {
            storeStateRef.current = nextState;
        });
    }, []);

    return storeStateRef;
}
