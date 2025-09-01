#!/usr/bin/env node

import 'dotenv/config';
import Together from "together-ai";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';

// Get script directory for relative imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Flux Icon Generation Script for Farcaster Mini Apps
 *
 * This script generates AI-powered icons using the Flux API.
 * Environment variables are automatically loaded from .env file using dotenv.
 *
 * Usage:
 *   node scripts/generate-flux-icon.js
 *   node scripts/generate-flux-icon.js [prompt]
 */

// Flux API configuration
const FLUX_MODEL = {
  id: 'black-forest-labs/FLUX.1-schnell-Free',
  displayName: 'FLUX.1-schnell (Free)',
  defaultSteps: 4 // Fast generation with good quality
};

// Icon dimensions (square format, optimized for Farcaster)
const ICON_DIMENSIONS = {
  width: 208,
  height: 208
};

/**
 * Generate timestamp-based filename
 * @param {string} type - The image type (icon)
 * @param {string} prefix - The filename prefix (flux)
 * @returns {string} - The generated filename
 */
function generateFilename(type, prefix = 'flux') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}-${type}-${timestamp}.png`;
}

/**
 * Clears all existing icon images from the public/images directory
 */
function clearExistingIcons() {
  const imagesDir = join(process.cwd(), 'public/images');

  if (!existsSync(imagesDir)) {
    return;
  }

  const files = readdirSync(imagesDir);
  const iconFiles = files.filter(file => file.startsWith('flux-icon-') && file.endsWith('.png'));

  console.log('🗑️  Clearing existing icon images...');
  iconFiles.forEach(file => {
    const filePath = join(imagesDir, file);
    try {
      unlinkSync(filePath);
      console.log(`   Deleted: ${file}`);
    } catch (error) {
      console.warn(`   Failed to delete: ${file}`);
    }
  });
}

/**
 * Downloads and saves an image from base64 data to the public/images directory
 * @param {string} base64Data - Base64 encoded image data
 * @param {string} filename - Filename to save the image as
 * @param {boolean} isBase64 - Whether the data is base64 encoded (default: false for URL)
 */
async function downloadAndSaveImage(base64Data, filename, isBase64 = false) {
  try {
    let buffer;
    
    if (isBase64) {
      // Handle base64 data from Flux API
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      // Handle URL (fallback for other image sources)
      const response = await fetch(base64Data);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    const imagesDir = join(process.cwd(), 'public/images');
    
    // Ensure images directory exists
    if (!existsSync(imagesDir)) {
      mkdirSync(imagesDir, { recursive: true });
    }
    
    const filePath = join(imagesDir, filename);
    writeFileSync(filePath, buffer);
    console.log(`💾 Image saved: ${filename}`);

    return { filename, filePath };
  } catch (error) {
    console.error(`❌ Failed to save image: ${error.message}`);
    throw error;
  }
}

/**
 * Generate a single icon using the Together AI API
 * @param {Together} together - The Together AI client instance
 * @param {string} prompt - The image generation prompt
 * @param {Object} dimensions - The image dimensions {width, height}
 * @returns {Promise<Object>} - The generation result with filename
 */
async function generateIcon(together, prompt, dimensions = ICON_DIMENSIONS) {
  const startTime = Date.now();
  console.log(`\n🎨 Generating icon image (${dimensions.width}x${dimensions.height})...`);
  console.log(`📝 Prompt: ${prompt}`);
  
  try {
    const response = await together.images.create({
      model: FLUX_MODEL.id,
      prompt: prompt,
      width: dimensions.width,
      height: dimensions.height,
      steps: FLUX_MODEL.defaultSteps,
      n: 1,
      seed: Math.floor(Math.random() * 1000000),
      response_format: 'b64_json'
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No image data received from API');
    }

    const imageData = response.data[0];
    if (!imageData.b64_json) {
      throw new Error('No base64 image data in response');
    }

    // Generate filename with timestamp
    const filename = generateFilename('icon', 'flux');
    const result = await downloadAndSaveImage(imageData.b64_json, filename, true);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);
    
    console.log(`✅ Generated icon image in ${duration}s: ${result.filename}`);
    return result;
    
  } catch (error) {
    console.error(`❌ Failed to generate icon image:`, error.message);
    throw error;
  }
}

/**
 * Reads and parses the Farcaster configuration file to extract app name
 * @returns {string} - The app name from farcaster.json
 */
function getAppNameFromConfig() {
  try {
    const configPath = join(process.cwd(), 'public/.well-known/farcaster.json');
    const configContent = readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    return config.miniapp?.name || 'Mini App';
  } catch (error) {
    console.warn('⚠️  Warning: Could not read app name from farcaster.json, using default');
    return 'Mini App';
  }
}

/**
 * Generate icon prompt based on app name
 * @param {string} appName - The app name
 * @returns {string} - The generated prompt
 */
function generateIconPrompt(appName) {
  return `Create a clean, minimalist square app icon for "${appName}". The icon should be:
- Modern and professional design
- 1:1 aspect ratio (square format)
- High contrast colors that work well at small sizes
- Simple, geometric shapes or clean typography
- Suitable for a mobile app icon
- No complex details that become unclear when scaled down
- If text is included, make it bold and highly readable`;
}

/**
 * Updates the farcaster.json file with the generated icon URL
 * @param {string} iconFilename - The icon filename
 */
function updateFarcasterConfigWithIcon(iconFilename) {
  try {
    const configPath = join(process.cwd(), 'public/.well-known/farcaster.json');
    
    if (!existsSync(configPath)) {
      console.warn('⚠️  Warning: farcaster.json file not found, skipping update');
      return;
    }

    const configContent = readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);

    // Get domain from existing config or environment
    const domain = config.miniapp?.homeUrl ? 
      new URL(config.miniapp.homeUrl).origin : 
      `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}`;

    // Update icon URL
    if (config.miniapp && iconFilename) {
      config.miniapp.iconUrl = `${domain}/images/${iconFilename}`;
    }

    // Write updated config
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('✅ Updated farcaster.json with new icon URL');
    
  } catch (error) {
    console.error('❌ Error updating farcaster.json:', error.message);
  }
}

/**
 * Main function to generate Flux icon
 */
async function main() {
  try {
    // Validate API key
    const apiKey = process.env.TOGETHER_API_KEY;
    if (!apiKey) {
      console.error('❌ Error: TOGETHER_API_KEY is not set.');
      console.error('   Please add your Together AI API key to your .env file.');
      console.error('   Get your API key from: https://api.together.xyz/settings/api-keys');
      process.exit(1);
    }

    // Get app name and generate prompt
    const appName = getAppNameFromConfig();
    const customPrompt = process.argv[2]; // Allow custom prompt as argument
    const prompt = customPrompt || generateIconPrompt(appName);

    console.log('🎨 Flux Icon Generator for Farcaster Mini Apps');
    console.log(`📱 App: ${appName}`);
    console.log(`🖼️  Dimensions: ${ICON_DIMENSIONS.width}x${ICON_DIMENSIONS.height}px`);

    // Clear existing icons
    clearExistingIcons();

    // Initialize Together AI client
    console.log('\n🚀 Initializing Together AI client...');
    const together = new Together({ apiKey });

    console.log(`\n📝 Model: ${FLUX_MODEL.displayName}`);
    console.log(`📐 Dimensions: ${ICON_DIMENSIONS.width}x${ICON_DIMENSIONS.height}px`);

    // Generate icon
    const iconResult = await generateIcon(together, prompt, ICON_DIMENSIONS);
    
    // Update farcaster.json with new icon
    updateFarcasterConfigWithIcon(iconResult.filename);

    console.log('\n🎉 Icon generation complete!');
    console.log(`   📁 Saved: public/images/${iconResult.filename}`);
    console.log('   ✅ Updated: public/.well-known/farcaster.json');

  } catch (error) {
    console.error('\n❌ Error generating icon:');
    console.error('💥', error.message);
    
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      console.error('⏰ Rate Limit: Please wait before making another request');
    }
    
    process.exit(1);
  }
}

// Run the script when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { 
  generateIcon,
  generateIconPrompt,
  getAppNameFromConfig,
  clearExistingIcons,
  downloadAndSaveImage,
  updateFarcasterConfigWithIcon
};
