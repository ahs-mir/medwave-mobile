import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Alert,
  StatusBar,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import ApiService from '../../services/ApiService';
import OCRService from '../../services/OCRService';
import { useAuth } from '../../context/AuthContext';
import { TRANSCRIPTION_PROMPTS } from '../../config/aiPrompts';

interface Props {
  navigation: any;
  route: any;
}

interface NewPatient {
  name: string;
  dateOfBirth: string;
  medicalNumber: string;
}

export const AddPatientOptionsScreen: React.FC<Props> = ({ navigation }) => {
  const { user, isAuthenticated } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

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

  useEffect(() => {
    if (!patient.medicalNumber) {
      setPatient(prev => ({
        ...prev,
        medicalNumber: generateMedicalNumber(),
      }));
    }
  }, [patient.medicalNumber]);

  const handleScanDocument = async () => {
    try {
      setIsScanning(true);
      
      // Request camera permission
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (permissionResult.status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to scan documents.');
        return;
      }

      // Show image picker options
      Alert.alert(
        'Scan Document',
        'Choose how to scan the document',
        [
          {
            text: 'Take Photo',
            onPress: () => takePhoto(),
          },
          {
            text: 'Choose from Gallery',
            onPress: () => pickImage(),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Scan error:', error);
      Alert.alert('Error', 'Failed to start scanning. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await processScannedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await processScannedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const processScannedImage = async (imageUri: string) => {
    try {
      setIsScanning(true);
      
      // Process with OCR
      const ocrResult = await OCRService.extractPatientDataFromFile(imageUri);
      
      if (ocrResult.success && ocrResult.data) {
        // Try to extract patient information from OCR result
        const extractedData = ocrResult.data;
        
        if (extractedData) {
          setPatient(prev => ({
            ...prev,
            ...extractedData,
          }));
          Alert.alert('Success', 'Patient information extracted from document!');
        } else {
          Alert.alert('Info', 'Document scanned but could not extract patient information. Please fill in manually.');
        }
      } else {
        Alert.alert('Info', 'Document scanned but no text was found. Please fill in manually.');
      }
    } catch (error) {
      console.error('OCR processing error:', error);
      Alert.alert('Error', 'Failed to process document. Please fill in manually.');
    } finally {
      setIsScanning(false);
    }
  };

  const extractPatientInfo = async (text: string) => {
    try {
      // Use GPT to extract patient information
      const prompt = TRANSCRIPTION_PROMPTS.ocr.replace('{{text}}', text);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 200,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        if (content) {
          try {
            return JSON.parse(content);
          } catch (e) {
            console.log('Failed to parse GPT response:', content);
          }
        }
      }
    } catch (error) {
      console.error('GPT extraction error:', error);
    }
    return null;
  };

  const validateForm = (): boolean => {
    if (!patient.name.trim()) {
      Alert.alert('Validation Error', 'Please enter patient name.');
      return false;
    }
    if (!patient.dateOfBirth.trim()) {
      Alert.alert('Validation Error', 'Please enter date of birth.');
      return false;
    }
    if (!patient.medicalNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter medical record number.');
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

    try {
      setIsSaving(true);

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
        medicalNumber: patient.medicalNumber.trim(),
        condition: 'Manual entry',
        urgency: 'medium',
        doctorId: user?.id || 'unknown'
      };

      console.log('📋 Sending patient data to backend:', patientData);

      const newPatient = await ApiService.createPatient(patientData);

      console.log('✅ New patient created:', newPatient);
      
      Alert.alert('Success', 'Patient created successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>
            Add New Patient
          </Text>
          
          <View style={styles.headerSpacer} />
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Scan Option Card */}
        <View style={styles.scanCard}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={handleScanDocument}
            disabled={isScanning}
          >
            <View style={styles.scanIconContainer}>
              <Ionicons 
                name="camera" 
                size={28} 
                color="#FFFFFF" 
              />
            </View>
            <View style={styles.scanTextContainer}>
              <Text style={styles.scanTitle}>
                {isScanning ? 'Scanning...' : '📷 Scan Document'}
              </Text>
              <Text style={styles.scanSubtitle}>
                Extract patient info from documents automatically
              </Text>
            </View>
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color="#6B7280" 
            />
          </TouchableOpacity>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          
          {/* Name Field */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              style={styles.textInput}
              value={patient.name}
              onChangeText={(text) => setPatient(prev => ({ ...prev, name: text }))}
              placeholder="Enter patient's full name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Date of Birth Field */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Date of Birth *</Text>
            <TouchableOpacity
              style={styles.textInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={patient.dateOfBirth ? styles.dateText : styles.placeholderText}>
                {patient.dateOfBirth || 'Select Date'}
              </Text>
              <Ionicons name="calendar" size={20} color="#6B7280" style={styles.dateIcon} />
            </TouchableOpacity>
          </View>

          {/* Medical Record Number Field */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Medical Record Number *</Text>
            <View style={styles.mrnContainer}>
              <TextInput
                style={[styles.textInput, styles.mrnInput]}
                value={patient.medicalNumber}
                onChangeText={(text) => setPatient(prev => ({ ...prev, medicalNumber: text }))}
                placeholder="Enter MRN"
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity
                style={styles.generateButton}
                onPress={handleGenerateNewNumber}
              >
                <Text style={styles.generateButtonText}>Generate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Text style={styles.saveButtonText}>Creating...</Text>
          ) : (
            <Text style={styles.saveButtonText}>Create Patient</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={new Date(patient.dateOfBirth || new Date())}
          mode="date"
          display="default"
          onChange={handleDateChange}
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
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
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 16,
  },
  headerSpacer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scanIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  scanTextContainer: {
    flex: 1,
  },
  scanTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  scanSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  placeholderText: {
    color: '#9CA3AF',
    flex: 1,
  },
  dateText: {
    color: '#111827',
    flex: 1,
  },
  dateIcon: {
    marginLeft: 10,
  },
  mrnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mrnInput: {
    flex: 1,
  },
  generateButton: {
    backgroundColor: '#000000',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 