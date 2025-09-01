#!/usr/bin/env node

import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import mime from "mime";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
} from "fs";

// Get script directory for relative imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Gemini Icon Generation Script for Farcaster Mini Apps
 *
 * This script generates AI-powered icons using Google's Gemini AI.
 * Environment variables are automatically loaded from .env file using dotenv.
 *
 * Usage:
 *   node scripts/generate-gemini-icon.js
 *   node scripts/generate-gemini-icon.js [prompt]
 */

// Gemini model configuration
const GEMINI_MODEL = "gemini-2.5-flash-image-preview";

// Retry configuration
const MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 60; // Default 60 seconds if no retryDelay specified

/**
 * Generate timestamp-based filename
 * @param {string} type - The image type (icon)
 * @param {string} prefix - The filename prefix (gemini)
 * @returns {string} - The generated filename
 */
function generateFilename(type, prefix = "gemini") {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${prefix}-${type}-${timestamp}`;
}

/**
 * Save binary file to filesystem
 * @param {string} fileName - The filename to save
 * @param {Buffer} content - The file content buffer
 * @returns {Promise<void>}
 */
function saveBinaryFile(fileName, content) {
  return new Promise((resolve, reject) => {
    writeFileSync(fileName, content, (err) => {
      if (err) {
        console.error(`❌ Error writing file ${fileName}:`, err);
        reject(err);
        return;
      }
      console.log(`💾 File ${fileName} saved to file system.`);
      resolve();
    });
  });
}

/**
 * Clears all existing icon images from the public/images directory
 */
function clearExistingIcons() {
  const imagesDir = join(process.cwd(), "public/images");

  if (!existsSync(imagesDir)) {
    return;
  }

  const files = readdirSync(imagesDir);
  const iconFiles = files.filter(
    (file) => file.startsWith("gemini-icon-") && file.endsWith(".png"),
  );

  console.log("🗑️  Clearing existing icon images...");
  iconFiles.forEach((file) => {
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
 * Reads and parses the Farcaster configuration file to extract app name
 * @returns {string} - The app name from farcaster.json
 */
function getAppNameFromConfig() {
  try {
    const configPath = join(process.cwd(), "public/.well-known/farcaster.json");
    const configContent = readFileSync(configPath, "utf8");
    const config = JSON.parse(configContent);
    return config.miniapp?.name || "Mini App";
  } catch (error) {
    console.warn(
      "⚠️  Warning: Could not read app name from farcaster.json, using default",
    );
    return "Mini App";
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
- Colors should NOT be primarily purple - prefer blue, teal, green, or neutral colors
- If text is included, make it bold and highly readable
Generate a PNG image that would work perfectly as a Farcaster mini app icon.`;
}

/**
 * Updates the farcaster.json file with the generated icon URL
 * @param {string} iconFilename - The icon filename
 */
function updateFarcasterConfigWithIcon(iconFilename) {
  try {
    const configPath = join(process.cwd(), "public/.well-known/farcaster.json");

    if (!existsSync(configPath)) {
      console.warn(
        "⚠️  Warning: farcaster.json file not found, skipping update",
      );
      return;
    }

    const configContent = readFileSync(configPath, "utf8");
    const config = JSON.parse(configContent);

    // Get domain from existing config or environment
    const domain = config.miniapp?.homeUrl
      ? new URL(config.miniapp.homeUrl).origin
      : `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}`;

    // Update icon URL
    if (config.miniapp && iconFilename) {
      config.miniapp.iconUrl = `${domain}/images/${iconFilename}`;
    }

    // Write updated config
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log("✅ Updated farcaster.json with new icon URL");
  } catch (error) {
    console.error("❌ Error updating farcaster.json:", error.message);
  }
}

/**
 * Parse retry delay from Gemini API error response
 * @param {Error} error - The error object
 * @returns {number} - Delay in seconds
 */
function parseRetryDelay(error) {
  try {
    const errorMessage = error.message || "";
    console.log(`🔍 Parsing error message for retryDelay...`);

    // Handle nested JSON structure in Gemini API errors
    // The error structure is: error.message contains a JSON string with error.details[]

    // First, try to parse the entire error message as JSON
    let outerError = null;
    try {
      outerError = JSON.parse(errorMessage);
    } catch (parseError) {
      // If that fails, try to extract JSON from the message
      const jsonMatch = errorMessage.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        outerError = JSON.parse(jsonMatch[0]);
      }
    }

    if (outerError?.error?.message) {
      // The actual error details are in a nested JSON string
      let innerErrorStr = outerError.error.message;

      // Clean up the JSON string (remove escaped newlines and quotes)
      innerErrorStr = innerErrorStr.replace(/\\n/g, "").replace(/\\/g, "");

      try {
        const innerError = JSON.parse(innerErrorStr);

        // Look for RetryInfo in the details array
        if (innerError.error?.details) {
          for (const detail of innerError.error.details) {
            if (
              detail["@type"] === "type.googleapis.com/google.rpc.RetryInfo" &&
              detail.retryDelay
            ) {
              const delayStr = detail.retryDelay;
              const seconds = parseInt(delayStr.replace("s", ""), 10);
              console.log(`📋 Found RetryInfo with retryDelay: ${seconds}s`);
              return seconds;
            }
          }
        }
      } catch (innerParseError) {
        console.warn(
          `⚠️  Could not parse inner JSON: ${innerParseError.message}`,
        );
      }
    }

    // Fallback: try regex pattern matching for retryDelay
    const retryDelayMatch = errorMessage.match(
      /retryDelay[\"']\s*:\s*[\"'](\d+)s[\"']/,
    );
    if (retryDelayMatch) {
      const delaySeconds = parseInt(retryDelayMatch[1], 10);
      console.log(`📋 Found retryDelay via regex: ${delaySeconds}s`);
      return delaySeconds;
    }
  } catch (parseError) {
    console.warn(`⚠️  Error parsing retryDelay: ${parseError.message}`);
  }

  console.log(`📋 Using default retry delay: ${DEFAULT_RETRY_DELAY}s`);
  return DEFAULT_RETRY_DELAY;
}

/**
 * Parse and log quota violation details from Gemini API error
 * @param {Error} error - The error object
 */
function logQuotaViolations(error) {
  try {
    const errorMessage = error.message || "";
    let outerError = null;

    try {
      outerError = JSON.parse(errorMessage);
    } catch (parseError) {
      const jsonMatch = errorMessage.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        outerError = JSON.parse(jsonMatch[0]);
      }
    }

    if (outerError?.error?.message) {
      let innerErrorStr = outerError.error.message;
      innerErrorStr = innerErrorStr.replace(/\\n/g, "").replace(/\\/g, "");

      try {
        const innerError = JSON.parse(innerErrorStr);

        if (innerError.error?.details) {
          for (const detail of innerError.error.details) {
            if (
              detail["@type"] ===
                "type.googleapis.com/google.rpc.QuotaFailure" &&
              detail.violations
            ) {
              console.log("📊 Quota violations detected:");
              detail.violations.forEach((violation, index) => {
                console.log(`   ${index + 1}. ${violation.quotaId}`);
                if (violation.quotaMetric) {
                  console.log(`      Metric: ${violation.quotaMetric}`);
                }
                if (violation.quotaDimensions?.model) {
                  console.log(
                    `      Model: ${violation.quotaDimensions.model}`,
                  );
                }
              });
            }
          }
        }
      } catch (innerParseError) {
        // Ignore parsing errors for quota details
      }
    }
  } catch (parseError) {
    // Ignore parsing errors for quota details
  }
}

/**
 * Sleep for specified number of seconds
 * @param {number} seconds - Number of seconds to sleep
 * @returns {Promise<void>}
 */
function sleep(seconds) {
  return new Promise((resolve) => {
    console.log(`⏱️  Waiting ${seconds}s before retry...`);

    // Show countdown for longer waits
    if (seconds > 10) {
      let remaining = seconds;
      const interval = setInterval(() => {
        remaining -= 10;
        if (remaining > 0) {
          console.log(`⏱️  ${remaining}s remaining...`);
        } else {
          clearInterval(interval);
        }
      }, 10000);
    }

    setTimeout(() => resolve(), seconds * 1000);
  });
}

/**
 * Generate icon using Google Gemini AI with retry logic
 * @param {string} prompt - The image generation prompt
 * @param {number} retryCount - Current retry attempt (default: 0)
 * @returns {Promise<Object>} - The generation result with filename
 */
async function generateIcon(prompt, retryCount = 0) {
  const startTime = Date.now();
  const isRetry = retryCount > 0;

  if (isRetry) {
    console.log(
      `\n🔄 Retry attempt ${retryCount}/${MAX_RETRIES} - Generating icon image with Gemini AI...`,
    );
  } else {
    console.log(`\n🎨 Generating icon image with Gemini AI...`);
  }
  console.log(`📝 Prompt: ${prompt}`);

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const config = {
      responseModalities: ["IMAGE", "TEXT"],
    };

    const contents = [
      {
        role: "user",
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ];

    const response = await ai.models.generateContentStream({
      model: GEMINI_MODEL,
      config,
      contents,
    });

    let fileIndex = 0;
    let savedFiles = [];

    // Ensure images directory exists
    const imagesDir = join(process.cwd(), "public/images");
    if (!existsSync(imagesDir)) {
      mkdirSync(imagesDir, { recursive: true });
    }

    for await (const chunk of response) {
      if (
        !chunk.candidates ||
        !chunk.candidates[0].content ||
        !chunk.candidates[0].content.parts
      ) {
        continue;
      }

      if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
        const fileName = generateFilename("icon", "gemini") + `_${fileIndex++}`;
        const inlineData = chunk.candidates[0].content.parts[0].inlineData;
        const fileExtension =
          mime.getExtension(inlineData.mimeType || "image/png") || "png";
        const buffer = Buffer.from(inlineData.data || "", "base64");

        const fullFileName = `${fileName}.${fileExtension}`;
        const filePath = join(imagesDir, fullFileName);

        await saveBinaryFile(filePath, buffer);
        savedFiles.push({ filename: fullFileName, filePath });
      } else if (chunk.text) {
        console.log("📄 AI Response:", chunk.text);
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    if (savedFiles.length > 0) {
      console.log(
        `✅ Generated ${savedFiles.length} icon image(s) in ${duration}s`,
      );
      return savedFiles[0]; // Return the first generated image
    } else {
      throw new Error("No images were generated");
    }
  } catch (error) {
    // Check if it's a 429 rate limit error

    const is429Error =
      error.message.includes("429") ||
      error.message.includes("Too Many Requests") ||
      error.message.includes("rate limit");

    if (is429Error && retryCount < MAX_RETRIES) {
      console.warn(
        `⚠️  Rate limit hit (429) - attempt ${retryCount + 1}/${MAX_RETRIES}`,
      );

      // Log quota violation details
      logQuotaViolations(error);

      // Parse retry delay from error message
      const retryDelay = parseRetryDelay(error);

      // Wait for the specified delay
      await sleep(retryDelay);

      // Retry the request
      return generateIcon(prompt, retryCount + 1);
    }

    // If not a retryable error or max retries exceeded
    if (is429Error && retryCount >= MAX_RETRIES) {
      console.error(
        `❌ Max retries (${MAX_RETRIES}) exceeded for rate limiting`,
      );
    }

    console.error(`❌ Failed to generate icon image:`, error.message);
    throw error;
  }
}

/**
 * Main function to generate Gemini icon
 */
async function main() {
  try {
    // Validate API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("❌ Error: GEMINI_API_KEY is not set.");
      console.error("   Please add your Gemini API key to your .env file.");
      console.error(
        "   Get your API key from: https://makersuite.google.com/app/apikey",
      );
      process.exit(1);
    }

    // Get app name and generate prompt
    const appName = getAppNameFromConfig();
    const customPrompt = process.argv[2]; // Allow custom prompt as argument
    const prompt = customPrompt || generateIconPrompt(appName);

    console.log("🎨 Gemini Icon Generator for Farcaster Mini Apps");
    console.log(`📱 App: ${appName}`);
    console.log(`🤖 Model: ${GEMINI_MODEL}`);

    // Clear existing icons
    clearExistingIcons();

    console.log("\n🚀 Initializing Google Gemini AI...");

    // Generate icon
    const iconResult = await generateIcon(prompt);

    // Update farcaster.json with new icon
    updateFarcasterConfigWithIcon(iconResult.filename);

    console.log("\n🎉 Icon generation complete!");
    console.log(`   📁 Saved: public/images/${iconResult.filename}`);
    console.log("   ✅ Updated: public/.well-known/farcaster.json");
  } catch (error) {
    console.error("\n❌ Error generating icon:");
    console.error("💥", error.message);

    if (error.message.includes("429") || error.message.includes("rate limit")) {
      console.error(
        "⏰ Rate Limit: Maximum retries exceeded - please try again later",
      );
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
  updateFarcasterConfigWithIcon,
};
