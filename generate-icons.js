// This script generates missing PWA icons using the existing 512x512 icon
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Ensure icons directory exists
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon sizes to generate
const iconSizes = [192, 144, 96, 72, 48];

async function generateIcons() {
  try {
    // Check if we have the source icon
    const sourceIcon = path.join(iconsDir, 'icon-512x512.png');
    if (!fs.existsSync(sourceIcon)) {
      console.error('Source icon not found. Please add icon-512x512.png to the icons folder.');
      return;
    }

    // Generate each icon size
    for (const size of iconSizes) {
      const outputFile = path.join(iconsDir, `icon-${size}x${size}.png`);
      
      // Skip if the file already exists
      if (fs.existsSync(outputFile)) {
        console.log(`Icon ${size}x${size} already exists, skipping...`);
        continue;
      }

      console.log(`Generating ${size}x${size} icon...`);
      await sharp(sourceIcon)
        .resize(size, size)
        .toFile(outputFile);
      
      console.log(`Created: ${outputFile}`);
    }
    
    console.log('\nAll icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
