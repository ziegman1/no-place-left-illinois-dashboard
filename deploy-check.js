import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

console.log('🔍 Checking deployment readiness...\n');

// Check if dist directory exists
if (!existsSync('dist')) {
  console.error('❌ dist/ directory not found. Run "npm run build" first.');
  process.exit(1);
}

// Required files for deployment
const requiredFiles = [
  'dist/index.html',
  'dist/illinois_counties_with_population.geojson',
  'dist/fixed_tracts.geojson'
];

let allFilesPresent = true;

requiredFiles.forEach(file => {
  if (existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesPresent = false;
  }
});

// Check if assets directory has files
const assetsDir = 'dist/assets';
if (existsSync(assetsDir)) {
  try {
    const assets = readdirSync(assetsDir);
    const jsFiles = assets.filter(file => file.endsWith('.js'));
    const cssFiles = assets.filter(file => file.endsWith('.css'));
    
    if (jsFiles.length > 0) {
      const jsFile = jsFiles[0];
      const jsContent = readFileSync(join(assetsDir, jsFile), 'utf8');
      console.log(`✅ ${assetsDir}/${jsFile} (${jsContent.length} bytes)`);
    } else {
      console.log(`❌ ${assetsDir} - NO JS FILES`);
      allFilesPresent = false;
    }
    
    if (cssFiles.length > 0) {
      const cssFile = cssFiles[0];
      const cssContent = readFileSync(join(assetsDir, cssFile), 'utf8');
      console.log(`✅ ${assetsDir}/${cssFile} (${cssContent.length} bytes)`);
    } else {
      console.log(`❌ ${assetsDir} - NO CSS FILES`);
      allFilesPresent = false;
    }
  } catch (err) {
    console.log(`❌ ${assetsDir} - CANNOT READ`);
    allFilesPresent = false;
  }
} else {
  console.log(`❌ ${assetsDir} - MISSING`);
  allFilesPresent = false;
}

console.log('\n📊 Summary:');
if (allFilesPresent) {
  console.log('✅ All files present - Ready for deployment!');
  console.log('\n🚀 Render Deployment Settings:');
  console.log('   Build Command: npm run build');
  console.log('   Start Command: serve -s dist -l $PORT');
  console.log('   Publish Directory: dist (for Static Site)');
} else {
  console.log('❌ Missing files - Fix before deployment');
  process.exit(1);
} 