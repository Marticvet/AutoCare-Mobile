import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';

const HomePage: React.FC = () => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Welcome Header */}
      <Text style={styles.welcomeText}>Welcome back, John!</Text>

      {/* Quick Stats Section */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Vehicles</Text>
          <Text style={styles.statValue}>3</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Upcoming Maintenance</Text>
          <Text style={styles.statValue}>2</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Fuel Economy</Text>
          <Text style={styles.statValue}>8.5 L/100km</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Monthly Expenses</Text>
          <Text style={styles.statValue}>€200</Text>
        </View>
      </View>

      {/* Vehicle Cards */}
      <View style={styles.vehicleSection}>
        <Text style={styles.sectionTitle}>Your Vehicles</Text>
        <View style={styles.vehicleCard}>
          <Text style={styles.vehicleName}>Toyota Camry</Text>
          <Text style={styles.vehicleInfo}>Mileage: 50,000 km</Text>
          <Text style={styles.vehicleInfo}>Next Maintenance: Oil Change</Text>
        </View>
        <View style={styles.vehicleCard}>
          <Text style={styles.vehicleName}>Honda Accord</Text>
          <Text style={styles.vehicleInfo}>Mileage: 30,000 km</Text>
          <Text style={styles.vehicleInfo}>Next Maintenance: Tire Rotation</Text>
        </View>
      </View>

      {/* Add Vehicle / Log Expense / Log Fuel Buttons */}
      <View style={styles.actionButtons}>
        <Pressable style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Add Vehicle</Text>
        </Pressable>
        <Pressable style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Log Fuel</Text>
        </Pressable>
        <Pressable style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Record Expense</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f0f2f5',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  statLabel: {
    fontSize: 16,
    color: '#888',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  vehicleSection: {
    width: '100%',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  vehicleCard: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  vehicleInfo: {
    fontSize: 16,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  actionButton: {
    backgroundColor: '#ff7a59',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default HomePage;
