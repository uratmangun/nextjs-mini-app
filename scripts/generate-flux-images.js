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
 * FLUX AI Image Generation Script for Farcaster Mini Apps
 *
 * This script generates text-based logo images using the FLUX.1-schnell-Free model via the Together AI API.
 * It automatically creates a logo featuring the Mini App name from farcaster.json configuration.
 * Environment variables are automatically loaded from .env file using dotenv.
 *
 * Required environment variables:
 *   TOGETHER_API_KEY - Your Together AI API key (set in .env file)
 *   NEXT_PUBLIC_APP_DOMAIN - Your domain for automatic farcaster.json updates (optional)
 *   FLUX_GENERATION_DELAY - Delay between generations in seconds (optional, default: 105)
 *
 * Rate Limits:
 *   FLUX.1-schnell-Free: 0.6 queries per minute (minimum 100s between requests)
 *   This script uses 105s delay by default to avoid rate limits
 *
 * Usage:
 *   node scripts/generate-flux-images.js
 */

// FLUX model configuration - using only the free model
const FLUX_MODEL = {
  id: 'black-forest-labs/FLUX.1-schnell-Free',
  description: 'Free FLUX model for fast generation',
  defaultSteps: 4,
  maxSteps: 4
};

// Rate limit configuration
const DEFAULT_GENERATION_DELAY = 105; // seconds - FLUX.1-schnell-Free allows 0.6 queries/min (100s minimum, 105s for safety)

/**
 * Sleep utility function to add delays between API calls
 * @param {number} seconds - Number of seconds to wait
 */
async function sleep(seconds) {
  console.log(`⏳ Waiting ${seconds}s to respect rate limits...`);
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// Farcaster Mini App dimensions based on specification
// Different dimensions for different use cases, all multiples of 16 for FLUX compatibility
const FARCASTER_DIMENSIONS = {
  // Icon image - square format for app icons (200x200 rounded to 208x208)
  icon: {
    width: 208,
    height: 208
  },
  // Embed image - 3:2 aspect ratio for social feed display (optimized for embeds)
  embed: {
    width: 768, // 3:2 ratio, multiple of 16
    height: 512
  },
  // Splash image - vertical format for splash screens (original requirement)
  splash: {
    width: 432, // 424 rounded up to nearest multiple of 16
    height: 704 // 695 rounded up to nearest multiple of 16
  }
};

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
 * Creates a prompt for embed image generation (3:2 aspect ratio)
 * @param {string} appName - The app name from farcaster.json
 * @returns {string} - The generated prompt for embed image creation
 */
function createEmbedPrompt(appName) {
  if (!appName || typeof appName !== 'string' || appName.trim().length === 0) {
    appName = 'Mini App';
  }

  const cleanAppName = appName.trim();
  const prompt = `Create an attractive social media embed image featuring the text '${cleanAppName}' in bold, eye-catching typography. 3:2 aspect ratio, modern design with subtle background elements, optimized for social feed display. Professional and engaging visual style.`;

  console.log(`🎨 Generated embed prompt for: "${cleanAppName}"`);
  return prompt;
}

/**
 * Creates a prompt for splash screen image generation (vertical format)
 * @param {string} appName - The app name from farcaster.json
 * @returns {string} - The generated prompt for splash screen creation
 */
function createSplashPrompt(appName) {
  if (!appName || typeof appName !== 'string' || appName.trim().length === 0) {
    appName = 'Mini App';
  }

  const cleanAppName = appName.trim();
  const prompt = `Create a beautiful splash screen image with the text '${cleanAppName}' in large, bold typography. Vertical format, centered layout, modern gradient or clean background, professional mobile app splash screen design. Elegant and welcoming visual style.`;

  console.log(`🎨 Generated splash prompt for: "${cleanAppName}"`);
  return prompt;
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
 * Downloads an image from URL and saves it to the public/images directory
 * @param {string} imageUrl - URL of the image to download
 * @param {string} filename - Filename to save the image as
 */
async function downloadAndSaveImage(imageUrl, filename) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const imagesDir = join(process.cwd(), 'public/images');
    const filePath = join(imagesDir, filename);

    writeFileSync(filePath, buffer);
    console.log(`💾 Image saved: ${filename}`);

    return filePath;
  } catch (error) {
    console.error(`❌ Failed to save image: ${error.message}`);
    throw error;
  }
}

/**
 * Generates a single image with specific dimensions and prompt
 * @param {object} together - Together AI client instance
 * @param {string} prompt - The prompt for image generation
 * @param {object} dimensions - Object with width and height properties
 * @param {string} imageType - Type of image (icon, embed, splash)
 * @returns {object} - Object with imageUrl and filename
 */
async function generateSingleImage(together, prompt, dimensions, imageType) {
  console.log(`\n⏳ Generating ${imageType} image (${dimensions.width}x${dimensions.height})...`);

  const startTime = Date.now();

  const response = await together.images.create({
    prompt: prompt.trim(),
    model: FLUX_MODEL.id,
    width: dimensions.width,
    height: dimensions.height,
    steps: FLUX_MODEL.defaultSteps,
  });

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);

  // Handle response
  if (!response.data || !response.data[0] || !response.data[0].url) {
    throw new Error(`Invalid response from Together AI API for ${imageType} image - no image URL received`);
  }

  const imageUrl = response.data[0].url;

  // Create filename with timestamp and type
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `flux-${imageType}-${timestamp}.png`;

  // Download and save the image
  await downloadAndSaveImage(imageUrl, filename);

  console.log(`✅ ${imageType} image generated in ${duration}s`);

  return {
    imageUrl,
    filename,
    duration
  };
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
    // Check for Together AI API key (loaded from .env file via dotenv)
    const apiKey = process.env.TOGETHER_API_KEY;
    if (!apiKey) {
      console.error('❌ Error: TOGETHER_API_KEY is not set.');
      console.log('\n💡 To fix this:');
      console.log('   1. Get your API key from: https://api.together.xyz/settings/api-keys');
      console.log('   2. Create a .env file in the project root with:');
      console.log('      TOGETHER_API_KEY=your-actual-api-key-here');
      console.log('   3. Or set it as an environment variable:');
      console.log('      export TOGETHER_API_KEY="your-api-key-here"');
      console.log('\n📝 Note: The script automatically loads environment variables from .env file');
      process.exit(1);
    }

    // Check for NEXT_PUBLIC_APP_DOMAIN environment variable (loaded from .env file via dotenv)
    const farcasterDomain = process.env.NEXT_PUBLIC_APP_DOMAIN;
    if (!farcasterDomain) {
      console.warn('⚠️  Warning: NEXT_PUBLIC_APP_DOMAIN is not set.');
      console.warn('   The farcaster.json file will not be automatically updated with the correct domain.');
      console.warn('   Add NEXT_PUBLIC_APP_DOMAIN=your-domain.com to your .env file to enable automatic configuration.');
    } else {
      console.log(`🌐 Using domain: ${farcasterDomain}`);
    }

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

    // Extract app name from farcaster config for text logo generation
    const appName = farcasterParams.appName || 'Mini App';

    // Create prompts for each image type
    const iconPrompt = createIconPrompt(appName);
    const embedPrompt = createEmbedPrompt(appName);
    const splashPrompt = createSplashPrompt(appName);

    console.log('\n🎯 Generating three images for your Mini App...');
    console.log('   📱 Icon image (200x200 → 208x208px)');
    console.log('   🖼️  Embed image (3:2 ratio → 768x512px)');
    console.log('   🚀 Splash image (vertical → 432x704px)');

    // Clear existing images and prepare directory
    clearExistingImages();

    // Initialize Together AI client
    console.log('\n🚀 Initializing Together AI client...');
    const together = new Together({ apiKey });

    // Display generation parameters
    console.log('\n📝 Generation Parameters:');
    console.log('=' .repeat(50));
    console.log(`🎨 Model: ${FLUX_MODEL.id}`);
    console.log(`🔢 Steps: ${FLUX_MODEL.defaultSteps}`);
    console.log(`📱 Icon: ${FARCASTER_DIMENSIONS.icon.width}x${FARCASTER_DIMENSIONS.icon.height}px`);
    console.log(`🖼️  Embed: ${FARCASTER_DIMENSIONS.embed.width}x${FARCASTER_DIMENSIONS.embed.height}px`);
    console.log(`🚀 Splash: ${FARCASTER_DIMENSIONS.splash.width}x${FARCASTER_DIMENSIONS.splash.height}px`);
    console.log('=' .repeat(50));

    // Get generation delay from environment (default: 12 seconds)
    const generationDelay = parseInt(process.env.FLUX_GENERATION_DELAY) || DEFAULT_GENERATION_DELAY;
    console.log(`⏱️  Using ${generationDelay}s delay between generations (FLUX rate limit: 6 img/min)`);

    // Generate all three images
    console.log('\n⏳ Generating images... This will take a few minutes due to rate limits.');
    const overallStartTime = Date.now();

    // Generate icon image
    const iconResult = await generateSingleImage(
      together,
      iconPrompt,
      FARCASTER_DIMENSIONS.icon,
      'icon'
    );

    // Wait before next generation to respect rate limits
    await sleep(generationDelay);

    // Generate embed image
    const embedResult = await generateSingleImage(
      together,
      embedPrompt,
      FARCASTER_DIMENSIONS.embed,
      'embed'
    );

    // Wait before next generation to respect rate limits
    await sleep(generationDelay);

    // Generate splash image
    const splashResult = await generateSingleImage(
      together,
      splashPrompt,
      FARCASTER_DIMENSIONS.splash,
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
    console.log(`📱 Icon image: public/images/${imageFilenames.icon}`);
    console.log(`🖼️  Embed image: public/images/${imageFilenames.embed}`);
    console.log(`🚀 Splash image: public/images/${imageFilenames.splash}`);
    console.log(`⏱️  Total generation time: ${totalDuration}s`);
    console.log(`🎨 Model used: ${FLUX_MODEL.id}`);
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
  FLUX_MODEL,
  FARCASTER_DIMENSIONS,
  createIconPrompt,
  createEmbedPrompt,
  createSplashPrompt,
  generateSingleImage,
  readFarcasterConfig,
  extractFarcasterParams,
  clearExistingImages,
  downloadAndSaveImage,
  updateFarcasterConfig
};
