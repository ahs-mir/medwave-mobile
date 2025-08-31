import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { StorageAccessFramework } from 'expo-file-system';
import * as FileSystem from 'expo-file-system';

export interface ClinicalLetterData {
  patientName: string;
  patientDOB: string;
  patientNHS: string;
  doctorName: string;
  practiceAddress: string;
  date: string;
  content: string;
  letterType: 'referral' | 'discharge' | 'consultation' | 'follow-up';
}

class PDFService {
  /**
   * Generate HTML template for clinical letter
   */
  private generateHTMLTemplate(data: ClinicalLetterData): string {
    // The content is already HTML, so we can use it directly
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Letter</title>
      <style>
        body {
          font-family: 'Times New Roman', serif;
          font-size: 12pt;
          line-height: 1.5;
          color: #000;
          margin: 32px;
          background: white;
        }
        .content { text-align: justify; }
        .content p { margin: 0 0 12px 0; }
        .content h1, .content h2, .content h3 { 
          margin: 16px 0 8px 0; 
          font-weight: bold; 
        }
        .content strong { font-weight: bold; }
        .signature-section { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; }
        .signature-line { margin-top: 28px; padding-top: 4px; border-top: 1px solid #000; width: 240px; }
      </style>
    </head>
    <body>
      <div class="content">
        ${data.content}
      </div>
      <div class="signature-section">
        <p>Yours sincerely,</p>
        <div class="signature-line"></div>
        <p><strong>${data.doctorName}</strong></p>
      </div>
    </body>
    </html>`;
  }

  private getLetterTitle(letterType: string): string {
    switch (letterType) {
      case 'referral': return 'MEDICAL REFERRAL LETTER';
      case 'discharge': return 'DISCHARGE SUMMARY';
      case 'consultation': return 'CONSULTATION LETTER';
      case 'follow-up': return 'FOLLOW-UP LETTER';
      default: return 'CLINICAL LETTER';
    }
  }

  /**
   * Generate and export PDF
   */
  async generatePDF(data: ClinicalLetterData): Promise<string> {
    try {
      const html = this.generateHTMLTemplate(data);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        margins: {
          left: 40,
          top: 40,
          right: 40,
          bottom: 40,
        },
      });

      return uri;
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw new Error('Failed to generate PDF: ' + error.message);
    }
  }

  /**
   * Share PDF via system share sheet
   */
  async sharePDF(data: ClinicalLetterData): Promise<void> {
    try {
      const pdfUri = await this.generatePDF(data);
      const fileName = `${data.patientName.replace(/\s+/g, '_')}_${data.letterType}_${data.date.replace(/\//g, '-')}.pdf`;
      
      await shareAsync(pdfUri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: 'Share Clinical Letter',
      });
    } catch (error) {
      console.error('PDF sharing failed:', error);
      throw new Error('Failed to share PDF: ' + error.message);
    }
  }

  /**
   * Save PDF to device storage (Android)
   */
  async savePDFToDevice(data: ClinicalLetterData): Promise<string> {
    try {
      const pdfUri = await this.generatePDF(data);
      const fileName = `${data.patientName.replace(/\s+/g, '_')}_${data.letterType}_${data.date.replace(/\//g, '-')}.pdf`;

      // For iOS, use share sheet
      if (Platform.OS === 'ios') {
        await this.sharePDF(data);
        return 'Shared via iOS share sheet';
      }

      // For Android, save to Downloads
      const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permissions.granted) {
        throw new Error('Storage permission denied');
      }

      const fileUri = await StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        fileName,
        'application/pdf'
      );

      const fileContent = await FileSystem.readAsStringAsync(pdfUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await FileSystem.writeAsStringAsync(fileUri, fileContent, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return fileUri;
    } catch (error) {
      console.error('PDF save failed:', error);
      throw new Error('Failed to save PDF: ' + error.message);
    }
  }

  /**
   * Print PDF directly
   */
  async printPDF(data: ClinicalLetterData): Promise<void> {
    try {
      const html = this.generateHTMLTemplate(data);
      
      await Print.printAsync({
        html,
        margins: {
          left: 40,
          top: 40,
          right: 40,
          bottom: 40,
        },
      });
    } catch (error) {
      console.error('PDF printing failed:', error);
      throw new Error('Failed to print PDF: ' + error.message);
    }
  }
}

export default new PDFService();