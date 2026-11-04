import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import {
  AdminStats, Availability, BlockedSlot, Booking, Court, Facility, OwnerStats, User,
} from './models';

type Msg = { message: string };

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl + '/api';

  /** Turns '/uploads/qr/x.png' into a full URL served by the backend */
  asset(path?: string | null): string {
    if (!path) return '';
    return path.startsWith('http') ? path : environment.apiUrl + path;
  }

  private params(obj: Record<string, any>) {
    let p = new HttpParams();
    Object.entries(obj).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v)); });
    return p;
  }

  // ---------- Auth ----------
  login(body: { email: string; password: string }) { return this.http.post<{ token: string; user: User }>(`${this.base}/auth/login`, body); }
  register(body: any) { return this.http.post<{ token: string; user: User }>(`${this.base}/auth/register`, body); }
  me() { return this.http.get<{ user: User }>(`${this.base}/auth/me`); }

  // ---------- Public ----------
  facilities(q = '', city = '') { return this.http.get<Facility[]>(`${this.base}/facilities`, { params: this.params({ q, city }) }); }
  cities() { return this.http.get<string[]>(`${this.base}/facilities/cities`); }
  facility(id: number) { return this.http.get<Facility>(`${this.base}/facilities/${id}`); }
  availability(id: number, date: string) { return this.http.get<Availability>(`${this.base}/facilities/${id}/availability`, { params: this.params({ date }) }); }

  // ---------- Player bookings ----------
  createBooking(body: { court_id: number; date: string; start_hour: number; hours: number; notes?: string }) {
    return this.http.post<Booking>(`${this.base}/bookings`, body);
  }
  myBookings() { return this.http.get<Booking[]>(`${this.base}/bookings/mine`); }
  booking(id: number) { return this.http.get<Booking>(`${this.base}/bookings/${id}`); }
  submitPayment(id: number, reference: string, proof: File) {
    const fd = new FormData();
    fd.append('gcash_reference', reference);
    fd.append('proof', proof);
    return this.http.post<Msg>(`${this.base}/bookings/${id}/payment`, fd);
  }
  cancelBooking(id: number) { return this.http.patch<Msg>(`${this.base}/bookings/${id}/cancel`, {}); }

  // ---------- Owner ----------
  ownerStats() { return this.http.get<OwnerStats>(`${this.base}/owner/stats`); }
  ownerFacilities() { return this.http.get<Facility[]>(`${this.base}/owner/facilities`); }
  addFacility(body: Partial<Facility>) { return this.http.post<Msg & { id: number }>(`${this.base}/owner/facilities`, body); }
  updateFacility(id: number, body: Partial<Facility>) { return this.http.put<Msg>(`${this.base}/owner/facilities/${id}`, body); }
  uploadFacilityQr(id: number, file: File) {
    const fd = new FormData(); fd.append('qr', file);
    return this.http.post<Msg & { gcash_qr: string }>(`${this.base}/owner/facilities/${id}/qr`, fd);
  }
  ownerCourts(facilityId: number) { return this.http.get<Court[]>(`${this.base}/owner/facilities/${facilityId}/courts`); }
  addCourt(facilityId: number, body: Partial<Court>) { return this.http.post<Msg>(`${this.base}/owner/facilities/${facilityId}/courts`, body); }
  updateCourt(id: number, body: Partial<Court> | { is_active: boolean }) { return this.http.put<Msg>(`${this.base}/owner/courts/${id}`, body); }
  deleteCourt(id: number) { return this.http.delete<Msg>(`${this.base}/owner/courts/${id}`); }
  ownerBlocks(facilityId: number) { return this.http.get<BlockedSlot[]>(`${this.base}/owner/facilities/${facilityId}/blocks`); }
  addBlock(courtId: number, body: { date: string; start_hour: number; end_hour: number; reason?: string }) {
    return this.http.post<Msg>(`${this.base}/owner/courts/${courtId}/blocks`, body);
  }
  deleteBlock(id: number) { return this.http.delete<Msg>(`${this.base}/owner/blocks/${id}`); }
  ownerBookings(filters: { status?: string; date?: string; facility_id?: number | string } = {}) {
    return this.http.get<Booking[]>(`${this.base}/owner/bookings`, { params: this.params(filters) });
  }
  setBookingStatus(id: number, status: string) { return this.http.patch<Msg>(`${this.base}/owner/bookings/${id}`, { status }); }

  // ---------- Admin ----------
  adminStats() { return this.http.get<AdminStats>(`${this.base}/admin/stats`); }
  adminFacilities(status = '') { return this.http.get<Facility[]>(`${this.base}/admin/facilities`, { params: this.params({ status }) }); }
  adminUpdateFacility(id: number, body: { status?: string; plan?: string }) { return this.http.patch<Msg>(`${this.base}/admin/facilities/${id}`, body); }
  adminUsers(role = '', q = '') { return this.http.get<User[]>(`${this.base}/admin/users`, { params: this.params({ role, q }) }); }
  adminSetUserStatus(id: number, status: string) { return this.http.patch<Msg>(`${this.base}/admin/users/${id}`, { status }); }
  adminBookings(status = '') { return this.http.get<Booking[]>(`${this.base}/admin/bookings`, { params: this.params({ status }) }); }
  adminSettings() { return this.http.get<Record<string, string>>(`${this.base}/admin/settings`); }
  adminSaveSettings(body: { platform_gcash_name: string; platform_gcash_number: string }) { return this.http.put<Msg>(`${this.base}/admin/settings`, body); }
  adminUploadQr(file: File) {
    const fd = new FormData(); fd.append('qr', file);
    return this.http.post<Msg & { platform_gcash_qr: string }>(`${this.base}/admin/settings/qr`, fd);
  }
}

/** Reads the error message sent by the backend */
export function errMsg(e: any, fallback = 'Something went wrong. Please try again.'): string {
  if (e?.status === 0) return 'Cannot reach the server. Is the backend running on port 3000?';
  return e?.error?.message || fallback;
}
