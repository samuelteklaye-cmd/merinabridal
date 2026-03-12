export type Role = 'admin' | 'cashier';

export interface User {
  id: number;
  username: string;
  role: Role;
}

export interface InventoryItem {
  id: number;
  code: string;
  category: 'suit' | 'wedding_dress' | 'dress';
  size: string;
  status: 'available' | 'rented' | 'sold' | 'maintenance';
  price_rental: number;
  price_sale: number;
}

export interface Rental {
  id: number;
  item_id: number;
  item_code: string;
  item_category: string;
  customer_name: string;
  customer_phone: string;
  customer_id_number: string;
  start_date: string;
  expiry_date: string;
  return_date?: string;
  total_amount: number;
  paid_amount: number;
  penalty_amount: number;
  status: 'active' | 'returned' | 'overdue';
}

export interface Sale {
  id: number;
  item_id: number;
  customer_name: string;
  sale_date: string;
  amount: number;
}

export interface DashboardStats {
  activeRentals: number;
  overdueRentals: number;
  totalSales: number;
  totalPenalties: number;
  revenue: number;
  totalDue: number;
  totalPaid: number;
}
