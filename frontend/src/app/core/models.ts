export type Role = 'player' | 'owner' | 'admin';

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  role: Role;
  status?: 'active' | 'suspended';
  created_at?: string;
}

export interface Facility {
  id: number;
  name: string;
  description?: string;
  address: string;
  city: string;
  contact_phone?: string;
  open_hour: number;
  close_hour: number;
  status?: 'pending' | 'approved' | 'suspended';
  plan?: 'starter' | 'pro' | 'club';
  gcash_name?: string;
  gcash_number?: string;
  gcash_qr?: string;
  court_count?: number;
  min_rate?: number;
  surfaces?: string;
  owner_name?: string;
  owner_email?: string;
  courts?: Court[];
}

export interface Court {
  id: number;
  facility_id?: number;
  name: string;
  surface: 'indoor' | 'outdoor' | 'covered';
  hourly_rate: number;
  is_active?: number;
}

export type SlotStatus = 'available' | 'booked' | 'blocked' | 'past';
export interface CourtAvailability extends Court { slots: { hour: number; status: SlotStatus }[]; }
export interface Availability { date: string; open_hour: number; close_hour: number; courts: CourtAvailability[]; }

export type BookingStatus = 'pending_payment' | 'for_verification' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';

export interface Booking {
  id: number;
  reference_code: string;
  player_id: number;
  court_id: number;
  booking_date: string;
  start_hour: number;
  end_hour: number;
  total_amount: number;
  status: BookingStatus;
  gcash_reference?: string;
  payment_proof?: string;
  notes?: string;
  created_at?: string;
  hold_seconds?: number;
  hold_minutes?: number;
  court_name?: string;
  surface?: string;
  facility_id?: number;
  facility_name?: string;
  address?: string;
  city?: string;
  gcash_name?: string;
  gcash_number?: string;
  gcash_qr?: string;
  paid_to_platform?: boolean;
  player_name?: string;
  player_email?: string;
  player_phone?: string;
}

export interface BlockedSlot { id: number; court_id: number; court_name: string; block_date: string; start_hour: number; end_hour: number; reason?: string; }

export interface OwnerStats {
  today_bookings: number;
  to_verify: number;
  upcoming: number;
  month_revenue: number;
  popular_hours: { hour: number; total: number }[];
  week: { date: string; revenue: number; bookings: number }[];
}

export interface AdminStats {
  players: number; owners: number;
  facilities_total: number; facilities_approved: number; facilities_pending: number;
  bookings_total: number; bookings_successful: number; gross_bookings: number;
  plans: { starter: number; pro: number; club: number };
  mrr: number;
}
