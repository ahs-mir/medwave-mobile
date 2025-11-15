import { Platform } from 'react-native';
import ApiService from '../services/ApiService';

export interface PromptConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  systemRole: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
  version: string;
  lastModified: string;
  author: string;
  category: string;
  isActive: boolean;
}

export interface PromptIndex {
  version: string;
  lastUpdated: string;
  totalPrompts: number;
  categories: string[];
  prompts: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    isActive: boolean;
    file: string;
  }>;
}

class PromptLoader {
  private static instance: PromptLoader;
  private promptsCache: Map<string, PromptConfig> = new Map();
  private indexCache: PromptIndex | null = null;

  private constructor() {}

  static getInstance(): PromptLoader {
    if (!PromptLoader.instance) {
      PromptLoader.instance = new PromptLoader();
    }
    return PromptLoader.instance;
  }

  /**
   * Load the prompt index from database API
   */
  async loadPromptIndex(): Promise<PromptIndex> {
    try {
      console.log('🌐 Fetching prompt index from database API...');
      
      const letterTypes = await ApiService.getLetterTypes();
      
      // Build index from database data
      const categories = Array.from(new Set(letterTypes.map((lt: any) => lt.category)));
      
      const indexData: PromptIndex = {
        version: '2.0.0',
        lastUpdated: new Date().toISOString().split('T')[0],
        totalPrompts: letterTypes.length,
        categories,
        prompts: letterTypes.map((lt: any) => ({
          id: lt.id,
          name: lt.name,
          description: lt.description,
          icon: lt.icon,
          category: lt.category,
          isActive: lt.isActive,
          file: `${lt.id}.json` // For compatibility
        }))
      };
      
      this.indexCache = indexData;
      console.log(`✅ Loaded prompt index from database: ${indexData.totalPrompts} prompts`);
      return indexData;
    } catch (error) {
      console.error('❌ Failed to load prompt index from database:', error);
      throw new Error('Failed to load prompt index from database');
    }
  }

  /**
   * Load a specific prompt by ID from database API
   */
  async loadPrompt(promptId: string): Promise<PromptConfig | null> {
    // Check cache first (unless in development mode)
    if (!__DEV__ && this.promptsCache.has(promptId)) {
      console.log(`📦 Using cached prompt: ${promptId}`);
      return this.promptsCache.get(promptId)!;
    }

    try {
      console.log(`🌐 Fetching prompt from database API: ${promptId}`);
      
      // Fetch from backend API
      const apiData = await ApiService.getLetterType(promptId);
      
      // Map backend field names to frontend format
      const promptData: PromptConfig = {
        id: apiData.id,
        name: apiData.name,
        description: apiData.description,
        icon: apiData.icon,
        systemRole: apiData.systemRole,
        userPrompt: apiData.userPrompt,
        temperature: apiData.temperature,
        maxTokens: apiData.maxTokens,
        version: apiData.version,
        author: apiData.author,
        category: apiData.category,
        isActive: apiData.isActive,
        lastModified: apiData.lastModified
      };
      
      if (this.validatePrompt(promptData)) {
        // Cache the prompt
        this.promptsCache.set(promptId, promptData);
        console.log(`✅ Loaded and cached prompt from database: ${promptId}`);
        return promptData;
      } else {
        console.error(`❌ Invalid prompt data from API for ${promptId}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Failed to load prompt ${promptId} from database:`, error);
      return null;
    }
  }


  /**
   * Clear the prompt cache
   */
  clearCache(): void {
    this.promptsCache.clear();
    this.indexCache = null;
  }

  /**
   * Load all active prompts from database API
   */
  async loadAllPrompts(): Promise<PromptConfig[]> {
    try {
      console.log('🌐 Fetching all letter types from database API...');
      
      // Fetch all letter types from backend
      const apiData = await ApiService.getLetterTypes();
      
      // Map and filter active prompts
      const prompts: PromptConfig[] = apiData
        .filter((item: any) => item.isActive)
        .map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          icon: item.icon,
          systemRole: item.systemRole,
          userPrompt: item.userPrompt,
          temperature: item.temperature,
          maxTokens: item.maxTokens,
          version: item.version,
          author: item.author,
          category: item.category,
          isActive: item.isActive,
          lastModified: item.lastModified
        }));
      
      // Cache all prompts
      prompts.forEach(prompt => {
        this.promptsCache.set(prompt.id, prompt);
      });
      
      console.log(`✅ Loaded ${prompts.length} active prompts from database`);
      return prompts;
    } catch (error) {
      console.error('❌ Failed to load all prompts from database:', error);
      return [];
    }
  }

  /**
   * Get prompts by category
   */
  async getPromptsByCategory(category: string): Promise<PromptConfig[]> {
    try {
      const allPrompts = await this.loadAllPrompts();
      return allPrompts.filter(prompt => prompt.category === category);
    } catch (error) {
      console.error(`Failed to get prompts for category ${category}:`, error);
      return [];
    }
  }

  /**
   * Validate prompt data structure
   */
  private validatePrompt(promptData: any): promptData is PromptConfig {
    if (!promptData || typeof promptData !== 'object') {
      console.error('❌ Prompt validation failed: Invalid prompt data structure');
      return false;
    }

    const requiredFields = [
      'id', 'name', 'description', 'icon', 'systemRole', 
      'userPrompt', 'temperature', 'maxTokens', 'version', 
      'lastModified', 'author', 'category', 'isActive'
    ];

    const missingFields = requiredFields.filter(field => !promptData.hasOwnProperty(field));
    if (missingFields.length > 0) {
      console.error('❌ Prompt validation failed: Missing fields:', missingFields);
      return false;
    }

    const typeErrors = [];
    if (typeof promptData.id !== 'string') typeErrors.push('id should be string');
    if (typeof promptData.name !== 'string') typeErrors.push('name should be string');
    if (typeof promptData.systemRole !== 'string') typeErrors.push('systemRole should be string');
    if (typeof promptData.userPrompt !== 'string') typeErrors.push('userPrompt should be string');
    if (typeof promptData.temperature !== 'number') typeErrors.push('temperature should be number');
    if (typeof promptData.maxTokens !== 'number') typeErrors.push('maxTokens should be number');
    if (typeof promptData.isActive !== 'boolean') typeErrors.push('isActive should be boolean');

    if (typeErrors.length > 0) {
      console.error('❌ Prompt validation failed: Type errors:', typeErrors);
      return false;
    }

    console.log('✅ Prompt validation passed');
    return true;
  }


  /**
   * Get prompt metadata without loading full content
   */
  async getPromptMetadata(promptId: string): Promise<{
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    isActive: boolean;
  } | null> {
    try {
      // Fetch from API
      const letterType = await ApiService.getLetterType(promptId);
      return {
        id: letterType.id,
        name: letterType.name,
        description: letterType.description,
        icon: letterType.icon,
        category: letterType.category,
        isActive: letterType.isActive
      };
    } catch (error) {
      console.error(`Failed to get prompt metadata for ${promptId}:`, error);
      return null;
    }
  }

  /**
   * Check if a prompt exists and is active
   */
  async isPromptActive(promptId: string): Promise<boolean> {
    try {
      const metadata = await this.getPromptMetadata(promptId);
      return metadata?.isActive || false;
    } catch (error) {
      return false;
    }
  }
}

export default PromptLoader;
