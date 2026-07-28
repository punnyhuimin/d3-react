import rawUsers from '@/data/users.json';

/** One row of the source dataset: a named user, their raw value, and the category it belongs to. */
export interface UserRecord {
  user: string;
  value: number;
  category: number;
}

function isUserRecord(candidate: unknown): candidate is UserRecord {
  if (typeof candidate !== 'object' || candidate === null) {
    return false;
  }
  const { user, value, category } = candidate as Record<keyof UserRecord, unknown>;
  return (
    typeof user === 'string' &&
    typeof value === 'number' &&
    Number.isFinite(value) &&
    typeof category === 'number' &&
    Number.isFinite(category)
  );
}

/**
 * Validates the statically imported dataset. Every figure in the app derives from this array, so a
 * malformed edit must fail here rather than surface downstream as `NaN` on an axis.
 */
export function parseUserRecords(candidate: unknown): UserRecord[] {
  if (!Array.isArray(candidate) || candidate.length === 0) {
    throw new Error('users.json must be a non-empty array of records');
  }
  candidate.forEach((record, index) => {
    if (!isUserRecord(record)) {
      throw new Error(
        `users.json record ${index} is malformed: expected { user: string, value: number, category: number }`,
      );
    }
  });
  return candidate as UserRecord[];
}

export const userRecords: UserRecord[] = parseUserRecords(rawUsers);
