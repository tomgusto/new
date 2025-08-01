const Jimp = require('jimp');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// Supported output formats and their Jimp methods
const SUPPORTED_FORMATS = {
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'bmp': 'image/bmp',
  'tiff': 'image/tiff',
  'gif': 'image/gif'
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to get user input
const question = (query) => new Promise(resolve => rl.question(query, resolve));

// Simple file selection using command line
async function selectFile() {
  console.log('\nAvailable image files in current directory:');
  
  // List image files in current directory
  const files = fs.readdirSync(process.cwd())
    .filter(file => /.(png|jpg|jpeg|gif|bmp|tiff?)$/i.test(file));
  
  if (files.length === 0) {
    console.log('No image files found in the current directory.');
    return null;
  }
  
  // Show available files
  files.forEach((file, index) => {
    console.log(`${index + 1}. ${file}`);
  });
  
  // Ask user to select a file
  const selected = await question('\nEnter the number of the file to use, or press Enter to type a path: ');
  
  if (selected.trim() === '') {
    // Allow manual path input
    const manualPath = await question('Enter the full path to your logo image: ');
    return fs.pathExistsSync(manualPath) ? manualPath : null;
  }
  
  const index = parseInt(selected) - 1;
  if (isNaN(index) || index < 0 || index >= files.length) {
    console.log('❌ Invalid selection');
    return null;
  }
  
  return path.resolve(process.cwd(), files[index]);
}

// Function to get color input
async function getColorInput(defaultColor = '#007bff') {
  while (true) {
    const answer = await question(`Enter color (hex format, e.g. #007bff, default: ${defaultColor}): `);
    const input = String(answer).trim();
    
    // If user just pressed Enter, use default
    if (input === '') {
      return defaultColor;
    }
    
    // Validate hex color format
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(input)) {
      // Convert 3-digit hex to 6-digit
      if (input.length === 4) {
        return '#' + input[1] + input[1] + input[2] + input[2] + input[3] + input[3];
      }
      return input.toLowerCase();
    }
    
    console.log('❌ Invalid color format. Please use hex format (e.g. #007bff)');
  }
}

// Function to select output format
async function selectOutputFormat() {
  console.log('\nSelect output format:');
  const formats = Object.keys(SUPPORTED_FORMATS);
  
  formats.forEach((format, index) => {
    console.log(`${index + 1}. ${format.toUpperCase()}`);
  });
  
  while (true) {
    const selected = await question('\nEnter the number of the format to use (default: png): ');
    
    if (selected.trim() === '') {
      return 'png'; // Default format
    }
    
    const index = parseInt(selected) - 1;
    if (!isNaN(index) && index >= 0 && index < formats.length) {
      return formats[index];
    }
    
    console.log('❌ Invalid selection. Please try again.');
  }
}

// Ensure splashscreens directory exists
const splashDir = path.join(__dirname, 'splashscreens');
if (!fs.existsSync(splashDir)) {
  fs.mkdirSync(splashDir, { recursive: true });
}

// Configuration for different iPhone models
const devices = [
  // iPhone 12/13/14/15 Mini (Portrait: 375x812 @3x = 1125x2436)
  { 
    name: 'iphone12mini', 
    width: 1125, 
    height: 2436,
    orientation: 'portrait',
    filename: 'iphone12mini-portrait.png'
  },
  {
    name: 'iphone12mini',
    width: 2436,
    height: 1125,
    orientation: 'landscape',
    filename: 'iphone12mini-landscape.png'
  },
  
  // iPhone 12/13/14/15/16 (Portrait: 390x844 @3x = 1170x2532)
  {
    name: 'iphone12',
    width: 1170,
    height: 2532,
    orientation: 'portrait',
    filename: 'iphone12-portrait.png'
  },
  {
    name: 'iphone12',
    width: 2532,
    height: 1170,
    orientation: 'landscape',
    filename: 'iphone12-landscape.png'
  },
  
  // iPhone 12/13/14/15/16 Pro (same dimensions as regular 12/13/14/15/16)
  {
    name: 'iphone12pro',
    width: 1170,
    height: 2532,
    orientation: 'portrait',
    filename: 'iphone12pro-portrait.png'
  },
  {
    name: 'iphone12pro',
    width: 2532,
    height: 1170,
    orientation: 'landscape',
    filename: 'iphone12pro-landscape.png'
  },
  
  // iPhone 12/13/14/15/16 Pro Max (Portrait: 428x926 @3x = 1284x2778)
  {
    name: 'iphone12promax',
    width: 1284,
    height: 2778,
    orientation: 'portrait',
    filename: 'iphone12promax-portrait.png'
  },
  {
    name: 'iphone12promax',
    width: 2778,
    height: 1284,
    orientation: 'landscape',
    filename: 'iphone12promax-landscape.png'
  },
  
  // iPhone 14/15/16 Plus (same dimensions as 12/13 Pro Max)
  {
    name: 'iphone14plus',
    width: 1284,
    height: 2778,
    orientation: 'portrait',
    filename: 'iphone14plus-portrait.png'
  },
  {
    name: 'iphone14plus',
    width: 2778,
    height: 1284,
    orientation: 'landscape',
    filename: 'iphone14plus-landscape.png'
  },
  
  // iPhone 14/15/16 Pro (Portrait: 393x852 @3x = 1179x2556)
  {
    name: 'iphone14pro',
    width: 1179,
    height: 2556,
    orientation: 'portrait',
    filename: 'iphone14pro-portrait.png'
  },
  {
    name: 'iphone14pro',
    width: 2556,
    height: 1179,
    orientation: 'landscape',
    filename: 'iphone14pro-landscape.png'
  },
  
  // iPhone 14/15/16 Pro Max (Portrait: 430x932 @3x = 1290x2796)
  {
    name: 'iphone14promax',
    width: 1290,
    height: 2796,
    orientation: 'portrait',
    filename: 'iphone14promax-portrait.png'
  },
  {
    name: 'iphone14promax',
    width: 2796,
    height: 1290,
    orientation: 'landscape',
    filename: 'iphone14promax-landscape.png'
  }
];

// Generate splash screens
async function generateSplashScreens() {
  console.clear();
  console.log('🚀 Splash Screen Generator');
  console.log('--------------------------\n');
  
  // Ask for logo image (mandatory)
  console.clear();
  console.log('🚀 Splash Screen Generator');
  console.log('--------------------------\n');
  
  let logoPath;
  while (true) {
    logoPath = await selectFile();
    
    if (logoPath) {
      console.log(`\n✅ Selected: ${logoPath}`);
      break;
    }
    
    console.log('\n❌ No valid image selected.');
    const tryAgain = await question('Try again? (y/n, default: y): ');
    if (tryAgain.toLowerCase() === 'n') {
      console.log('\nSplash screen generation cancelled.');
      rl.close();
      return;
    }
    console.clear();
  }
  
  console.log(`\n✅ Selected: ${logoPath}`);
  
  // Ask for background color
  console.log('\nSelect background color:');
  const bgColor = await getColorInput('#007bff');
  console.log(`\n✅ Selected background color: ${bgColor}`);
  
  // Ask about padding
  console.log('\nWould you like to add padding around the logo?');
  const addPadding = (await question('Add padding? (y/n, default: y): ')).toLowerCase() !== 'n';
  
  let paddingColor = '#ffffff';
  if (addPadding) {
    console.log('\nSelect padding color:');
    paddingColor = await getColorInput('#ffffff');
    console.log(`✅ Selected padding color: ${paddingColor}`);
  }
  
  // Ask for padding percentage
  let paddingPercentage = 0.1; // 10% default
  if (addPadding) {
    const paddingInput = await question('\nEnter padding percentage (10 = 10% of image size, default: 10): ');
    paddingPercentage = (parseFloat(paddingInput) || 10) / 100;
  }
  
  // Ask for output format
  const outputFormat = await selectOutputFormat();
  const mimeType = SUPPORTED_FORMATS[outputFormat];
  
  // Show settings summary
  console.log('\n📋 Settings Summary:');
  console.log('-------------------');
  console.log(`Logo: ${logoPath}`);
  console.log(`Background color: ${bgColor}`);
  console.log(`Add padding: ${addPadding ? 'Yes' : 'No'}`);
  if (addPadding) {
    console.log(`Padding color: ${paddingColor}`);
    console.log(`Padding size: ${paddingPercentage * 100}%`);
  }
  console.log(`Output format: ${outputFormat.toUpperCase()}`);
  console.log('-------------------\n');
  
  // Ask for confirmation
  const confirm = await question('Generate splash screens with these settings? (y/n): ');
  if (!confirm.toLowerCase().startsWith('y')) {
    console.log('\nSplash screen generation cancelled.');
    rl.close();
    return;
  }
  
  console.log('\nGenerating splash screens...\n');
  
  // Create output directory if it doesn't exist
  const outputDir = path.join(process.cwd(), 'splash-screens');
  fs.ensureDirSync(outputDir);
  
  console.log(`\nGenerating splash screens in ${outputFormat.toUpperCase()} format...`);
  
  // Load the source logo image
  if (!await fs.pathExists(logoPath)) {
    console.error(`❌ Error: File not found: ${logoPath}`);
    rl.close();
    return;
  }
  
  let logoImage;
  try {
    logoImage = await Jimp.read(logoPath);
    console.log('✅ Loaded logo.png');
  } catch (err) {
    console.error('❌ Error loading logo.png:', err.message);
    return;
  }
  
  for (const device of devices) {
    const outputPath = path.join(outputDir, `splash-${device.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${outputFormat}`);
    
    // Skip if file already exists
    if (await fs.pathExists(outputPath)) {
      console.log(`ℹ️  Skipping ${device.filename} - already exists`);
      continue;
    }
    
    try {
      console.log(`🖼️  Generating ${device.filename} (${device.width}x${device.height})...`);
      
      // Create a new image with the device dimensions and user's background color
      const image = new Jimp(device.width, device.height, bgColor);
      
      // Calculate dimensions to fit the logo while maintaining aspect ratio
      const logoAspectRatio = logoImage.getWidth() / logoImage.getHeight();
      const canvasAspectRatio = device.width / device.height;
      
      let logoWidth, logoHeight, x, y;
      
      if (logoAspectRatio > canvasAspectRatio) {
        // Logo is wider than canvas relative to height
        logoWidth = device.width * 0.8; // 80% of canvas width
        logoHeight = logoWidth / logoAspectRatio;
      } else {
        // Logo is taller than canvas relative to width
        logoHeight = device.height * 0.8; // 80% of canvas height
        logoWidth = logoHeight * logoAspectRatio;
      }
      
      // Center the logo
      x = (device.width - logoWidth) / 2;
      y = (device.height - logoHeight) / 2;
      
      // Add background for the logo if padding is enabled
      if (addPadding) {
        const padding = Math.max(logoWidth, logoHeight) * paddingPercentage;
        const paddingBg = new Jimp(
          Math.ceil(logoWidth + padding * 2),
          Math.ceil(logoHeight + padding * 2),
          paddingColor
        );
        
        // Composite the padding background onto the image
        image.composite(
          paddingBg,
          Math.floor(x - padding),
          Math.floor(y - padding)
        );
      }
      
      // Resize logo while maintaining aspect ratio
      const logoResized = logoImage.clone().resize(logoWidth, logoHeight);
      
      // Composite the logo onto the image
      image.composite(
        logoResized,
        Math.floor(x),
        Math.floor(y),
        {
          mode: Jimp.BLEND_SOURCE_OVER,
          opacitySource: 1,
          opacityDest: 1
        }
      );
      
      // Save the image
      await image.writeAsync(outputPath);
      console.log(`✅ Created ${device.filename}`);
    } catch (error) {
      console.error(`❌ Error generating ${device.filename}:`, error.message);
    }
  }
  
  console.log('🎉 Splash screen generation complete!');
  console.log(`📁 Files saved to: ${splashDir}`);
}

// Run the generator
(async () => {
  try {
    await generateSplashScreens();
    console.log('\n✅ Splash screens generated successfully!');
    console.log(`📁 Files saved to: ${splashDir}`);
  } catch (error) {
    console.error('\n❌ Error generating splash screens:', error.message);
  } finally {
    rl.close();
    // Keep the window open for a moment
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
})();
