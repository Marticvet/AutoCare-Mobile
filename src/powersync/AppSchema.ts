import { column, Schema, TableV2 } from '@powersync/react-native';

export const VEHICLES_TABLE = 'vehicles';
export const TODOS_TABLE = 'todos';
export const PROFILES_TABLE = 'profiles';
export const FUEL_EXPENSES_TABLE = 'fuel_expenses';
export const INSURANCE_EXPENSES_TABLE = 'insurance_expenses';
export const SERVICE_EXPENSES_TABLE = 'service_expenses';

const vehicles = new TableV2({
  id: column.text,
  created_at: column.text,
  vehicle_brand: column.text,
  vehicle_car_type: column.text,
  vehicle_identification_number: column.text,
  vehicle_license_plate: column.text,
  vehicle_model: column.text,
  vehicle_model_year: column.integer,
  vehicle_year_of_manufacture: column.integer,
  current_mileage: column.integer,
  user_id: column.text,
});

const todos = new TableV2({
  task: column.text,
  user_id: column.text,
  is_complete: column.integer,
});

const profiles = new TableV2({
  id: column.text, // UUID as string
  updated_at: column.text,
  email: column.text,
  avatar_url: column.text,
  first_name: column.text,
  last_name: column.text,
  selected_vehicle_id: column.text,
  phone_number: column.text,
  username: column.text,
  full_name: column.text,
});

const fuel_expenses = new TableV2({
  id: column.text,
  odometer: column.integer,
  fuel_type: column.text,
  price_liter: column.real,
  total_cost: column.real,
  total_litres: column.real,
  full_tank: column.integer, // booleans are stored as 0/1
  gas_station: column.text,
  payment_method: column.text,
  notes: column.text,
  selected_vehicle_id: column.text,
  user_id: column.text,
  date: column.text, // ISO string
  time: column.text,
  location_name: column.text,
});

const insurance_expenses = new TableV2({
  id: column.text,
  odometer: column.integer,
  cost: column.real,
  valid_from: column.text,
  valid_to: column.text,
  notes: column.text,
  user_id: column.text,
  selected_vehicle_id: column.text,
});

const service_expenses = new TableV2({
  id: column.text,
  type_of_service: column.text,
  cost: column.real,
  place: column.text,
  payment_method: column.text,
  notes: column.text,
  selected_vehicle_id: column.text,
  user_id: column.text,
  date: column.text,
  time: column.text,
  odometer: column.integer,
  location_name: column.text,
});

export const AppSchema = new Schema({
  vehicles,
  todos,
  profiles,
  fuel_expenses,
  insurance_expenses,
  service_expenses,
});

export type Database = (typeof AppSchema)['types'];
export type Vehicle = Database['vehicles'];
export type Todo = Database['todos'];
export type Profile = Database['profiles'];
export type FuelExpense = Database['fuel_expenses'];
export type InsuranceExpense = Database['insurance_expenses'];
export type ServiceExpense = Database['service_expenses'];
