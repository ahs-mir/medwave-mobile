// src/services/OCRService.ts
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import ApiService from './ApiService'; // Import ApiService

export interface OCRResult {
  success: boolean;
  data?: {
    name?: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    medicalNumber?: string;
    confidence: number;
  };
  error?: string;
}

class OCRService {
  /**
   * Extract patient data from an image using the backend API.
   */
  async extractPatientDataFromFile(imageUri: string): Promise<OCRResult> {
    try {

      // The backend expects multipart/form-data, so we create it
      const formData = new FormData();
      
      // The 'uri' needs to be the file path, and we need to guess the type
      const fileType = imageUri.includes('.png') ? 'image/png' : 'image/jpeg';
      
      // The backend endpoint is expecting an array of 'files'
      formData.append('files', {
        uri: imageUri,
        name: `upload_${Date.now()}.jpg`,
        type: fileType,
      } as any);


      // Use a custom method in ApiService or a direct fetch call
      // to handle multipart/form-data upload
      const response = await ApiService.uploadPatientDocument(formData);

      // The backend returns a list of patients. We will take the first one.
      const patientData = response.extractedPatients?.[0];

      if (patientData && patientData.name && patientData.name !== 'Unable to extract name') {
        return {
          success: true,
          data: {
            name: patientData.name,
            firstName: patientData.firstName,
            lastName: patientData.lastName,
            dateOfBirth: patientData.dob,
            medicalNumber: patientData.medicalNumber,
            confidence: patientData.confidence || 0.95
          }
        };
      } else {
        const errorMessage = patientData?.notes || 'No patient data could be extracted from the document.';
        return {
          success: false,
          error: errorMessage,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      return {
        success: false,
        error: `Failed to process document: ${errorMessage}`,
      };
    }
  }

  /**
   * Check if device supports OCR (now backend-based)
   */
  isOCRSupported(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }
}

export default new OCRService();
