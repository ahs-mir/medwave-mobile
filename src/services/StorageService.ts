import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from './ApiService';

class StorageService {
  private static instance: StorageService;
  
  // Storage keys
  private readonly OPENAI_API_KEY = 'openai_api_key';
  private readonly NOTIFICATIONS_ENABLED = 'notifications_enabled';
  private readonly AUTO_SAVE_ENABLED = 'auto_save_enabled';

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  // OpenAI API Key methods - Now use backend database
  async getOpenAIKey(): Promise<string | null> {
    try {
      // Try to get from backend first
      const response = await ApiService.getApiKey();
      if (response && response.apiKey) {
        return response.apiKey;
      }
      
      // Fallback to local storage if backend fails
      return await AsyncStorage.getItem(this.OPENAI_API_KEY);
    } catch (error) {
      console.error('Error getting OpenAI key from backend, falling back to local storage:', error);
      // Fallback to local storage
      return await AsyncStorage.getItem(this.OPENAI_API_KEY);
    }
  }

  async setOpenAIKey(apiKey: string): Promise<void> {
    try {
      // Save to backend first
      await ApiService.saveApiKey(apiKey);
      
      // Also save to local storage as backup
      await AsyncStorage.setItem(this.OPENAI_API_KEY, apiKey);
    } catch (error) {
      console.error('Error saving OpenAI key to backend:', error);
      // If backend fails, still save locally
      await AsyncStorage.setItem(this.OPENAI_API_KEY, apiKey);
      throw error;
    }
  }

  async removeOpenAIKey(): Promise<void> {
    try {
      // Remove from backend first
      await ApiService.removeApiKey();
      
      // Also remove from local storage
      await AsyncStorage.removeItem(this.OPENAI_API_KEY);
    } catch (error) {
      console.error('Error removing OpenAI key from backend:', error);
      // If backend fails, still remove locally
      await AsyncStorage.removeItem(this.OPENAI_API_KEY);
      throw error;
    }
  }

  // Settings methods
  async getNotificationsEnabled(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(this.NOTIFICATIONS_ENABLED);
      return value === null ? true : value === 'true';
    } catch (error) {
      console.error('Error getting notifications setting:', error);
      return true;
    }
  }

  async setNotificationsEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(this.NOTIFICATIONS_ENABLED, enabled.toString());
    } catch (error) {
      console.error('Error saving notifications setting:', error);
      throw error;
    }
  }

  async getAutoSaveEnabled(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(this.AUTO_SAVE_ENABLED);
      return value === null ? true : value === 'true';
    } catch (error) {
      console.error('Error getting auto save setting:', error);
      return true;
    }
  }

  async setAutoSaveEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(this.AUTO_SAVE_ENABLED, enabled.toString());
    } catch (error) {
      console.error('Error saving auto save setting:', error);
      throw error;
    }
  }

  // Clear all data (for logout)
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.OPENAI_API_KEY,
        this.NOTIFICATIONS_ENABLED,
        this.AUTO_SAVE_ENABLED
      ]);
      console.log('✅ All settings cleared');
    } catch (error) {
      console.error('Error clearing settings:', error);
      throw error;
    }
  }
}

export default StorageService.getInstance(); 