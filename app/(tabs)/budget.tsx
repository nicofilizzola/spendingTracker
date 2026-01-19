import { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import {
  deleteBudgetForMonth,
  getMonthlyBudgetsWithFallbackStatus,
  getMonthlyCategoryTotals,
  initDb,
  upsertBudget,
} from '../db';
import { formatEUR } from '../utils/format';
import DonutChart from '../components/DonutChart';

const categories = ['fun', 'groceries', 'boucherie'];
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getMonthStartDate = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const formatMonthStart = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;

const formatMonthEnd = (date: Date) => {
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
};

const formatMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

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
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState('0');
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [budgets, setBudgets] = useState<Record<string, number>>({
    fun: 0,
    groceries: 0,
    boucherie: 0,
  });
  const [exactBudgets, setExactBudgets] = useState<Record<string, boolean>>({
    fun: false,
    groceries: false,
    boucherie: false,
  });
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
    const monthKey = formatMonthKey(selectedMonth);

    initDb()
      .then(() =>
        Promise.all([
          getMonthlyCategoryTotals(monthStart, monthEnd),
          getMonthlyBudgetsWithFallbackStatus(monthKey, categories),
        ])
      )
      .then(([totalRows, budgetResults]) => {
        if (!active) {
          return;
        }
        const nextTotals: Record<string, number> = {
          fun: 0,
          groceries: 0,
          boucherie: 0,
        };
        totalRows.forEach((row) => {
          if (row.category in nextTotals) {
            nextTotals[row.category] = row.total ?? 0;
          }
        });
        setTotals(nextTotals);
        setBudgets(budgetResults.amounts);
        setExactBudgets(budgetResults.exact);
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

  const openBudgetEditor = (category: string) => {
    setEditingCategory(category);
    setEditingAmount(String(budgets[category] ?? 0));
    setBudgetError(null);
  };

  const closeBudgetEditor = () => {
    setEditingCategory(null);
    setBudgetError(null);
  };

  const handleBudgetSave = async () => {
    if (!editingCategory) {
      return;
    }
    const parsedAmount = Number(editingAmount.replace(',', '.'));
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setBudgetError('Enter a valid amount (0 or more).');
      return;
    }

    try {
      const monthKey = formatMonthKey(selectedMonth);
      await upsertBudget(monthKey, editingCategory, parsedAmount);
      await loadTotals();
      closeBudgetEditor();
      Alert.alert('Budget updated', 'Budget updated.');
    } catch {
      setError('Could not update budget.');
    }
  };

  const handleBudgetReset = async (category: string) => {
    const monthKey = formatMonthKey(selectedMonth);
    try {
      await deleteBudgetForMonth(monthKey, category);
      await loadTotals();
      Alert.alert('Budget reset', 'Budget reset for this month.');
    } catch {
      setError('Could not reset budget.');
    }
  };

  const parsedEditingAmount = Number(editingAmount.replace(',', '.'));
  const isSaveDisabled =
    editingAmount.trim() === '' ||
    !Number.isFinite(parsedEditingAmount) ||
    parsedEditingAmount < 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
        <Text style={styles.panelTitle}>Monthly Budget</Text>
        {categories.map((category) => (
          <View key={category} style={styles.row}>
            <Text style={styles.categoryText}>{category}</Text>
            <View style={styles.budgetRowRight}>
              <Text style={styles.amountText}>{formatEUR(budgets[category])}</Text>
              <Pressable
                style={styles.editButton}
                onPress={() => openBudgetEditor(category)}>
                <Ionicons name="pencil" size={16} color="#222222" />
              </Pressable>
              <Pressable
                style={[
                  styles.resetButton,
                  !exactBudgets[category] && styles.resetButtonDisabled,
                ]}
                disabled={!exactBudgets[category]}
                onPress={() => handleBudgetReset(category)}>
                <Ionicons
                  name="refresh"
                  size={16}
                  color={exactBudgets[category] ? '#222222' : '#888888'}
                />
              </Pressable>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.donutSection}>
        {categories.map((category) => {
          const spent = totals[category];
          const expected = budgets[category];
          const pct = expected > 0 ? (spent / expected) * 100 : 0;
          const progress = expected > 0 ? Math.min(spent / expected, 1) : 0;
          return (
            <View key={category} style={styles.donutCard}>
              <Text style={styles.donutTitle}>{category}</Text>
              <DonutChart progress={progress} percent={pct} />
              <Text style={styles.donutCaption}>
                Spent {formatEUR(spent)} / Expected {formatEUR(expected)}
              </Text>
            </View>
          );
        })}
      </View>
      </ScrollView>
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
      <Modal transparent visible={editingCategory !== null} animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={closeBudgetEditor}>
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Edit Budget</Text>
            <Text style={styles.modalSubtitle}>
              {editingCategory} • {formatMonthLabel(selectedMonth)}
            </Text>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Amount</Text>
              <TextInput
                value={editingAmount}
                onChangeText={(value) => {
                  setEditingAmount(value);
                  if (budgetError) {
                    setBudgetError(null);
                  }
                }}
                keyboardType="decimal-pad"
                placeholder="0.00"
                style={[styles.modalInput, budgetError && styles.modalInputError]}
                autoFocus
              />
              {budgetError ? <Text style={styles.inputErrorText}>{budgetError}</Text> : null}
            </View>
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalButton, styles.modalCancelButton]} onPress={closeBudgetEditor}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalButton,
                  styles.modalSaveButton,
                  isSaveDisabled && styles.modalSaveButtonDisabled,
                ]}
                disabled={isSaveDisabled}
                onPress={handleBudgetSave}>
                <Text style={styles.modalSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 48,
    flexGrow: 1,
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
    marginBottom: 12,
  },
  budgetRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#e6e6e6',
  },
  resetButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#e6e6e6',
  },
  resetButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: '#222222',
  },
  donutSection: {
    gap: 12,
  },
  donutCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  donutTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  donutCaption: {
    marginTop: 12,
    fontSize: 13,
    color: '#444444',
    textAlign: 'center',
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
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSubtitle: {
    color: '#555555',
    marginBottom: 16,
    marginTop: 4,
  },
  modalField: {
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444444',
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111111',
    backgroundColor: '#f7f7f7',
  },
  modalInputError: {
    borderColor: '#b00020',
  },
  inputErrorText: {
    color: '#b00020',
    marginTop: 6,
    fontSize: 12,
  },
  monthOption: {
    paddingVertical: 10,
  },
  monthOptionText: {
    fontSize: 15,
    color: '#222222',
  },
  modalActions: {
    gap: 10,
    marginTop: 4,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    borderWidth: 1,
    borderColor: '#c8c8c8',
    backgroundColor: '#ffffff',
  },
  modalSaveButton: {
    backgroundColor: '#111111',
  },
  modalSaveButtonDisabled: {
    backgroundColor: '#c8c8c8',
  },
  modalCancelText: {
    color: '#222222',
    fontWeight: '600',
  },
  modalSaveText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
