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
 * Hybrid Image Generation Script for Farcaster Mini Apps
 *
 * This script generates:
 * - Icon: AI-generated using Flux API (200x200px)
 * - Embed & Splash: Screenshots using browserless API
 * Environment variables are automatically loaded from .env file using dotenv.
 *
 * Required environment variables:
 *   TOGETHER_API_KEY - Your Together AI API key for icon generation
 *   NEXT_PUBLIC_APP_DOMAIN - Your app domain to screenshot
 *
 * Usage:
 *   node scripts/generate-flux-images.js
 */

// FLUX model configuration for icon generation
const FLUX_MODEL = {
  id: 'black-forest-labs/FLUX.1-schnell-Free',
  description: 'Free FLUX model for fast generation',
  defaultSteps: 4,
  maxSteps: 4
};

// Screenshot configuration
const SCREENSHOT_CONFIG = {
  baseUrl: process.env.BROWSERLESS_API_URL,
  delay: 2 // seconds between screenshots
};

// Rate limit configuration
const DEFAULT_GENERATION_DELAY = 12; // seconds

/**
 * Sleep utility function to add delays between API calls
 * @param {number} seconds - Number of seconds to wait
 */
async function sleep(seconds) {
  console.log(`⏳ Waiting ${seconds}s to respect rate limits...`);
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// Farcaster Mini App dimensions based on official specification
const FARCASTER_DIMENSIONS = {
  // Icon image - square format (200x200px for splashImageUrl)
  icon: {
    width: 208, // rounded to multiple of 16 for FLUX compatibility
    height: 208
  },
  // Embed image - 3:2 aspect ratio for social feed display
  embed: {
    width: 768, // 3:2 ratio, multiple of 16
    height: 512
  },
  // Splash image - web Mini App size (424x695px per spec)
  splash: {
    width: 432, // 424 rounded up to nearest multiple of 16
    height: 704 // 695 rounded up to nearest multiple of 16
  }
};

// Screenshot viewport dimensions (larger for better quality)
const SCREENSHOT_VIEWPORTS = {
  embed: {
    width: 768, // 3:2 ratio, multiple of 16
    height: 512
  },
  splash: {
    width: 424,
    height: 695
  }
};

/**
 * Ensure URL has proper protocol
 * @param {string} url - The URL to check
 * @returns {string} - URL with https:// prefix if needed
 */
function ensureProtocol(url) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

/**
 * Take screenshot using integrated browserless API
 * @param {string} url - The URL to screenshot
 * @param {Object} viewport - The viewport dimensions
 * @param {string} filename - The output filename
 * @returns {Promise<string>} - The generated screenshot filename
 */
async function takeScreenshot(url, viewport, filename) {
  console.log(`📸 Taking screenshot with viewport ${viewport.width}x${viewport.height}...`);
  
  try {
    const fullUrl = ensureProtocol(url);
    console.log(`🔗 Using browserless API: ${SCREENSHOT_CONFIG.baseUrl}`);
    
    // Prepare request body
    const requestBody = {
      url: fullUrl,
      gotoOptions: { waitUntil: 'networkidle2' },
      viewport: viewport,
      waitForFunction: {
        fn: "() => document.body && document.body.innerText.toLowerCase().includes('by uratmangun')",
        timeout: 10000
      }
    };

    console.log(`📋 Request options: ${JSON.stringify(requestBody, null, 2)}`);

    // Make API request
    const apiUrl = `${SCREENSHOT_CONFIG.baseUrl}/screenshot?token=dawdawdwa`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`);
    }

    // Check if response is actually an image
    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      const errorText = await response.text();
      throw new Error(`Expected image response, got ${contentType}\n${errorText}`);
    }

    // Get image data and save directly to images directory
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    const outputDir = join(process.cwd(), 'public', 'images');
    
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = join(outputDir, filename);
    writeFileSync(outputPath, imageBuffer);
    
    console.log(`✅ Screenshot saved: ${filename} (${(imageBuffer.length / 1024).toFixed(2)} KB)`);
    return filename;
  } catch (error) {
    console.error(`❌ Screenshot failed: ${error.message}`);
    throw error;
  }
}

/**
 * Creates a prompt for icon image generation (square format)
 * @param {string} appName - The app name from farcaster.json
 * @returns {string} - The generated prompt for icon creation
 */
function createIconPrompt(appName) {
  if (!appName || typeof appName !== 'string' || appName.trim().length === 0) {
    appName = 'Mini App';
  }

  const cleanAppName = appName.trim();
  const prompt = `Create a clean, minimalist app icon with the text '${cleanAppName}' in bold, modern typography. Square format, centered text, simple background, high contrast, professional design suitable for mobile app icon. Clean and readable at small sizes.`;

  console.log(`🎨 Generated icon prompt for: "${cleanAppName}"`);
  return prompt;
}

/**
 * Generate timestamp-based filename
 * @param {string} type - The image type (icon, embed, splash)
 * @param {string} prefix - The filename prefix (flux or screenshot)
 * @returns {string} - The generated filename
 */
function generateFilename(type, prefix = 'screenshot') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}-${type}-${timestamp}.png`;
}


/**
 * Reads and parses the Farcaster configuration file
 * @returns {object} - Parsed Farcaster configuration
 */
function readFarcasterConfig() {
  try {
    const configPath = join(process.cwd(), 'public/.well-known/farcaster.json');
    const configContent = readFileSync(configPath, 'utf8');
    return JSON.parse(configContent);
  } catch (error) {
    console.warn('⚠️  Warning: Could not read Farcaster configuration file');
    console.warn('   Expected location: public/.well-known/farcaster.json');
    return null;
  }
}

/**
 * Extracts image generation parameters from Farcaster config
 * @param {object} config - Farcaster configuration object
 * @returns {object} - Extracted parameters for image generation
 */
function extractFarcasterParams(config) {
  if (!config || !config.miniapp) {
    return {};
  }

  const miniapp = config.miniapp;

  // Extract values from lines 10, 12, and 14 as requested
  // Line 10: iconUrl, Line 12: imageUrl, Line 14: splashImageUrl
  const params = {
    iconUrl: miniapp.iconUrl,
    imageUrl: miniapp.imageUrl,
    splashImageUrl: miniapp.splashImageUrl,
    appName: miniapp.name,
    backgroundColor: miniapp.splashBackgroundColor
  };

  console.log('📋 Extracted Farcaster parameters:');
  console.log(`   App Name: ${params.appName}`);
  console.log(`   Icon URL: ${params.iconUrl}`);
  console.log(`   Image URL: ${params.imageUrl}`);
  console.log(`   Splash Image URL: ${params.splashImageUrl}`);
  console.log(`   Background Color: ${params.backgroundColor}`);

  return params;
}

/**
 * Clears all existing images from the public/images directory
 */
function clearExistingImages() {
  const imagesDir = join(process.cwd(), 'public/images');

  if (!existsSync(imagesDir)) {
    console.log('📁 Creating public/images directory...');
    mkdirSync(imagesDir, { recursive: true });
    return;
  }

  console.log('🗑️  Clearing existing images...');
  const files = readdirSync(imagesDir);

  files.forEach(file => {
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
 * Generate a single image using the Together AI API (for icons)
 * @param {Together} together - The Together AI client instance
 * @param {string} prompt - The image generation prompt
 * @param {Object} dimensions - The image dimensions {width, height}
 * @param {string} type - The image type (icon)
 * @returns {Promise<Object>} - The generation result with filename
 */
async function generateSingleImage(together, prompt, dimensions, type) {
  const startTime = Date.now();
  console.log(`\n🎨 Generating ${type} image (${dimensions.width}x${dimensions.height})...`);
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
    const filename = generateFilename(type, 'flux');
    const result = await downloadAndSaveImage(imageData.b64_json, filename, true);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);
    
    console.log(`✅ Generated ${type} image in ${duration}s: ${result.filename}`);
    return result;
    
  } catch (error) {
    console.error(`❌ Failed to generate ${type} image:`, error.message);
    throw error;
  }
}

/**
 * Generate a single screenshot with specific viewport
 * @param {string} url - The URL to screenshot
 * @param {Object} viewport - The viewport dimensions {width, height}
 * @param {string} type - The image type (embed, splash)
 * @returns {Promise<Object>} - The screenshot result with filename
 */
async function generateSingleScreenshot(url, viewport, type) {
  const startTime = Date.now();
  console.log(`\n📸 Taking ${type} screenshot (${viewport.width}x${viewport.height})...`);
  console.log(`🌐 URL: ${url}`);
  
  try {
    const filename = generateFilename(type, 'screenshot');
    await takeScreenshot(url, viewport, filename);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);
    
    console.log(`✅ Generated ${type} screenshot in ${duration}s: ${filename}`);
    return { filename: filename };
    
  } catch (error) {
    console.error(`❌ Failed to generate ${type} screenshot:`, error.message);
    throw error;
  }
}

/**
 * Updates the farcaster.json file with the correct domain and generated image URLs
 * @param {string} domain - The NEXT_PUBLIC_APP_DOMAIN to use
 * @param {object} imageFilenames - Object containing filenames for icon, embed, and splash images
 */
function updateFarcasterConfig(domain, imageFilenames) {
  try {
    const configPath = join(process.cwd(), 'public/.well-known/farcaster.json');

    if (!existsSync(configPath)) {
      console.warn('⚠️  Warning: farcaster.json file not found, skipping update');
      return false;
    }

    // Read current config
    const configContent = readFileSync(configPath, 'utf8');
    let config = JSON.parse(configContent);

    // Clean domain - remove protocol if present to avoid double https://
    const cleanDomain = domain.replace(/^https?:\/\//, '');

    // Track what we're updating
    const updates = [];

    // Create URLs for each image type
    const iconUrl = `https://${cleanDomain}/images/${imageFilenames.icon}`;
    const embedUrl = `https://${cleanDomain}/images/${imageFilenames.embed}`;
    const splashUrl = `https://${cleanDomain}/images/${imageFilenames.splash}`;

    // Update domain references in miniapp section
    if (config.miniapp) {
      // Update iconUrl to point to generated icon image
      if (config.miniapp.iconUrl) {
        const oldIconUrl = config.miniapp.iconUrl;
        config.miniapp.iconUrl = iconUrl;
        updates.push(`iconUrl: ${oldIconUrl} → ${config.miniapp.iconUrl}`);
      }

      // Update homeUrl domain
      if (config.miniapp.homeUrl && config.miniapp.homeUrl.includes('your-domain.com')) {
        const oldHomeUrl = config.miniapp.homeUrl;
        config.miniapp.homeUrl = config.miniapp.homeUrl.replace(/https:\/\/your-domain\.com/g, `https://${cleanDomain}`);
        updates.push(`homeUrl: ${oldHomeUrl} → ${config.miniapp.homeUrl}`);
      }

      // Update imageUrl to point to generated embed image
      if (config.miniapp.imageUrl) {
        const oldImageUrl = config.miniapp.imageUrl;
        config.miniapp.imageUrl = embedUrl;
        updates.push(`imageUrl: ${oldImageUrl} → ${config.miniapp.imageUrl}`);
      }

      // Update splashImageUrl to point to generated splash image
      if (config.miniapp.splashImageUrl) {
        const oldSplashImageUrl = config.miniapp.splashImageUrl;
        config.miniapp.splashImageUrl = splashUrl;
        updates.push(`splashImageUrl: ${oldSplashImageUrl} → ${config.miniapp.splashImageUrl}`);
      }
    }

    // Write updated config back to file
    const updatedContent = JSON.stringify(config, null, 2);
    writeFileSync(configPath, updatedContent, 'utf8');

    // Report success
    if (updates.length > 0) {
      console.log('\n✅ Successfully updated farcaster.json:');
      console.log('=' .repeat(60));
      updates.forEach(update => console.log(`   ${update}`));
      console.log('=' .repeat(60));
    } else {
      console.log('\n📝 No updates needed in farcaster.json (already configured)');
    }

    return true;
  } catch (error) {
    console.error(`❌ Failed to update farcaster.json: ${error.message}`);
    console.warn('   Continuing with image generation...');
    return false;
  }
}

/**
 * Main image generation function
 */
async function generateImage() {
  try {
    // Check for Together AI API key for icon generation
    const apiKey = process.env.TOGETHER_API_KEY;
    if (!apiKey) {
      console.error('❌ Error: TOGETHER_API_KEY is not set.');
      console.log('\n💡 To fix this:');
      console.log('   1. Get your API key from: https://api.together.xyz/settings/api-keys');
      console.log('   2. Add TOGETHER_API_KEY to your .env file');
      console.log('\n📝 This is needed for AI icon generation');
      process.exit(1);
    }

    // Check for app domain (required for screenshots)
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN;
    if (!appDomain) {
      console.error('❌ Error: NEXT_PUBLIC_APP_DOMAIN is not set.');
      console.log('\n💡 To fix this:');
      console.log('   1. Add NEXT_PUBLIC_APP_DOMAIN to your .env file');
      console.log('   2. Example: NEXT_PUBLIC_APP_DOMAIN=https://your-app.vercel.app');
      console.log('\n📝 This URL will be used to take screenshots of your app');
      process.exit(1);
    }

    const farcasterDomain = appDomain;
    console.log(`🌐 Taking screenshots of: ${farcasterDomain}`);

    // Read Farcaster configuration
    console.log('📖 Reading Farcaster configuration...');
    const farcasterConfig = readFarcasterConfig();
    const farcasterParams = extractFarcasterParams(farcasterConfig);

    // Handle help flag
    if (process.argv[2] === '--help' || process.argv[2] === '-h') {
      console.log('\n📋 FLUX Multi-Image Generation for Farcaster Mini Apps');
      console.log('=' .repeat(60));
      console.log('\n💡 Usage:');
      console.log('   node scripts/generate-flux-images.js');
      console.log('\n🎯 What it does:');
      console.log('   - Reads your app name from farcaster.json');
      console.log('   - Generates THREE optimized images for different use cases:');
      console.log('     📱 Icon image (208x208px) - Square app icon');
      console.log('     🖼️  Embed image (768x512px) - 3:2 ratio for social feeds');
      console.log('     🚀 Splash image (432x704px) - Vertical splash screen');
      console.log('   - Automatically updates farcaster.json with all three image URLs');
      console.log('\n⚙️  Configuration (.env file):');
      console.log('   TOGETHER_API_KEY=your-api-key-here     (required)');
      console.log('   NEXT_PUBLIC_APP_DOMAIN=your-domain.com       (optional)');
      console.log('\n🎨 Model: black-forest-labs/FLUX.1-schnell-Free');
      console.log('📐 Optimized dimensions for Farcaster Mini App guidelines');
      return;
    }

    // Extract app name from farcaster config for icon generation
    const appName = farcasterParams.appName || 'Mini App';

    // Create prompt for icon image
    const iconPrompt = createIconPrompt(appName);

    console.log('\n🎯 Generating hybrid images for your Mini App...');
    console.log('   📱 Icon: AI-generated using Flux (208x208px)');
    console.log('   🖼️  Embed: Screenshot (1200x800px viewport)');
    console.log('   🚀 Splash: Screenshot (424x695px viewport)');

    // Clear existing images and prepare directory
    clearExistingImages();

    // Initialize Together AI client
    console.log('\n🚀 Initializing Together AI client...');
    const together = new Together({ apiKey });

    // Display generation parameters
    console.log('\n📝 Generation Parameters:');
    console.log('=' .repeat(50));
    console.log(`🎨 Model: ${FLUX_MODEL.id}`);
    console.log(`🔗 Screenshot URL: ${farcasterDomain}`);
    console.log(`📱 Icon: ${FARCASTER_DIMENSIONS.icon.width}x${FARCASTER_DIMENSIONS.icon.height}px (AI)`);
    console.log(`🖼️  Embed: ${SCREENSHOT_VIEWPORTS.embed.width}x${SCREENSHOT_VIEWPORTS.embed.height}px (Screenshot)`);
    console.log(`🚀 Splash: ${SCREENSHOT_VIEWPORTS.splash.width}x${SCREENSHOT_VIEWPORTS.splash.height}px (Screenshot)`);
    console.log('=' .repeat(50));

    console.log('\n⏳ Generating images...');
    const overallStartTime = Date.now();
    await sleep(105);
    // Generate AI icon
    const iconResult = await generateSingleImage(
      together,
      iconPrompt,
      FARCASTER_DIMENSIONS.icon,
      'icon'
    );

    // Wait between generations
    await sleep(SCREENSHOT_CONFIG.delay);

    // Take embed screenshot  
    const embedResult = await generateSingleScreenshot(
      farcasterDomain,
      SCREENSHOT_VIEWPORTS.embed,
      'embed'
    );

    // Wait between screenshots
    await sleep(SCREENSHOT_CONFIG.delay);

    // Take splash screenshot
    const splashResult = await generateSingleScreenshot(
      farcasterDomain,
      SCREENSHOT_VIEWPORTS.splash,
      'splash'
    );

    const overallEndTime = Date.now();
    const totalDuration = ((overallEndTime - overallStartTime) / 1000).toFixed(1);

    // Collect all generated filenames
    const imageFilenames = {
      icon: iconResult.filename,
      embed: embedResult.filename,
      splash: splashResult.filename
    };

    // Update farcaster.json if domain is configured
    if (farcasterDomain) {
      console.log('\n🔧 Updating farcaster.json configuration...');
      updateFarcasterConfig(farcasterDomain, imageFilenames);
    }

    // Display success message with results
    console.log('\n✅ All images generated and saved successfully!');
    console.log('=' .repeat(60));
    console.log(`📱 Icon (AI): public/images/${imageFilenames.icon}`);
    console.log(`🖼️  Embed (Screenshot): public/images/${imageFilenames.embed}`);
    console.log(`🚀 Splash (Screenshot): public/images/${imageFilenames.splash}`);
    console.log(`⏱️  Total generation time: ${totalDuration}s`);
    console.log(`🎨 Icon: AI-generated with Flux`);
    console.log(`📸 Screenshots: ${farcasterDomain}`);
    console.log('=' .repeat(60));

    // Show integration suggestions based on whether domain is configured
    if (farcasterDomain) {
      const cleanDomain = farcasterDomain.replace(/^https?:\/\//, '');
      console.log('\n🎯 Farcaster configuration updated automatically!');
      console.log(`   Your Mini App is now configured for: https://${cleanDomain}`);
      console.log(`   📱 Icon URL: https://${cleanDomain}/images/${imageFilenames.icon}`);
      console.log(`   🖼️  Embed URL: https://${cleanDomain}/images/${imageFilenames.embed}`);
      console.log(`   🚀 Splash URL: https://${cleanDomain}/images/${imageFilenames.splash}`);
    } else {
      console.log('\n💡 Manual integration needed:');
      console.log(`   1. Set NEXT_PUBLIC_APP_DOMAIN in your .env file`);
      console.log(`   2. Update your farcaster.json iconUrl to: https://your-domain.com/images/${imageFilenames.icon}`);
      console.log(`   3. Update your farcaster.json imageUrl to: https://your-domain.com/images/${imageFilenames.embed}`);
      console.log(`   4. Update your farcaster.json splashImageUrl to: https://your-domain.com/images/${imageFilenames.splash}`);
    }

    if (farcasterParams.appName) {
      console.log(`\n🎯 Generated for: ${farcasterParams.appName}`);
    }

  } catch (error) {
    console.error('\n❌ Error generating image:');
    
    if (error.message.includes('API key')) {
      console.error('🔑 API Key Error: Please check your TOGETHER_API_KEY');
    } else if (error.message.includes('rate limit')) {
      console.log(error.message)
      console.error('⏰ Rate Limit: Please wait before making another request');
    } else if (error.message.includes('quota')) {
      console.error('💳 Quota Exceeded: Please check your Together AI account balance');
    } else if (error.message.includes('network') || error.code === 'ENOTFOUND') {
      console.error('🌐 Network Error: Please check your internet connection');
    } else {
      console.error(`💥 ${error.message}`);
    }
    
    // Log full error in debug mode
    if (process.env.DEBUG) {
      console.error('\n🐛 Full error details:');
      console.error(error);
    }
    
    process.exit(1);
  }
}

// Run the main function
if (import.meta.url === `file://${process.argv[1]}`) {
  generateImage();
}

export {
  generateImage,
  readFarcasterConfig,
  extractFarcasterParams,
  clearExistingImages,
  downloadAndSaveImage,
  updateFarcasterConfig
};
