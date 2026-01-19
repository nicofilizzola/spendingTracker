import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { deleteTransactions, getTransactions, type TransactionRow, initDb, updateTransaction } from '../db';

const categories = ['fun', 'groceries', 'boucherie'];
const formatDate = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(
    value.getDate()
  ).padStart(2, '0')}`;

export default function ExpensesScreen() {
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState(categories[0]);
  const [editLabel, setEditLabel] = useState('');
  const [editDate, setEditDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const reloadTransactions = useCallback(() => {
    setError(null);
    return initDb()
      .then(() => getTransactions())
      .then((results) => {
        setRows(results);
      })
      .catch((err: Error) => {
        setError(err.message || 'Could not load transactions.');
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setError(null);
      initDb()
        .then(() => getTransactions())
        .then((results) => {
          if (active) {
            setRows(results);
          }
        })
        .catch((err: Error) => {
          if (active) {
            setError(err.message || 'Could not load transactions.');
          }
        });
      return () => {
        active = false;
      };
    }, [])
  );

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      return;
    }

    try {
      await deleteTransactions(ids);
      await reloadTransactions();
      setSelectedIds(new Set());
      Alert.alert('Deleted', `Deleted ${ids.length} transaction(s).`);
    } catch {
      setError('Could not delete transactions.');
    }
  };

  const openEditModal = () => {
    const ids = Array.from(selectedIds);
    if (ids.length !== 1) {
      return;
    }
    const target = rows.find((row) => row.id === ids[0]);
    if (!target) {
      setError('Selected transaction not found.');
      return;
    }
    setEditAmount(String(target.amount));
    setEditCategory(target.category);
    setEditLabel(target.label ?? '');
    setEditDate(new Date(target.date));
    setEditing(true);
  };

  const handleEditSave = async () => {
    setError(null);
    const ids = Array.from(selectedIds);
    if (ids.length !== 1) {
      setError('Select a single transaction to edit.');
      return;
    }

    const parsedAmount = Number(editAmount.replace(',', '.'));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be a number greater than 0.');
      return;
    }

    if (!categories.includes(editCategory)) {
      setError('Category must be selected from the list.');
      return;
    }

    if (Number.isNaN(editDate.getTime())) {
      setError('Transaction date is required.');
      return;
    }

    try {
      const trimmedLabel = editLabel.trim();
      await updateTransaction(
        ids[0],
        parsedAmount,
        editCategory,
        trimmedLabel === '' ? null : trimmedLabel,
        formatDate(editDate)
      );
      await reloadTransactions();
      setSelectedIds(new Set());
      setEditing(false);
      Alert.alert('Updated', 'Transaction updated.');
    } catch {
      setError('Could not update the transaction.');
    }
  };

  const renderHeader = () => (
    <View style={[styles.row, styles.headerRow]}>
      <View style={styles.checkboxSpacer} />
      <Text style={[styles.headerText, styles.cell, styles.dateCell]}>Date</Text>
      <Text style={[styles.headerText, styles.cell, styles.categoryCell]}>Category</Text>
      <Text style={[styles.headerText, styles.cell, styles.labelCell]}>Label</Text>
      <Text style={[styles.headerText, styles.cell, styles.amountCell]}>Amount</Text>
    </View>
  );

  const renderItem = ({ item }: { item: TransactionRow }) => (
    <View style={[styles.row, selectedIds.has(item.id) && styles.rowSelected]}>
      <Pressable
        style={[styles.checkbox, selectedIds.has(item.id) && styles.checkboxSelected]}
        onPress={() => toggleSelection(item.id)}>
        {selectedIds.has(item.id) ? <Text style={styles.checkboxText}>✓</Text> : null}
      </Pressable>
      <Text style={[styles.cell, styles.dateCell]}>{item.date}</Text>
      <Text style={[styles.cell, styles.categoryCell]} numberOfLines={1}>
        {item.category}
      </Text>
      <Text style={[styles.cell, styles.labelCell]} numberOfLines={1}>
        {item.label ?? '-'}
      </Text>
      <Text style={[styles.cell, styles.amountCell]}>{item.amount.toFixed(2)}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Expenses</Text>
      <View style={styles.actionsRow}>
        <View style={styles.actionButtons}>
          <Pressable
            onPress={handleDelete}
            disabled={selectedIds.size === 0}
            style={[
              styles.deleteButton,
              selectedIds.size === 0 && styles.deleteButtonDisabled,
            ]}>
            <Text style={styles.deleteButtonText}>Delete</Text>
          </Pressable>
          <Pressable
            onPress={openEditModal}
            disabled={selectedIds.size !== 1}
            style={[
              styles.editButton,
              selectedIds.size !== 1 && styles.editButtonDisabled,
            ]}>
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
        </View>
        <Text style={styles.selectionText}>{selectedIds.size} selected</Text>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={<Text style={styles.emptyText}>No transactions yet</Text>}
        renderItem={renderItem}
        contentContainerStyle={rows.length === 0 ? styles.emptyContainer : undefined}
      />
      <Modal visible={editing} transparent animationType="slide" onRequestClose={() => setEditing(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Transaction</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Amount *</Text>
              <TextInput
                value={editAmount}
                onChangeText={setEditAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                style={styles.input}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Category *</Text>
              <View style={styles.optionGroup}>
                {categories.map((option) => {
                  const selected = option === editCategory;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => setEditCategory(option)}
                      style={[styles.option, selected && styles.optionSelected]}>
                      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Transaction Date *</Text>
              <Pressable style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateText}>{formatDate(editDate)}</Text>
              </Pressable>
              {(showDatePicker || Platform.OS === 'ios') && (
                <DateTimePicker
                  value={editDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(_event, selectedDate) => {
                    if (Platform.OS === 'android') {
                      setShowDatePicker(false);
                    }
                    if (selectedDate) {
                      setEditDate(selectedDate);
                    }
                  }}
                />
              )}
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Label (optional)</Text>
              <TextInput
                value={editLabel}
                onChangeText={setEditLabel}
                placeholder="Lunch with friends"
                style={styles.input}
              />
            </View>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setEditing(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.modalSaveButton]} onPress={handleEditSave}>
                <Text style={styles.modalSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
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
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#222222',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111111',
    backgroundColor: '#fafafa',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fafafa',
  },
  dateText: {
    fontSize: 16,
    color: '#111111',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e6e6e6',
  },
  rowSelected: {
    backgroundColor: '#f3f3f3',
  },
  headerRow: {
    borderBottomColor: '#cfcfcf',
  },
  cell: {
    fontSize: 14,
    color: '#222222',
    paddingRight: 8,
  },
  dateCell: {
    flex: 1.2,
  },
  categoryCell: {
    flex: 1.1,
  },
  labelCell: {
    flex: 1.8,
  },
  headerText: {
    fontWeight: '600',
  },
  amountCell: {
    flex: 1,
    textAlign: 'right',
  },
  checkbox: {
    width: 22,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#bcbcbc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxSpacer: {
    width: 22,
    marginRight: 8,
  },
  checkboxSelected: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },
  checkboxText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  deleteButton: {
    backgroundColor: '#111111',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonDisabled: {
    backgroundColor: '#bfc7db',
  },
  editButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  selectionText: {
    color: '#444444',
    fontSize: 13,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666666',
    marginTop: 12,
  },
  errorText: {
    color: '#b00020',
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalCancelButton: {
    backgroundColor: '#e2e2e2',
  },
  modalSaveButton: {
    backgroundColor: '#111111',
  },
  modalCancelText: {
    color: '#222222',
    fontWeight: '600',
  },
  modalSaveText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  optionGroup: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    backgroundColor: '#f5f5f5',
  },
  optionSelected: {
    borderColor: '#222222',
    backgroundColor: '#e8e8e8',
  },
  optionText: {
    fontSize: 14,
    color: '#333333',
  },
  optionTextSelected: {
    fontWeight: '600',
    color: '#111111',
  },
});
