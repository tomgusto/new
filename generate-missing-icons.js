const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Ensure icons directory exists
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon sizes to generate
const iconSizes = [192, 512, 144, 96, 72, 48];
const sourceIcon = path.join(iconsDir, 'icon-512x512.png');

// Check if source icon exists
if (!fs.existsSync(sourceIcon)) {
  console.error('Error: Source icon not found at', sourceIcon);
  console.error('Please add a 512x512 PNG icon to the icons/ directory');
  process.exit(1);
}

async function generateIcons() {
  console.log('Generating missing icons...');
  
  for (const size of iconSizes) {
    const outputFile = path.join(iconsDir, `icon-${size}x${size}.png`);
    
    // Skip if the file already exists
    if (fs.existsSync(outputFile)) {
      console.log(`✓ Icon ${size}x${size} already exists`);
      continue;
    }
    
    try {
      console.log(`Generating ${size}x${size} icon...`);
      await sharp(sourceIcon)
        .resize(size, size)
        .toFile(outputFile);
      
      console.log(`✓ Created: ${outputFile}`);
    } catch (error) {
      console.error(`Error generating ${size}x${size} icon:`, error.message);
    }
  }
  
  console.log('\nIcon generation complete!');
  
  // Verify all required icons exist
  console.log('\nVerifying required icons:');
  const requiredIcons = [
    'icon-192x192.png',
    'icon-512x512.png',
    'icon-144x144.png',
    'icon-96x96.png',
    'icon-72x72.png',
    'icon-48x48.png'
  ];
  
  let allIconsExist = true;
  for (const icon of requiredIcons) {
    const iconPath = path.join(iconsDir, icon);
    const exists = fs.existsSync(iconPath);
    console.log(`${exists ? '✓' : '✗'} ${icon} ${exists ? 'found' : 'MISSING'}`);
    if (!exists) allIconsExist = false;
  }
  
  if (!allIconsExist) {
    console.error('\n⚠️  Some required icons are missing. Please check the icons directory.');
  } else {
    console.log('\n✅ All required icons are present!');
  }
}

generateIcons().catch(console.error);
