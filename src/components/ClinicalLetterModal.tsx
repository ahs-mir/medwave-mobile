import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RenderHtml from 'react-native-render-html';
import PDFService, { ClinicalLetterData } from '../services/PDFService';



interface Props {
  visible: boolean;
  onClose: () => void;
  generatedLetter: string;
  patientName: string;
  doctorName?: string;
}

interface PatientInfo {
  name: string;
  dob: string;
  nhsNumber: string;
}

const ClinicalLetterModal: React.FC<Props> = ({
  visible,
  onClose,
  generatedLetter,
  patientName,
  doctorName = 'Dr. Smith',
}) => {
  const { width } = useWindowDimensions();
  const [editableLetter, setEditableLetter] = useState(generatedLetter);
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    name: patientName,
    dob: '1/1/1900',
    nhsNumber: 'N/A'
  });
  const [letterType, setLetterType] = useState<'referral' | 'discharge' | 'consultation' | 'follow-up'>('consultation');
  const [practiceAddress, setPracticeAddress] = useState(
    'NHS Practice\n123 Medical Centre\nLondon, UK\nTel: 020 1234 5678'
  );
  const [isExporting, setIsExporting] = useState(false);

  React.useEffect(() => {
    setEditableLetter(generatedLetter);
  }, [generatedLetter]);

  const letterTypeOptions = [
    { value: 'consultation', label: 'Consultation' },
    { value: 'referral', label: 'Referral' },
    { value: 'discharge', label: 'Discharge' },
    { value: 'follow-up', label: 'Follow-up' },
  ];

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const validateForm = (): boolean => {
    if (!patientInfo.name.trim()) {
      Alert.alert('Validation Error', 'Patient name is required');
      return false;
    }
    if (!patientInfo.dob.trim()) {
      Alert.alert('Validation Error', 'Patient date of birth is required');
      return false;
    }
    if (!patientInfo.nhsNumber.trim()) {
      Alert.alert('Validation Error', 'NHS number is required');
      return false;
    }
    if (!editableLetter.trim()) {
      Alert.alert('Validation Error', 'Letter content cannot be empty');
      return false;
    }
    return true;
  };

  const preparePDFData = (): ClinicalLetterData => {
    return {
      patientName: patientInfo.name,
      patientDOB: patientInfo.dob,
      patientNHS: patientInfo.nhsNumber,
      doctorName,
      practiceAddress,
      date: formatDate(new Date()),
      content: editableLetter,
      letterType,
    };
  };

  const handleExportPDF = async () => {
    if (!validateForm()) return;

    setIsExporting(true);
    try {
      Alert.alert('Notice', 'Export is handled on the web app. Please use the web app to export or print letters.');
    } catch (error) {
      Alert.alert('Export Error', error.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="chevron-down" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Generated Letter</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Patient Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Patient Details</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={patientInfo.name}
                onChangeText={(text) => setPatientInfo(prev => ({ ...prev, name: text }))}
                placeholder="Patient name"
              />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                <Text style={styles.label}>Date of Birth</Text>
                <TextInput
                  style={styles.input}
                  value={patientInfo.dob}
                  onChangeText={(text) => setPatientInfo(prev => ({ ...prev, dob: text }))}
                  placeholder="DD/MM/YYYY"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>NHS Number</Text>
                <TextInput
                  style={styles.input}
                  value={patientInfo.nhsNumber}
                  onChangeText={(text) => setPatientInfo(prev => ({ ...prev, nhsNumber: text }))}
                  placeholder="XXX XXX XXXX"
                />
              </View>
            </View>
          </View>

          {/* Letter Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Letter Type</Text>
            <View style={styles.letterTypeContainer}>
              {letterTypeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.letterTypeButton,
                    letterType === option.value && styles.letterTypeButtonActive,
                  ]}
                  onPress={() => setLetterType(option.value as any)}
                >
                  <Text
                    style={[
                      styles.letterTypeText,
                      letterType === option.value && styles.letterTypeTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Letter Content */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Content</Text>
            <View style={styles.letterContentContainer}>
              <RenderHtml
                contentWidth={width - 80} // Account for padding
                source={{ html: editableLetter }}
                tagsStyles={{
                  h1: { 
                    fontSize: 20, 
                    fontWeight: '700', 
                    color: '#111827',
                    marginTop: 16,
                    marginBottom: 8
                  },
                  h2: { 
                    fontSize: 18, 
                    fontWeight: '700', 
                    color: '#111827',
                    marginTop: 14,
                    marginBottom: 6
                  },
                  h3: { 
                    fontSize: 16, 
                    fontWeight: '700', 
                    color: '#111827',
                    marginTop: 12,
                    marginBottom: 6
                  },
                  strong: { 
                    fontWeight: '700', 
                    color: '#111827' 
                  },
                  p: { 
                    fontSize: 16, 
                    lineHeight: 24, 
                    color: '#111827',
                    marginBottom: 12
                  },
                  br: {
                    marginBottom: 8
                  }
                }}
              />
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.exportButton, isExporting && styles.disabledButton]}
            onPress={handleExportPDF}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Ionicons name="document" size={20} color="white" />
            )}
            <Text style={styles.exportButtonText}>
              {isExporting ? 'Exporting...' : 'Export PDF (optional)'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#111827',
  },
  row: {
    flexDirection: 'row',
  },
  letterTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  letterTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  letterTypeButtonActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  letterTypeText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  letterTypeTextActive: {
    color: '#FFFFFF',
  },
  letterContent: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#111827',
    height: 200,
    textAlignVertical: 'top',
  },
  letterContentContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    minHeight: 200,
  },
  actionButtons: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default ClinicalLetterModal;