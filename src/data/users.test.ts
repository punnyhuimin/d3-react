import { parseUserRecords, userRecords } from '@/data/users';

describe('userRecords', () => {
  it('parses to a non-empty array', () => {
    expect(Array.isArray(userRecords)).toBe(true);
    expect(userRecords.length).toBeGreaterThan(0);
  });

  it('gives every record a string user and finite numeric value and category', () => {
    for (const record of userRecords) {
      expect(typeof record.user).toBe('string');
      expect(record.user.length).toBeGreaterThan(0);
      expect(Number.isFinite(record.value)).toBe(true);
      expect(Number.isFinite(record.category)).toBe(true);
    }
  });
});

describe('parseUserRecords', () => {
  it('rejects a non-array', () => {
    expect(() => parseUserRecords({ user: 'a', value: 1, category: 1 })).toThrow(/non-empty array/);
  });

  it('rejects an empty array', () => {
    expect(() => parseUserRecords([])).toThrow(/non-empty array/);
  });

  it('rejects a record with a non-finite value', () => {
    expect(() => parseUserRecords([{ user: 'a', value: Number.NaN, category: 1 }])).toThrow(
      /record 0 is malformed/,
    );
  });

  it('rejects a record with a missing field', () => {
    expect(() => parseUserRecords([{ user: 'a', value: 1 }])).toThrow(/record 0 is malformed/);
  });
});
