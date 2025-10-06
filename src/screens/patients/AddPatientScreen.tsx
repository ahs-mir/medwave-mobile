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
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Device from 'expo-device';
import ApiService from '../../services/ApiService';
import OCRService from '../../services/OCRService';
import PatientStateService from '../../services/PatientStateService';
import { useAuth } from '../../context/AuthContext';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../../navigation/AppStackNavigator';

interface NewPatient {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  medicalNumber: string;
}

interface ScannedData {
  firstName: string;
  lastName: string;
  dob: string;
  medicalNumber: string;
}

type AddPatientScreenNavigationProp = StackNavigationProp<AppStackParamList, 'AddPatient'>;
type AddPatientScreenRouteProp = RouteProp<AppStackParamList, 'AddPatient'>;

interface Props {
  navigation: AddPatientScreenNavigationProp;
  route: AddPatientScreenRouteProp;
}

const formatDateFromAPI = (dateString: string | undefined): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

const AddPatientScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user, isAuthenticated } = useAuth();
  const [patient, setPatient] = useState<NewPatient>({ firstName: '', lastName: '', dateOfBirth: '', medicalNumber: '' });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedData | null>(null);

  useEffect(() => {
    // Pre-populate form if data is passed from another screen
    if (route.params?.scannedData) {
      const { firstName, lastName, dob, medicalNumber } = route.params.scannedData;
      setPatient(prev => ({
        ...prev,
        firstName: firstName || prev.firstName,
        lastName: lastName || prev.lastName,
        dateOfBirth: formatDateFromAPI(dob) || prev.dateOfBirth,
        medicalNumber: medicalNumber || prev.medicalNumber || generateMedicalNumber(),
      }));
    } else {
      // Generate a medical number only if not pre-populating
      setPatient(prev => ({ ...prev, medicalNumber: generateMedicalNumber() }));
    }
  }, [route.params?.scannedData]);

  const generateMedicalNumber = (): string => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `MRN-${timestamp}${random}`;
  };

  const handleScanPress = () => {
    if (!Device.isDevice) {
      chooseFromGallery();
      return;
    }
    Alert.alert("Scan Document", "Choose an option", [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Library", onPress: chooseFromGallery },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Camera access is needed.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.5 });
    if (!result.canceled) processScannedImage(result.assets[0].uri);
  };

  const chooseFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.5 });
    if (!result.canceled) processScannedImage(result.assets[0].uri);
  };

  const processScannedImage = async (uri: string) => {
    setIsScanning(true);
    try {
      const result = await OCRService.extractPatientDataFromFile(uri);
      if (result.success && result.data) {
        // Use firstName and lastName directly from API response
        setScannedData({
          firstName: result.data.firstName || '',
          lastName: result.data.lastName || '',
          dob: result.data.dateOfBirth || '',
          medicalNumber: result.data.medicalNumber || '',
        });
        setModalVisible(true);
      } else {
        Alert.alert('Extraction Failed', result.error || 'Could not extract data.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      Alert.alert('Error', `Scan failed: ${message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirmScannedData = () => {
    if (scannedData) {
      setPatient(prev => ({
        ...prev,
        firstName: scannedData.firstName || prev.firstName,
        lastName: scannedData.lastName || prev.lastName,
        dateOfBirth: formatDateFromAPI(scannedData.dob) || prev.dateOfBirth,
        medicalNumber: scannedData.medicalNumber || prev.medicalNumber,
      }));
    }
    setModalVisible(false);
    setScannedData(null);
  };

  const handleRetake = () => {
    setModalVisible(false);
    setScannedData(null);
    handleScanPress();
  };

  const handleSave = async () => {
    if (!patient.firstName.trim() || !patient.lastName.trim() || !patient.dateOfBirth.trim()) {
      Alert.alert('Validation Error', 'First name, last name, and Date of Birth are required.');
      return;
    }
    setIsSaving(true);
    try {
      const dateParts = patient.dateOfBirth.split('/');
      const isoDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
      const patientData = {
        name: `${patient.firstName.trim()} ${patient.lastName.trim()}`,
        dob: isoDate,
        gender: 'Unknown', phone: 'N/A', email: 'N/A', address: 'N/A',
        medicalNumber: patient.medicalNumber,
        doctorId: user?.id || user?.doctorId,
      };
      const newPatient = await ApiService.createPatient(patientData);
      
      // Mark that the patient list needs to be refreshed
      PatientStateService.markPatientUpdated(newPatient.id.toString());
      
      Alert.alert('Success', 'Patient created successfully!', [{ 
        text: 'OK', 
        onPress: () => navigation.goBack()
      }]);
    } catch (error) {
      Alert.alert('Error', `Failed to create patient: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateChange = (selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const day = selectedDate.getDate().toString().padStart(2, '0');
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const year = selectedDate.getFullYear();
      setPatient(prev => ({ ...prev, dateOfBirth: `${day}/${month}/${year}` }));
    }
  };

  const parseDateString = (dateString: string): Date => {
    if (!dateString.includes('/')) return new Date();
    const [day, month, year] = dateString.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return !isNaN(date.getTime()) ? date : new Date();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color="#000" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Patient</Text>
        <TouchableOpacity onPress={handleScanPress} style={styles.scanButton} disabled={isScanning}>
          {isScanning ? <ActivityIndicator size="small" color="#000" /> : <Ionicons name="scan" size={24} color="#000" />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>First Name *</Text>
          <TextInput style={styles.input} value={patient.firstName} onChangeText={text => setPatient(p => ({ ...p, firstName: text }))} placeholder="Enter first name" />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Last Name *</Text>
          <TextInput style={styles.input} value={patient.lastName} onChangeText={text => setPatient(p => ({ ...p, lastName: text }))} placeholder="Enter last name" />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date of Birth *</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.inputText}>{patient.dateOfBirth || 'Select Date'}</Text>
            <Ionicons name="calendar" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Medical Record Number</Text>
          <TextInput style={styles.input} value={patient.medicalNumber} editable={false} />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.saveButton, isSaving && styles.disabledButton]} onPress={handleSave} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Create Patient</Text>}
        </TouchableOpacity>
      </View>

      <DateTimePickerModal isVisible={showDatePicker} mode="date" date={parseDateString(patient.dateOfBirth)} onConfirm={handleDateChange} onCancel={() => setShowDatePicker(false)} maximumDate={new Date()} />

      <Modal animationType="slide" transparent={true} visible={isModalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Confirm Extracted Data</Text>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>First Name:</Text>
              <Text style={styles.dataValue}>{scannedData?.firstName || 'Not found'}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Last Name:</Text>
              <Text style={styles.dataValue}>{scannedData?.lastName || 'Not found'}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Date of Birth:</Text>
              <Text style={styles.dataValue}>{formatDateFromAPI(scannedData?.dob) || 'Not found'}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>MRN:</Text>
              <Text style={styles.dataValue}>{scannedData?.medicalNumber || 'Not found'}</Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.rescanButton]} onPress={handleRetake}><Text style={styles.rescanButtonText}>Re-scan</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleConfirmScannedData}><Text style={styles.buttonText}>Confirm</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  scanButton: { padding: 4 },
  content: { padding: 20, flexGrow: 1 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 16, color: '#111827', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inputText: { fontSize: 16 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  saveButton: { backgroundColor: '#1F2937', padding: 14, borderRadius: 8, alignItems: 'center' },
  disabledButton: { backgroundColor: '#9CA3AF' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalView: { width: '90%', backgroundColor: 'white', borderRadius: 12, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  dataLabel: { color: '#4B5563', fontSize: 16 },
  dataValue: { color: '#111827', fontWeight: '600', fontSize: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 24 },
  modalButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 8 },
  rescanButton: { backgroundColor: '#F3F4F6' },
  rescanButtonText: { color: '#1F2937', fontWeight: '600', fontSize: 16 },
  confirmButton: { backgroundColor: '#1F2937' },
});

export default AddPatientScreen;