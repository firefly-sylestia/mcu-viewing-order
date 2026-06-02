import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Icon sizes for different densities
const iconSizes = [
  { name: 'mdpi', size: 48, dir: 'mipmap-mdpi' },
  { name: 'hdpi', size: 72, dir: 'mipmap-hdpi' },
  { name: 'xhdpi', size: 96, dir: 'mipmap-xhdpi' },
  { name: 'xxhdpi', size: 144, dir: 'mipmap-xxhdpi' },
  { name: 'xxxhdpi', size: 192, dir: 'mipmap-xxxhdpi' },
];

const sourceIcon = path.join(__dirname, 'mcu-icon-final.jpg');
const resDir = path.join(__dirname, 'android/app/src/main/res');

// Also update drawable directory with high-res version
const appIconPath = path.join(resDir, 'drawable', 'app_icon.png');

async function generateIcons() {
  try {
    console.log('🎬 Generating MCU app icons...');
    
    // Read source image
    if (!fs.existsSync(sourceIcon)) {
      throw new Error(`Source icon not found: ${sourceIcon}`);
    }

    // Generate icons for each density
    for (const size of iconSizes) {
      const outputDir = path.join(resDir, size.dir);
      const outputPath = path.join(outputDir, 'ic_launcher.png');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      await sharp(sourceIcon)
        .resize(size.size, size.size, {
          fit: 'cover',
          position: 'center'
        })
        .png()
        .toFile(outputPath);

      console.log(`✅ Created ${size.name} icon (${size.size}x${size.size}) at ${outputPath}`);
    }

    // Also create high-res version for drawable
    const drawableDir = path.join(resDir, 'drawable');
    if (!fs.existsSync(drawableDir)) {
      fs.mkdirSync(drawableDir, { recursive: true });
    }

    await sharp(sourceIcon)
      .resize(192, 192, {
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toFile(appIconPath);

    console.log(`✅ Created drawable app_icon.png (192x192) at ${appIconPath}`);
    console.log('\n🎉 All icons generated successfully!');
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();
