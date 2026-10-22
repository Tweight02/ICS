import { Injectable } from '@angular/core';

/**
 * Same keys as the original HTML pages, so data created there keeps working.
 * Assistant and District Pastor share one key (the Director reads both).
 */
export const EVENT_STORAGE_KEYS = {
  church: 'churchRepresentativeEvents_v1',
  district: 'representativeEvents_v15_clean',
  assistant: 'representativeEvents_v15_clean',
};

/**
 * Thin wrapper over localStorage.
 * TODO: replace the body of load()/save() with HttpClient calls to the Laravel API.
 */
@Injectable({ providedIn: 'root' })
export class EventStorageService {
  load<T>(key: string): T[] | null {
    try {
      const d = JSON.parse(localStorage.getItem(key) || 'null');
      return Array.isArray(d) ? (d as T[]) : null;
    } catch {
      return null;
    }
  }

  save<T>(key: string, list: T[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(list));
    } catch {
      /* storage full / blocked */
    }
  }
}
