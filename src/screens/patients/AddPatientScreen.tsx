import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  Modal,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import ApiService from '../../services/ApiService';
import { useAuth } from '../../context/AuthContext';
import OCRService from '../../services/OCRService';
import { PatientFrontend } from '../../types';
import { useNavigation } from '@react-navigation/native';

interface NewPatient {
  name: string;
  dateOfBirth: string;
  medicalNumber: string;
}

interface ScannedData {
  name?: string;
  dateOfBirth?: string;
  medicalNumber?: string;
  confidence: number;
}

interface Props {
  navigation: any;
  route: any;
}

export const AddPatientScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user, isAuthenticated } = useAuth();
  const [showScanModal, setShowScanModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedData | null>(null);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [patient, setPatient] = useState<NewPatient>({
    name: '',
    dateOfBirth: '',
    medicalNumber: '',
  });

  const generateMedicalNumber = (): string => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `MRN-${timestamp}${random}`;
  };

  React.useEffect(() => {
    if (!patient.medicalNumber) {
      setPatient(prev => ({
        ...prev,
        medicalNumber: generateMedicalNumber(),
      }));
    }
  }, [patient.medicalNumber]);

  // Process scanned image if provided from camera
  React.useEffect(() => {
    if (route.params?.scannedImage && route.params?.fromCamera) {
      setScannedImage(route.params.scannedImage);
      processScannedImage(route.params.scannedImage);
    }
  }, [route.params?.scannedImage]);

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to scan patient documents.');
      navigation.goBack(); // Go back if no permission, since camera is primary workflow
      return false;
    }
    return true;
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        setScannedImage(result.assets[0].uri);
        await processScannedImage(result.assets[0].uri);
      } else {
        // User canceled photo - go back to previous screen since camera is primary workflow
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      navigation.goBack();
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        setScannedImage(result.assets[0].uri);
        await processScannedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const processScannedImage = async (imageUri: string) => {
    setIsScanning(true);
    
    try {
      console.log('🔍 Processing scanned image with device OCR:', imageUri);
      
      // Use device's built-in OCR service
      const ocrResult = await OCRService.extractPatientDataFromFile(imageUri);
      
      if (ocrResult.success && ocrResult.data) {
        const extractedData: ScannedData = {
          name: ocrResult.data.name || undefined,
          dateOfBirth: ocrResult.data.dateOfBirth || undefined,
          medicalNumber: ocrResult.data.medicalNumber || undefined,
          confidence: ocrResult.data.confidence,
        };
        
        setScannedData(extractedData);
        setShowScanModal(false);
        setShowReviewModal(true);
        
        console.log('✅ OCR extraction completed:', extractedData);
      } else {
        console.log('❌ OCR failed:', ocrResult.error);
        Alert.alert(
          'OCR Failed', 
          'Could not extract data from the image. Please try again or enter manually.',
          [
            { text: 'Try Again', onPress: () => setShowScanModal(true) },
            { text: 'Manual Entry', onPress: () => setShowScanModal(false) }
          ]
        );
      }
    } catch (error) {
      console.error('Image processing error:', error);
      Alert.alert(
        'Processing Error', 
        'Failed to process the image. Please try again or enter manually.',
        [
          { text: 'Try Again', onPress: () => setShowScanModal(true) },
          { text: 'Manual Entry', onPress: () => setShowScanModal(false) }
        ]
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirmScannedData = () => {
    if (scannedData) {
      setPatient(prev => ({
        ...prev,
        name: scannedData.name || '',
        dateOfBirth: scannedData.dateOfBirth || '',
        medicalNumber: scannedData.medicalNumber || prev.medicalNumber,
      }));
    }
    setShowReviewModal(false);
    setScannedData(null);
    setScannedImage(null);
  };

  const handleRejectScannedData = () => {
    setShowReviewModal(false);
    setScannedData(null);
    setScannedImage(null);
    setShowScanModal(true);
  };

  const validateForm = (): boolean => {
    if (!patient.name.trim()) {
      Alert.alert('Validation Error', 'Patient name is required');
      return false;
    }
    if (!patient.dateOfBirth.trim()) {
      Alert.alert('Validation Error', 'Date of birth is required');
      return false;
    }
    
    // Validate date format
    if (patient.dateOfBirth.includes('/')) {
      const dateParts = patient.dateOfBirth.split('/');
      if (dateParts.length !== 3) {
        Alert.alert('Validation Error', 'Date must be in DD/MM/YYYY format (e.g., 15/05/1990)');
        return false;
      }
      
      const [day, month, year] = dateParts;
      const dayNum = parseInt(day, 10);
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);
      
      if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) {
        Alert.alert('Validation Error', 'Date must contain valid numbers');
        return false;
      }
      
      if (dayNum < 1 || dayNum > 31) {
        Alert.alert('Validation Error', 'Day must be between 1 and 31');
        return false;
      }
      
      if (monthNum < 1 || monthNum > 12) {
        Alert.alert('Validation Error', 'Month must be between 1 and 12');
        return false;
      }
      
      if (yearNum < 1900 || yearNum > new Date().getFullYear()) {
        Alert.alert('Validation Error', 'Year must be between 1900 and current year');
        return false;
      }
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    if (!isAuthenticated) {
      Alert.alert('Authentication Error', 'Please login first');
      return;
    }

    setIsSaving(true);
    
    try {
      // Convert DD/MM/YYYY to ISO8601 format with validation
      let isoDate = patient.dateOfBirth;
      if (patient.dateOfBirth && patient.dateOfBirth.includes('/')) {
        const dateParts = patient.dateOfBirth.split('/');
        if (dateParts.length !== 3) {
          throw new Error('Date must be in DD/MM/YYYY format (e.g., 15/05/1990)');
        }
        
        const [day, month, year] = dateParts;
        const dayNum = parseInt(day, 10);
        const monthNum = parseInt(month, 10);
        const yearNum = parseInt(year, 10);
        
        // Validate date components
        if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) {
          throw new Error('Date must contain valid numbers');
        }
        
        if (dayNum < 1 || dayNum > 31) {
          throw new Error('Day must be between 1 and 31');
        }
        
        if (monthNum < 1 || monthNum > 12) {
          throw new Error('Month must be between 1 and 12');
        }
        
        if (yearNum < 1900 || yearNum > new Date().getFullYear()) {
          throw new Error('Year must be between 1900 and current year');
        }
        
        // Create ISO date string
        isoDate = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
        
        // Validate the final ISO date
        const testDate = new Date(isoDate);
        if (isNaN(testDate.getTime())) {
          throw new Error('Invalid date format');
        }
        
        console.log('📅 Date converted:', patient.dateOfBirth, '→', isoDate);
      } else if (patient.dateOfBirth) {
        // If not DD/MM/YYYY format, try to validate as ISO
        const testDate = new Date(patient.dateOfBirth);
        if (isNaN(testDate.getTime())) {
          throw new Error('Invalid date format. Please use DD/MM/YYYY (e.g., 15/05/1990)');
        }
        isoDate = patient.dateOfBirth;
      }

      const patientData = {
        name: patient.name.trim(),
        dob: isoDate, // Send date of birth in ISO format
        gender: 'Male', // Default gender - required by backend
        phone: '+1234567890', // Default phone
        email: 'patient@example.com', // Default email
        address: 'Default Address', // Default address
        medicalHistory: 'Manual entry',
        allergies: 'None known',
        bloodType: 'O+',
        emergencyContact: 'Emergency Contact',
        medicalNumber: patient.medicalNumber,
        condition: 'Manual entry',
        urgency: 'medium',
        doctorId: user?.id || 'unknown'
      };

      console.log('📋 Sending patient data to backend:', patientData);

      const newPatient = await ApiService.createPatient(patientData);
      
      console.log('✅ New patient created via API:', newPatient);
      
      Alert.alert(
        'Success',
        'Patient created successfully! The secretary will be notified in real-time.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('❌ Create patient error:', error);
      Alert.alert('Error', `Failed to create patient: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateNewNumber = () => {
    setPatient(prev => ({
      ...prev,
      medicalNumber: generateMedicalNumber(),
    }));
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const day = selectedDate.getDate().toString().padStart(2, '0');
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const year = selectedDate.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;
      setPatient(prev => ({
        ...prev,
        dateOfBirth: formattedDate,
      }));
    }
  };

  const closeScanModal = () => {
    setShowScanModal(false);
    setScannedData(null);
    setScannedImage(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Patient</Text>
        <TouchableOpacity
          onPress={() => setShowScanModal(true)}
          style={styles.scanButton}
        >
          <Ionicons name="scan" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Patient Name *</Text>
            <TextInput
              style={styles.input}
              value={patient.name}
              onChangeText={(text) => setPatient(prev => ({ ...prev, name: text }))}
              placeholder="Enter patient name"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth *</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.inputText}>
                {patient.dateOfBirth || 'Select Date'}
              </Text>
              <Ionicons name="calendar" size={20} color="#6B7280" style={styles.inputIcon} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Medical Record Number</Text>
            <View style={styles.mrnContainer}>
              <TextInput
                style={styles.mrnInput}
                value={patient.medicalNumber}
                editable={false}
              />
              <TouchableOpacity
                style={styles.generateButton}
                onPress={handleGenerateNewNumber}
              >
                <Ionicons name="refresh" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Creating...</Text>
            </View>
          ) : (
            <Text style={styles.saveButtonText}>Create Patient</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Scan Modal */}
      <Modal
        visible={showScanModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeScanModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeScanModal} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Scan Patient Document</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Modal Content */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Instructions */}
            <View style={styles.instructionsContainer}>
              <Ionicons name="information-circle" size={24} color="#3B82F6" />
              <Text style={styles.instructionsTitle}>Quick Patient Entry</Text>
              <Text style={styles.instructionsText}>
                Take a photo of the patient's ID card or medical document to automatically extract:
              </Text>
              <View style={styles.instructionList}>
                <Text style={styles.instructionItem}>• Patient Name</Text>
                <Text style={styles.instructionItem}>• Date of Birth</Text>
                <Text style={styles.instructionItem}>• Medical Record Number</Text>
              </View>
            </View>

            {/* Camera Preview */}
            <View style={styles.cameraPreview}>
              {scannedImage ? (
                <Image source={{ uri: scannedImage }} style={styles.scannedImage} />
              ) : (
                <View style={styles.cameraOverlay}>
                  <Ionicons name="camera" size={64} color="#6B7280" />
                  <Text style={styles.cameraText}>
                    Ready to scan
                  </Text>
                  <Text style={styles.cameraSubtext}>
                    Take a photo or select from gallery
                  </Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleTakePhoto}
                disabled={isScanning}
              >
                <Ionicons name="camera" size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handlePickImage}
                disabled={isScanning}
              >
                <Ionicons name="images" size={20} color="#6B7280" />
                <Text style={styles.secondaryButtonText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>

            {isScanning && (
              <View style={styles.scanningContainer}>
                <ActivityIndicator size="large" color="#000000" />
                <Text style={styles.scanningText}>Processing document...</Text>
                <Text style={styles.scanningSubtext}>Extracting patient information</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Review Scanned Data Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowReviewModal(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Review Extracted Data</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Modal Content */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Confidence Indicator */}
            <View style={styles.confidenceContainer}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.confidenceText}>
                {scannedData?.confidence ? Math.round(scannedData.confidence * 100) : 0}% Confidence
              </Text>
            </View>

            {/* Scanned Image */}
            {scannedImage && (
              <View style={styles.reviewImageContainer}>
                <Image source={{ uri: scannedImage }} style={styles.reviewImage} />
              </View>
            )}

            {/* Extracted Data */}
            <View style={styles.extractedDataContainer}>
              <Text style={styles.extractedDataTitle}>Extracted Information:</Text>
              
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>Name:</Text>
                <Text style={styles.dataValue}>{scannedData?.name || 'Not detected'}</Text>
              </View>
              
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>Date of Birth:</Text>
                <Text style={styles.dataValue}>{scannedData?.dateOfBirth || 'Not detected'}</Text>
              </View>
              
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>Medical Number:</Text>
                <Text style={styles.dataValue}>{scannedData?.medicalNumber || 'Not detected'}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.reviewButtonContainer}>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={handleRejectScannedData}
              >
                <Ionicons name="close" size={20} color="#EF4444" />
                <Text style={styles.rejectButtonText}>Reject & Rescan</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmScannedData}
              >
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.confirmButtonText}>Use This Data</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  scanButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  inputIcon: {
    marginLeft: 12,
  },

  mrnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mrnInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    marginRight: 12,
  },
  generateButton: {
    width: 44,
    height: 44,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  saveButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  headerSpacer: {
    width: 44,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  cameraPreview: {
    height: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'hidden',
  },
  scannedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cameraOverlay: {
    alignItems: 'center',
  },
  cameraText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  cameraSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  scanningContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  scanningText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  scanningSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  // New styles for review modal
  instructionsContainer: {
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 16,
  },
  instructionList: {
    alignItems: 'flex-start',
  },
  instructionItem: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 4,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  confidenceText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  reviewImageContainer: {
    height: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reviewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  extractedDataContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  extractedDataTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  dataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dataLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4B5563',
  },
  dataValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  reviewButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default AddPatientScreen;