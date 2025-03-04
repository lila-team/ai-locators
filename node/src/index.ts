import { selectors } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';


export interface AILocatorOptions {
  apiKey: string;
  baseUrl: string;
  model: string;
  selectorPrefix?: string;
}

export async function registerAISelector(
  options: AILocatorOptions
): Promise<void> {
  const {
    apiKey,
    baseUrl,
    model,
    selectorPrefix = 'ai'
  } = options;
  // Read the selector.js file from the root assets directory

  const selectorJsPath = path.join(__dirname, '../assets/selector.js');
  const compiledSelectorJsPath = path.join(__dirname, '../assets/compiled_selector.js');
  
  // Use compiled file if it exists (in published package), otherwise use symlink (in development)
  const finalSelectorJsPath = fs.existsSync(compiledSelectorJsPath) 
    ? compiledSelectorJsPath 
    : selectorJsPath;
  let jsContent = fs.readFileSync(finalSelectorJsPath, 'utf-8');

  // Replace the configuration in the JS content
  jsContent = jsContent.replace(
    /LLM_API_URL:\s*['"].*['"]/,
    `LLM_API_URL: "${baseUrl}/chat/completions"`
  );
  jsContent = jsContent.replace(
    /LLM_MODEL:\s*['"].*['"]/,
    `LLM_MODEL: "${model}"`
  );
  jsContent = jsContent.replace(
    /LLM_API_KEY:\s*['"].*['"]/,
    `LLM_API_KEY: "${apiKey}"`
  );

  // Register the selector with Playwright
  await selectors.register(selectorPrefix, {
    content: jsContent
  });
}