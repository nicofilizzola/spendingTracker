import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { initDb, insertTransaction } from '../db';
import { emitTransactionsChanged } from '../utils/transactions-events';

const categories = ['fun', 'groceries', 'boucherie'];
const formatDate = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(
    value.getDate()
  ).padStart(2, '0')}`;

type TransactionFormProps = {
  onSaved?: () => void;
};

export default function TransactionForm({ onSaved }: TransactionFormProps) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [label, setLabel] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    initDb()
      .then(() => {
        if (isMounted) {
          setDbReady(true);
        }
      })
      .catch((err: Error) => {
        if (isMounted) {
          setError(err.message || 'Could not initialize the database.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    const parsedAmount = Number(amount.replace(',', '.'));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be a number greater than 0.');
      return;
    }

    if (!categories.includes(category)) {
      setError('Category must be selected from the list.');
      return;
    }

    if (Number.isNaN(transactionDate.getTime())) {
      setError('Transaction date is required.');
      return;
    }

    if (!dbReady) {
      setError('Database is not ready.');
      return;
    }

    try {
      const trimmedLabel = label.trim();
      const date = formatDate(transactionDate);
      await insertTransaction(
        parsedAmount,
        category,
        trimmedLabel === '' ? null : trimmedLabel,
        date
      );
      setAmount('');
      setCategory(categories[0]);
      setLabel('');
      setTransactionDate(new Date());
      setSuccess('Saved.');
      emitTransactionsChanged();
      onSaved?.();
    } catch {
      setError('Could not save the transaction.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <Text style={styles.label}>
          Amount <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>
          Category <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.optionGroup}>
          {categories.map((option) => {
            const selected = option === category;
            return (
              <Pressable
                key={option}
                onPress={() => setCategory(option)}
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
        <Text style={styles.label}>
          Transaction Date <Text style={styles.required}>*</Text>
        </Text>
        <Pressable style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateText}>{formatDate(transactionDate)}</Text>
        </Pressable>
        {(showDatePicker || Platform.OS === 'ios') && (
          <DateTimePicker
            value={transactionDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_event, selectedDate) => {
              if (Platform.OS === 'android') {
                setShowDatePicker(false);
              }
              if (selectedDate) {
                setTransactionDate(selectedDate);
              }
            }}
          />
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Label (optional)</Text>
        <TextInput
          value={label}
          onChangeText={setLabel}
          placeholder="Lunch with friends"
          style={styles.input}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {success ? <Text style={styles.successText}>{success}</Text> : null}

      <Pressable style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitText}>Submit</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  field: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#222222',
  },
  required: {
    color: '#cc0000',
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
  submitButton: {
    marginTop: 12,
    backgroundColor: '#111111',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#b00020',
    marginBottom: 8,
  },
  successText: {
    color: '#0a7d23',
    marginBottom: 8,
  },
});
