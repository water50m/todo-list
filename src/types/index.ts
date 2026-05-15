// types/index.ts
export type Priority = 'urgent' | 'high' | 'med' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';
export type TimeSlot = 'morning' | 'afternoon' | 'evening';
export type RecurType = 'once' | 'multi' | 'preset' | 'custom';
export type PresetType = 'daily' | 'weekday' | 'weekend' | 'custom-days';
export type AppointmentStatus = 'confirmed' | 'pending' | 'cancelled';
export type RSVPStatus = 'accepted' | 'declined' | 'pending';

export interface User {
  id: string;
  name: string;
  pin_hash: string;
  is_active: boolean;
  created_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color_bg: string;
  color_text: string;
  color_border: string;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_done: boolean;
  sort_order: number;
}

export interface Task {
  id: string;
  user_id: string;
  category_id?: string;
  category?: Category;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  recur_type: RecurType;
  recur_dates?: string[];        // for 'multi' — array of date strings
  recur_preset?: PresetType;     // for 'preset'
  recur_weekdays?: number[];     // 0=Sun..6=Sat
  recur_interval?: number;       // for 'custom' — every N units
  recur_interval_unit?: 'day' | 'week' | 'month';
  recur_start?: string;
  recur_end_type?: 'never' | 'count' | 'date';
  recur_end_count?: number;
  recur_end_date?: string;
  due_date?: string;
  due_time?: string;
  completed_at?: string;
  tags?: Tag[];
  subtasks?: Subtask[];
  created_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  category_id?: string;
  priority: Priority;
  recur_type: RecurType;
  recur_dates?: string[];
  recur_preset?: PresetType;
  recur_weekdays?: number[];
  recur_interval?: number;
  recur_interval_unit?: 'day' | 'week' | 'month';
  recur_start?: string;
  recur_end_type?: 'never' | 'count' | 'date';
  recur_end_count?: number;
  recur_end_date?: string;
  due_date?: string;
  due_time?: string;
  tag_ids?: string[];
}

export interface DailyTemplate {
  id: string;
  user_id: string;
  name: string;
  reset_time: string;
  is_active: boolean;
  items?: TemplateItem[];
  created_at: string;
}

export interface TemplateItem {
  id: string;
  template_id: string;
  title: string;
  time_slot: TimeSlot;
  sort_order: number;
  is_active: boolean;
  recur_type: RecurType;
  recur_dates?: string[];
  recur_preset?: PresetType;
  recur_weekdays?: number[];
  recur_interval?: number;
  recur_interval_unit?: 'day' | 'week' | 'month';
  recur_start?: string;
  recur_end_type?: 'never' | 'count' | 'date';
  recur_end_count?: number;
  recur_end_date?: string;
}

export interface ChecklistLog {
  id: string;
  user_id: string;
  template_id: string;
  log_date: string;
  total_items: number;
  done_items: number;
  streak_count: number;
  items?: ChecklistItemLog[];
  created_at: string;
}

export interface ChecklistItemLog {
  id: string;
  log_id: string;
  template_item_id: string;
  template_item?: TemplateItem;
  is_done: boolean;
  done_at?: string;
}

export interface Appointment {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  location?: string;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  status: AppointmentStatus;
  is_recurring: boolean;
  recur_rule?: string;
  remind_before_min?: number;
  notes?: string;
  attendees?: AppointmentAttendee[];
  created_at: string;
}

export interface AppointmentAttendee {
  id: string;
  appointment_id: string;
  name: string;
  email?: string;
  rsvp_status: RSVPStatus;
}

export interface DashboardStats {
  total_tasks: number;
  done_tasks: number;
  overdue_tasks: number;
  streak_count: number;
  completion_rate: number;
  tasks_by_priority: Record<Priority, number>;
  tasks_by_category: Array<{ name: string; color: string; count: number }>;
  daily_completion: Array<{ date: string; done: number; total: number }>;
  upcoming_appointments: Appointment[];
  recurring_tasks: Array<{ title: string; completion_rate: number }>;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
