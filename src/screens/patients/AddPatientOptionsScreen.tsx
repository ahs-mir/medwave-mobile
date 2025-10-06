import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Alert,
  StatusBar,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Device from 'expo-device';
import OCRService from '../../services/OCRService';

interface ScannedData {
  name: string;
  firstName: string;
  lastName: string;
  dob: string;
  medicalNumber: string;
}

interface Props {
  navigation: any;
}

export const AddPatientOptionsScreen: React.FC<Props> = ({ navigation }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedData | null>(null);

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
    // On simulator, launch library instead of camera
    if (!Device.isDevice) {
      chooseFromGallery();
      return;
    }
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
        setScannedData({
          name: result.data.name || '',
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
      Alert.alert('Error', `Scan failed: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirmScannedData = () => {
    setModalVisible(false);
    if (scannedData) {
      navigation.navigate('AddPatient', { scannedData });
    }
    setScannedData(null);
  };

  const handleRetake = () => {
    setModalVisible(false);
    setScannedData(null);
    handleScanPress();
  };
  
  const formatDateFromAPI = (dateString: string | undefined): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color="#000" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Add Patient</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>How would you like to add a new patient?</Text>
        <TouchableOpacity style={styles.optionButton} onPress={handleScanPress} disabled={isScanning}>
          <Ionicons name="camera-outline" size={24} color="#1F2937" />
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>Scan Document</Text>
            <Text style={styles.optionSubtitle}>Use camera to extract patient info automatically</Text>
          </View>
          {isScanning ? <ActivityIndicator /> : <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionButton} onPress={() => navigation.navigate('AddPatient')}>
          <Ionicons name="create-outline" size={24} color="#1F2937" />
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>Enter Manually</Text>
            <Text style={styles.optionSubtitle}>Fill in the patient's details by hand</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <Modal animationType="slide" transparent={true} visible={isModalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Confirm Extracted Data</Text>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Name:</Text>
              <Text style={styles.dataValue}>{scannedData?.name || 'Not found'}</Text>
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
              <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleConfirmScannedData}><Text style={styles.buttonText}>Confirm & Continue</Text></TouchableOpacity>
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
  content: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 24, textAlign: 'center' },
  optionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  optionTextContainer: { flex: 1, marginLeft: 16 },
  optionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  optionSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
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
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
}); 