import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { getMonthlyCategoryTotals, initDb } from '../db';

const categories = ['fun', 'groceries', 'boucherie'];
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getMonthStartDate = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const formatMonthStart = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;

const formatMonthEnd = (date: Date) => {
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
};

const formatMonthLabel = (date: Date) =>
  `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

const getMonthsFromCurrent = (baseDate: Date, count: number) => {
  const months: Date[] = [];
  for (let i = 0; i <= count; i += 1) {
    months.push(new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1));
  }
  return months;
};

export default function BudgetScreen() {
  const [selectedMonth, setSelectedMonth] = useState(getMonthStartDate(new Date()));
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [totals, setTotals] = useState<Record<string, number>>({
    fun: 0,
    groceries: 0,
    boucherie: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const monthOptions = useMemo(() => getMonthsFromCurrent(new Date(), 12), []);

  const loadTotals = useCallback(() => {
    let active = true;
    setError(null);

    const monthStart = formatMonthStart(selectedMonth);
    const monthEnd = formatMonthEnd(selectedMonth);

    initDb()
      .then(() => getMonthlyCategoryTotals(monthStart, monthEnd))
      .then((rows) => {
        if (!active) {
          return;
        }
        const nextTotals: Record<string, number> = {
          fun: 0,
          groceries: 0,
          boucherie: 0,
        };
        rows.forEach((row) => {
          if (row.category in nextTotals) {
            nextTotals[row.category] = row.total ?? 0;
          }
        });
        setTotals(nextTotals);
      })
      .catch((err: Error) => {
        if (active) {
          setError(err.message || 'Could not load totals.');
        }
      });

    return () => {
      active = false;
    };
  }, [selectedMonth]);

  useFocusEffect(loadTotals);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Budget</Text>
      <View style={styles.monthRow}>
        <Text style={styles.monthLabel}>Month</Text>
        <Pressable style={styles.monthSelect} onPress={() => setShowMonthPicker(true)}>
          <Text style={styles.monthText}>{formatMonthLabel(selectedMonth)}</Text>
          <Ionicons name="chevron-down" size={18} color="#444444" />
        </Pressable>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.card}>
        {categories.map((category) => (
          <View key={category} style={styles.row}>
            <Text style={styles.categoryText}>{category}</Text>
            <Text style={styles.amountText}>{totals[category].toFixed(2)}</Text>
          </View>
        ))}
      </View>
      <Modal
        transparent
        visible={showMonthPicker}
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowMonthPicker(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Month</Text>
            {monthOptions.map((month) => (
              <Pressable
                key={`${month.getFullYear()}-${month.getMonth()}`}
                style={styles.monthOption}
                onPress={() => {
                  setSelectedMonth(month);
                  setShowMonthPicker(false);
                }}>
                <Text style={styles.monthOptionText}>{formatMonthLabel(month)}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 48,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
  },
  monthRow: {
    marginBottom: 12,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#222222',
    marginBottom: 6,
  },
  monthSelect: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fafafa',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthText: {
    fontSize: 16,
    color: '#111111',
  },
  card: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fafafa',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e6e6e6',
  },
  categoryText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#222222',
    textTransform: 'capitalize',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111111',
  },
  errorText: {
    color: '#b00020',
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  monthOption: {
    paddingVertical: 10,
  },
  monthOptionText: {
    fontSize: 15,
    color: '#222222',
  },
});
