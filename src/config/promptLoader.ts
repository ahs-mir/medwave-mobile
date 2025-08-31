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
    // Check cache first
    if (this.promptsCache.has(promptId)) {
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
      switch (promptId) {
        case 'clinical':
          return require('./prompts/clinical.json');
        case 'consultation':
          return require('./prompts/consultation.json');
        case 'referral':
          return require('./prompts/referral.json');
        case 'discharge':
          return require('./prompts/discharge.json');
        case 'soap':
          return require('./prompts/soap.json');
        case 'generic':
          return require('./prompts/generic.json');
        default:
          console.warn(`Unknown prompt ID: ${promptId}`);
          return null;
      }
    } catch (error) {
      console.error(`Failed to load prompt file for ${promptId}:`, error);
      return null;
    }
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
    const requiredFields = [
      'id', 'name', 'description', 'icon', 'systemRole', 
      'userPrompt', 'temperature', 'maxTokens', 'version', 
      'lastModified', 'author', 'category', 'isActive'
    ];

    return requiredFields.every(field => promptData.hasOwnProperty(field)) &&
           typeof promptData.id === 'string' &&
           typeof promptData.name === 'string' &&
           typeof promptData.systemRole === 'string' &&
           typeof promptData.userPrompt === 'string' &&
           typeof promptData.temperature === 'number' &&
           typeof promptData.maxTokens === 'number' &&
           typeof promptData.isActive === 'boolean';
  }

  /**
   * Clear the cache (useful for development/testing)
   */
  clearCache(): void {
    this.promptsCache.clear();
    this.indexCache = null;
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
