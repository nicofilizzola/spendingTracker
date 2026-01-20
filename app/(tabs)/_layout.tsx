import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import TransactionForm from '../components/TransactionForm';

export default function TabLayout() {
  const [showForm, setShowForm] = useState(false);
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56;
  const fabBottom = tabBarHeight + insets.bottom + 12;

  return (
    <View style={styles.container}>
      <Tabs screenOptions={{ headerShown: false }} initialRouteName="budget">
        <Tabs.Screen
          name="budget"
          options={{
            title: 'Budget',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="pie-chart-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="expenses"
          options={{
            title: 'Expenses',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="receipt-outline" color={color} size={size} />
            ),
          }}
        />
      </Tabs>
      <Pressable style={[styles.fab, { bottom: fabBottom }]} onPress={() => setShowForm(true)}>
        <Ionicons name="add" size={28} color="#ffffff" />
      </Pressable>
      <Modal transparent visible={showForm} animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Transaction</Text>
              <Pressable style={styles.modalClose} onPress={() => setShowForm(false)}>
                <Ionicons name="close" size={20} color="#222222" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <TransactionForm onSaved={() => setShowForm(false)} />
              <Pressable style={styles.modalCancelButton} onPress={() => setShowForm(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
  },
  modalClose: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  modalContent: {
    paddingBottom: 12,
  },
  modalCancelButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#222222',
    fontWeight: '600',
  },
});
