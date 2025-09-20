import { Platform } from 'react-native';

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
   * Load the prompt index file
   */
  async loadPromptIndex(): Promise<PromptIndex> {
    if (this.indexCache) {
      return this.indexCache;
    }

    try {
      // In React Native, we need to use require for static assets
      const indexData = require('./prompts/index.json');
      this.indexCache = indexData;
      return indexData;
    } catch (error) {
      console.error('Failed to load prompt index:', error);
      throw new Error('Failed to load prompt index');
    }
  }

  /**
   * Load a specific prompt by ID
   */
  async loadPrompt(promptId: string): Promise<PromptConfig | null> {
    // For development, always reload to get latest changes
    // In production, you might want to keep the cache
    if (__DEV__) {
      this.promptsCache.delete(promptId);
    } else if (this.promptsCache.has(promptId)) {
      return this.promptsCache.get(promptId)!;
    }

    try {
      // Use a static mapping approach instead of dynamic require
      const promptData = this.getPromptData(promptId);
      
      if (promptData && this.validatePrompt(promptData)) {
        // Cache the prompt
        this.promptsCache.set(promptId, promptData);
        return promptData;
      } else {
        console.error(`Invalid prompt data for ${promptId}`);
        return null;
      }
    } catch (error) {
      console.error(`Failed to load prompt ${promptId}:`, error);
      return null;
    }
  }

  /**
   * Get prompt data using static require statements
   * This approach is compatible with React Native
   */
  private getPromptData(promptId: string): PromptConfig | null {
    try {
      console.log(`🔍 Loading prompt data for: ${promptId}`);
      let promptData: PromptConfig | null = null;
      
      switch (promptId) {
        case 'clinical':
          promptData = require('./prompts/clinical.json');
          break;
        case 'consultation':
          promptData = require('./prompts/consultation.json');
          break;
        case 'consultation-paragraph':
          promptData = require('./prompts/consultation-paragraph.json');
          break;
        case 'referral':
          promptData = require('./prompts/referral.json');
          break;
        case 'discharge':
          promptData = require('./prompts/discharge.json');
          break;
        case 'custom':
          promptData = require('./prompts/custom.json');
          break;
        case 'soap':
          promptData = require('./prompts/soap.json');
          break;
        case 'generic':
          promptData = require('./prompts/generic.json');
          break;
        default:
          console.warn(`Unknown prompt ID: ${promptId}`);
          return null;
      }
      
      console.log(`✅ Loaded prompt data for ${promptId}:`, promptData ? 'SUCCESS' : 'NULL');
      return promptData;
    } catch (error) {
      console.error(`❌ Failed to load prompt file for ${promptId}:`, error);
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
   * Load all active prompts
   */
  async loadAllPrompts(): Promise<PromptConfig[]> {
    try {
      const index = await this.loadPromptIndex();
      const activePrompts: PromptConfig[] = [];

      for (const promptInfo of index.prompts) {
        if (promptInfo.isActive) {
          const prompt = await this.loadPrompt(promptInfo.id);
          if (prompt) {
            activePrompts.push(prompt);
          }
        }
      }

      return activePrompts;
    } catch (error) {
      console.error('Failed to load all prompts:', error);
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
      const index = await this.loadPromptIndex();
      const promptInfo = index.prompts.find(p => p.id === promptId);
      return promptInfo || null;
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
