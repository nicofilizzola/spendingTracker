import { Platform } from 'react-native';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

export type TransactionRow = {
  id: number;
  amount: number;
  category: string;
  label: string | null;
  date: string;
};

let dbPromise: Promise<SQLiteDatabase> | null = null;

async function getDb() {
  if (Platform.OS === 'web') {
    throw new Error('SQLite is not available on web without SharedArrayBuffer support.');
  }

  if (!dbPromise) {
    dbPromise = openDatabaseAsync('spending.db');
  }

  return dbPromise;
}

export async function initDb() {
  const db = await getDb();
  await db.execAsync(
    'CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, amount REAL NOT NULL, category TEXT NOT NULL, label TEXT NULL, date TEXT NOT NULL)'
  );
  await db.execAsync(
    'CREATE TABLE IF NOT EXISTS budgets (id INTEGER PRIMARY KEY AUTOINCREMENT, month TEXT NOT NULL, category TEXT NOT NULL, amount REAL NOT NULL)'
  );
  await db.execAsync(
    'CREATE UNIQUE INDEX IF NOT EXISTS budgets_month_category_idx ON budgets(month, category)'
  );
  return db;
}

export async function insertTransaction(
  amount: number,
  category: string,
  label: string | null,
  date: string
) {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO transactions (amount, category, label, date) VALUES (?, ?, ?, ?)',
    amount,
    category,
    label,
    date
  );
}

export async function getTransactions() {
  const db = await getDb();
  return db.getAllAsync<TransactionRow>(
    'SELECT id, amount, category, label, date FROM transactions ORDER BY id DESC'
  );
}

export async function deleteTransactions(ids: number[]) {
  if (ids.length === 0) {
    return;
  }

  const db = await getDb();
  const placeholders = ids.map(() => '?').join(', ');
  await db.runAsync(`DELETE FROM transactions WHERE id IN (${placeholders})`, ...ids);
}

export async function updateTransaction(
  id: number,
  amount: number,
  category: string,
  label: string | null,
  date: string
) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE transactions SET amount = ?, category = ?, label = ?, date = ? WHERE id = ?',
    amount,
    category,
    label,
    date,
    id
  );
}

export async function getMonthlyCategoryTotals(monthStart: string, monthEnd: string) {
  const db = await getDb();
  return db.getAllAsync<{ category: string; total: number }>(
    'SELECT category, SUM(amount) as total FROM transactions WHERE date >= ? AND date < ? GROUP BY category',
    monthStart,
    monthEnd
  );
}

export async function getMonthlyBudgets(month: string) {
  const db = await getDb();
  return db.getAllAsync<{ category: string; amount: number }>(
    'SELECT category, amount FROM budgets WHERE month = ?',
    month
  );
}

export async function upsertBudget(month: string, category: string, amount: number) {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO budgets (month, category, amount) VALUES (?, ?, ?) ON CONFLICT(month, category) DO UPDATE SET amount = excluded.amount',
    month,
    category,
    amount
  );
}
