// Database Schema Types - Matching the new PostgreSQL backend

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'doctor' | 'secretary';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Doctor {
  id: number;
  user_id: number;
  specialization?: string;
  openai_api_key_encrypted?: string;
  created_at: string;
  updated_at: string;
}

export interface Secretary {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface DoctorSecretary {
  doctor_id: number;
  secretary_id: number;
}

export interface Patient {
  id: number;
  name: string;
  dob: string; // ISO date string
  created_at: string;
  updated_at: string;
}

export interface Letter {
  id: number;
  doctor_id: number;
  patient_id: number;
  secretary_id?: number;
  status: 'draft' | 'created' | 'reviewed' | 'posted';
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DoctorSettings {
  id: number;
  doctor_id: number;
  header?: string;
  footer?: string;
  updated_at: string;
}

export interface UserSettings {
  userid: string;
  header?: string;
  footer?: string;
  updatedat: string;
}

// Frontend-friendly types (camelCase)
export interface UserFrontend {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: 'admin' | 'doctor' | 'secretary';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  doctorId?: number; // For secretaries, this links to their assigned doctor
}

export interface PatientFrontend {
  id: number;
  name: string;
  dob: string;
  age: number; // Calculated from DOB
  createdAt: string;
  updatedAt: string;
  letterCount?: number; // Number of letters for this patient
}

export interface LetterFrontend {
  id: number;
  doctorId: number;
  patientId: number;
  secretaryId?: number;
  patientName: string; // Joined from patients table
  status: 'draft' | 'created' | 'approved' | 'posted';
  type?: string; // Letter type (clinical, consultation, referral, etc.)
  content: string;
  rawTranscription?: string; // Original dictation/transcription
  createdAt: string;
  updatedAt: string;
  workflowStep: string;
  workflowStepNumber: number;
}

export interface DoctorSettingsFrontend {
  id: number;
  doctorId: number;
  header: string;
  footer: string;
  updatedAt: string;
}

// API Response types
export interface LoginResponse {
  success: boolean;
  message: string;
  user: UserFrontend;
  token: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// Request types
export interface CreatePatientRequest {
  name: string;
  dob: string;
  gender: string;
  phone?: string;
  email?: string;
  address?: string;
  medicalHistory?: string;
  allergies?: string;
  bloodType?: string;
  emergencyContact?: string;
  condition?: string;
  urgency?: string;
  medicalNumber?: string;
  doctorId?: string | number;
}

export interface CreateLetterRequest {
  patientId: number;
  content: string;
  type: string;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  status: 'draft' | 'created' | 'approved' | 'posted';
  rawTranscription?: string;
}

export interface UpdateLetterContentRequest {
  content: string;
}

export interface UpdateLetterStatusRequest {
  status: 'draft' | 'created' | 'approved' | 'posted';
  notes?: string;
}

export interface UpdateSettingsRequest {
  header?: string;
  footer?: string;
}
