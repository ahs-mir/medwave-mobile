// Use Railway production backend for real database
const BASE_URL = 'https://slippery-glass-production.up.railway.app/api';

import {
  UserFrontend,
  PatientFrontend,
  LetterFrontend,
  DoctorSettingsFrontend,
  CreatePatientRequest,
  CreateLetterRequest,
  UpdateLetterContentRequest,
  UpdateLetterStatusRequest,
  UpdateSettingsRequest,
  ApiResponse
} from '../types';

// Add AsyncStorage import for token persistence
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper function to convert snake_case to camelCase
const toCamelCase = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  
  const camelCaseObj: any = {};
  Object.keys(obj).forEach(key => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    camelCaseObj[camelKey] = toCamelCase(obj[key]);
  });
  return camelCaseObj;
};

// Helper function to convert camelCase to snake_case
const toSnakeCase = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  
  const snakeCaseObj: any = {};
  Object.keys(obj).forEach(key => {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    snakeCaseObj[snakeKey] = toSnakeCase(obj[key]);
  });
  return snakeCaseObj;
};

// Helper function to calculate age from DOB
const calculateAge = (dob: string): number => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Helper function to get workflow step info
const getWorkflowStep = (status: string): { step: string; number: number } => {
  switch (status) {
    case 'created':
      return { step: 'Created - Ready for Doctor Review', number: 1 };
    case 'approved':
      return { step: 'Approved - Ready for Secretary to Post', number: 2 };
    case 'posted':
      return { step: 'Posted - Letter Completed', number: 3 };
    default:
      return { step: 'Draft', number: 0 };
  }
};

class ApiService {
  private token: string | null = null;
  private socket: any = null;
  private readonly TOKEN_KEY = 'auth_token';

  constructor() {
    // Restore token from storage when service initializes
    this.restoreToken();
  }

  async setToken(token: string | null) {
    // Remove sensitive logging
    this.token = token || null;
    
    // Persist token to storage
    if (token) {
      try {
        await AsyncStorage.setItem(this.TOKEN_KEY, token);
        // Remove sensitive logging
      } catch (error) {
        console.error('❌ Failed to save token to storage:', error);
      }
    } else {
      try {
        await AsyncStorage.removeItem(this.TOKEN_KEY);
        // Remove sensitive logging
      } catch (error) {
        console.error('❌ Failed to remove token from storage:', error);
      }
    }
  }

  async getToken(): Promise<string | null> {
    // If token is not in memory, try to restore from storage
    if (!this.token) {
      await this.restoreToken();
    }
    
    console.log('🔍 Current token:', this.token ? 'Present' : 'Missing');
    return this.token;
  }

  private async restoreToken() {
    try {
      const storedToken = await AsyncStorage.getItem(this.TOKEN_KEY);
      if (storedToken) {
        this.token = storedToken;
        console.log('🔄 Token restored from storage');
      }
    } catch (error) {
      console.error('❌ Failed to restore token from storage:', error);
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      ...options,
    };

    try {
      console.log(`🌐 API Request: ${config.method || 'GET'} ${url}`);
      console.log(`📋 Request Body:`, options.body);
      console.log(`🔑 Token:`, this.token ? 'Present' : 'Missing');
      
      const response = await fetch(url, config);

      console.log(`📡 Response Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`📥 Response data:`, data);
      
      return data;
    } catch (error) {
      console.error(`❌ API request failed: ${url}`, error);
      throw error;
    }
  }

  // Authentication
  async login(email: string, password: string): Promise<ApiResponse<{ user: UserFrontend; token: string }>> {
    try {
      const response = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (response.success && response.token) {
        await this.setToken(response.token);
      }

      return response;
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    this.token = null;
    await AsyncStorage.removeItem(this.TOKEN_KEY);
    console.log('🚪 Logged out, token cleared');
  }

  // Patients
  async getPatients(): Promise<PatientFrontend[]> {
    try {
      const response = await this.request('/patients');
      
      if (response.success && response.patients) {
        return response.patients.map((patient: any) => ({
          id: patient.id,
          name: patient.name,
          dob: patient.dob,
          age: calculateAge(patient.dob),
          createdAt: patient.created_at || patient.createdAt,
          updatedAt: patient.updated_at || patient.updatedAt
        }));
      }
      
      return [];
    } catch (error) {
      console.error('❌ Error fetching patients:', error);
      throw error;
    }
  }

  async createPatient(patientData: CreatePatientRequest): Promise<PatientFrontend> {
    try {
      const response = await this.request('/patients', {
        method: 'POST',
        body: JSON.stringify(patientData),
      });

      if (response.success && response.patient) {
        const patient = response.patient;
        return {
          id: patient.id,
          name: patient.name,
          dob: patient.dob,
          age: calculateAge(patient.dob),
          createdAt: patient.created_at || patient.createdAt,
          updatedAt: patient.updated_at || patient.updatedAt
        };
      }
      
      throw new Error(response.error || 'Failed to create patient');
    } catch (error) {
      console.error('❌ Error creating patient:', error);
      throw error;
    }
  }

  async getPatient(id: number): Promise<PatientFrontend> {
    try {
      const response = await this.request(`/patients/${id}`);
      
      if (response.success && response.patient) {
        const patient = response.patient;
        return {
          id: patient.id,
          name: patient.name,
          dob: patient.dob,
          age: calculateAge(patient.dob),
          createdAt: patient.created_at || patient.createdAt,
          updatedAt: patient.updated_at || patient.updatedAt
        };
      }
      
      throw new Error(response.error || 'Patient not found');
    } catch (error) {
      console.error('❌ Error fetching patient:', error);
      throw error;
    }
  }

  async updatePatient(id: number, patientData: Partial<CreatePatientRequest>): Promise<PatientFrontend> {
    try {
      const response = await this.request(`/patients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(patientData),
      });

      if (response.success && response.patient) {
        const patient = response.patient;
        return {
          id: patient.id,
          name: patient.name,
          dob: patient.dob,
          age: calculateAge(patient.dob),
          createdAt: patient.created_at || patient.createdAt,
          updatedAt: patient.updated_at || patient.updatedAt
        };
      }
      
      throw new Error(response.error || 'Failed to update patient');
    } catch (error) {
      console.error('❌ Error updating patient:', error);
      throw error;
    }
  }

  async deletePatient(id: number): Promise<void> {
    try {
      await this.request(`/patients/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('❌ Error deleting patient:', error);
      throw error;
    }
  }

  // Letters
  async getLetters(status?: string): Promise<LetterFrontend[]> {
    try {
      const endpoint = status ? `/letters?status=${status}` : '/letters';
      const response = await this.request(endpoint);
      
      if (response.success && response.letters) {
        console.log('🔍 Raw letters from backend:', response.letters);
        console.log('🔍 First letter sample:', response.letters[0]);
        
        return response.letters.map((letter: any) => {
          const workflowInfo = getWorkflowStep(letter.status);
          
          // Debug: Log the raw letter data
          console.log('🔍 Processing letter:', {
            id: letter.id,
            patientName: letter.patientName,
            patient_name: letter.patient_name,
            patient: letter.patient,
            status: letter.status
          });
          
          // Try to extract patient name from various possible sources
          let patientName = letter.patientName || 
                           letter.patient_name || 
                           letter.patient?.name || 
                           letter.patient?.fullName ||
                           (letter.patient?.firstName && letter.patient?.lastName ? 
                             `${letter.patient.firstName} ${letter.patient.lastName}` : null) ||
                           'Unknown Patient';
          
          console.log('🔍 Extracted patient name:', patientName);
          
          return {
            id: letter.id,
            doctorId: letter.doctor_id || letter.doctorId,
            patientId: letter.patient_id || letter.patientId,
            secretaryId: letter.secretary_id || letter.secretaryId,
            patientName: patientName,
            status: letter.status,
            type: letter.type,
            content: letter.content,
            createdAt: letter.created_at || letter.createdAt,
            updatedAt: letter.updated_at || letter.updatedAt,
            workflowStep: workflowInfo.step,
            workflowStepNumber: workflowInfo.number
          };
        });
      }
      
      return [];
    } catch (error) {
      console.error('❌ Error fetching letters:', error);
      throw error;
    }
  }

  async createLetter(letterData: CreateLetterRequest): Promise<LetterFrontend> {
    try {
      const response = await this.request('/letters', {
        method: 'POST',
        body: JSON.stringify(letterData),
      });

      if (response.success && response.letter) {
        const letter = response.letter;
        const workflowInfo = getWorkflowStep(letter.status);
        
        // Try to extract patient name from various possible sources
        let patientName = letter.patientName || 
                         letter.patient_name || 
                         letter.patient?.name || 
                         letter.patient?.fullName ||
                         (letter.patient?.firstName && letter.patient?.lastName ? 
                           `${letter.patient.firstName} ${letter.patient.lastName}` : null) ||
                         'Unknown Patient';
        
        return {
          id: letter.id,
          doctorId: letter.doctor_id || letter.doctorId,
          patientId: letter.patient_id || letter.patientId,
          secretaryId: letter.secretary_id || letter.secretaryId,
          patientName: patientName,
          status: letter.status,
          type: letter.type,
          content: letter.content,
          createdAt: letter.created_at || letter.createdAt,
          updatedAt: letter.updated_at || letter.updatedAt,
          workflowStep: workflowInfo.step,
          workflowStepNumber: workflowInfo.number
        };
      }
      
      throw new Error(response.error || 'Failed to create letter');
    } catch (error) {
      console.error('❌ Error creating letter:', error);
      throw error;
    }
  }

  async deleteLetter(letterId: number): Promise<boolean> {
    try {
      console.log(`🗑️ Attempting to delete letter ${letterId}...`);
      console.log(`🔑 Token present: ${this.token ? 'Yes' : 'No'}`);
      
      const response = await this.request(`/letters/${letterId}`, {
        method: 'DELETE',
      });

      console.log(`📥 Delete response:`, response);
      
      if (response.success === true) {
        console.log(`✅ Letter ${letterId} deleted successfully`);
        return true;
      } else {
        console.error(`❌ Delete failed - response.success is not true:`, response);
        return false;
      }
    } catch (error) {
      console.error(`❌ Delete letter error for letter ${letterId}:`, error);
      return false;
    }
  }

  async updateLetterStatus(letterId: number, status: string, notes?: string): Promise<boolean> {
    try {
      const response = await this.request(`/letters/${letterId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, notes }),
      });

      return response.success === true;
    } catch (error) {
      console.error('❌ Error updating letter status:', error);
      return false;
    }
  }

  // Doctor Settings
  async getDoctorSettings(): Promise<DoctorSettingsFrontend | null> {
    try {
      const response = await this.request('/doctor/settings');
      
      if (response.success && response.settings) {
        return {
          id: response.settings.id,
          doctorId: response.settings.doctor_id || response.settings.doctorId,
          header: response.settings.header,
          footer: response.settings.footer,
          updatedAt: response.settings.updated_at || response.settings.updatedAt
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error fetching doctor settings:', error);
      return null;
    }
  }

  async updateDoctorSettings(settings: Partial<DoctorSettingsFrontend>): Promise<boolean> {
    try {
      const response = await this.request('/doctor/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });

      return response.success === true;
    } catch (error) {
      console.error('❌ Error updating doctor settings:', error);
      return false;
    }
  }

  // User profile management
  async getCurrentUser(): Promise<UserFrontend | null> {
    try {
      const response = await this.request('/users/profile');
      
      if (response.success && response.user) {
        const user = response.user;
        return {
          id: user.id,
          email: user.email,
          firstName: user.first_name || user.firstName,
          lastName: user.last_name || user.lastName,
          fullName: user.name || `${user.first_name || user.firstName} ${user.last_name || user.lastName}`.trim(),
          role: user.role,
          isActive: user.is_active || user.isActive,
          createdAt: user.created_at || user.createdAt,
          updatedAt: user.updated_at || user.updatedAt,
          doctorId: user.doctorId
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error fetching current user:', error);
      return null;
    }
  }

  async updateUserProfile(profileData: { firstName: string; lastName: string; email: string }): Promise<UserFrontend> {
    try {
      const response = await this.request('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });

      if (response.success && response.user) {
        const user = response.user;
        return {
          id: user.id,
          email: user.email,
          firstName: user.first_name || user.firstName,
          lastName: user.last_name || user.lastName,
          fullName: user.name || `${user.first_name || user.firstName} ${user.last_name || user.lastName}`.trim(),
          role: user.role,
          isActive: user.is_active || user.isActive,
          createdAt: user.created_at || user.createdAt,
          updatedAt: user.updated_at || user.updatedAt,
          doctorId: user.doctorId
        };
      }
      
      throw new Error(response.error || 'Failed to update profile');
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      throw error;
    }
  }

  // API Key management methods
  async getApiKey(): Promise<{ apiKey: string | null } | null> {
    try {
      const response = await this.request('/user-settings/api-key');
      return response;
    } catch (error) {
      console.error('❌ Error fetching API key:', error);
      return null;
    }
  }

  async saveApiKey(apiKey: string): Promise<void> {
    try {
      const response = await this.request('/user-settings/api-key', {
        method: 'POST',
        body: JSON.stringify({ apiKey }),
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to save API key');
      }
    } catch (error) {
      console.error('❌ Error saving API key:', error);
      throw error;
    }
  }

  async removeApiKey(): Promise<void> {
    try {
      const response = await this.request('/user-settings/api-key', {
        method: 'DELETE',
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to remove API key');
      }
    } catch (error) {
      console.error('❌ Error removing API key:', error);
      throw error;
    }
  }

  // Real-time updates
  connectToRealtime() {
    // Implementation for real-time updates
    console.log('🔌 Connecting to real-time updates...');
  }

  disconnectFromRealtime() {
    // Implementation for disconnecting
    console.log('🔌 Disconnecting from real-time updates...');
  }
}

export default new ApiService();
