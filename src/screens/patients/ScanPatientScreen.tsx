import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  navigation: any;
  route: any;
}

export const ScanPatientScreen: React.FC<Props> = ({ navigation }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);

  const handleScan = async () => {
    setIsScanning(true);
    
    // Simulate scanning process
    setTimeout(() => {
      setIsScanning(false);
      
      // Mock scanned data - in real app, this would come from OCR/ML processing
      const mockScannedData = {
        name: 'John Doe',
        medicalNumber: 'MRN-123456789',
        age: '45',
        condition: 'Hypertension',
        urgency: 'medium',
        bloodType: 'O+',
        allergies: 'Penicillin',
      };
      
      setScannedData(mockScannedData);
      
      Alert.alert(
        'Scan Complete',
        'Patient information has been extracted from the document. Please review and confirm the details.',
        [
          {
            text: 'Review Data',
            onPress: () => {
              // Navigate to a review screen or show modal
              console.log('Scanned data:', mockScannedData);
            },
          },
        ]
      );
    }, 3000);
  };

  const handleManualEntry = () => {
    navigation.navigate('AddPatient');
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
            Scan Document
          </Text>
          
          <View style={styles.headerSpacer} />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {!scannedData ? (
          <>
            {/* Camera Preview */}
            <View style={styles.cameraPreview}>
              <View style={styles.cameraOverlay}>
                <Ionicons name="camera" size={64} color="#6B7280" />
                <Text style={styles.cameraText}>
                  Ready to scan
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
                onPress={handleScan}
                disabled={isScanning}
              >
                {isScanning ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.scanButtonText}>Scanning...</Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="camera" size={20} color="#FFFFFF" />
                    <Text style={styles.scanButtonText}>Start Scan</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.manualButton}
                onPress={handleManualEntry}
              >
                <Text style={styles.manualButtonText}>Enter Manually</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* Scanned Data Preview */}
            <View style={styles.scannedDataContainer}>
              <Text style={styles.scannedDataTitle}>Extracted Data</Text>
              
              <View style={styles.dataCard}>
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Name:</Text>
                  <Text style={styles.dataValue}>{scannedData.name}</Text>
                </View>
                
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>MR Number:</Text>
                  <Text style={styles.dataValue}>{scannedData.medicalNumber}</Text>
                </View>
                
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Age:</Text>
                  <Text style={styles.dataValue}>{scannedData.age}</Text>
                </View>
                
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Condition:</Text>
                  <Text style={styles.dataValue}>{scannedData.condition}</Text>
                </View>
                
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Blood Type:</Text>
                  <Text style={styles.dataValue}>{scannedData.bloodType}</Text>
                </View>
                
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Allergies:</Text>
                  <Text style={styles.dataValue}>{scannedData.allergies}</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => {
                  // Navigate to AddPatient with pre-filled data
                  navigation.navigate('AddPatient', { scannedData });
                }}
              >
                <Text style={styles.confirmButtonText}>Create Patient</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rescanButton}
                onPress={() => setScannedData(null)}
              >
                <Text style={styles.rescanButtonText}>Rescan</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
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
  },
  headerContent: {
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
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 32,
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
  buttonContainer: {
    gap: 16,
  },
  scanButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  scanButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  manualButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  manualButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  scannedDataContainer: {
    flex: 1,
  },
  scannedDataTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
  },
  dataCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dataLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  dataValue: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
    textAlign: 'right',
  },
  confirmButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rescanButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rescanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
}); 