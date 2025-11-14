#!/usr/bin/env node

/**
 * Sync script to copy lessons.json from data/maths to public/data/maths
 * Run this whenever you update contentReady values for instant reflection in the app
 */

const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, 'data/maths/lessons.json');
const destination = path.join(__dirname, 'public/data/maths/lessons.json');

try {
  console.log('🔄 Syncing lessons.json...');
  
  // Read the source file
  const data = fs.readFileSync(source, 'utf8');
  
  // Write to destination
  fs.writeFileSync(destination, data);
  
  console.log('✅ Successfully synced lessons.json to public directory');
  console.log('📁 Source: data/maths/lessons.json');
  console.log('📁 Destination: public/data/maths/lessons.json');
  
  // Count contentReady false values for confirmation
  const jsonData = JSON.parse(data);
  const falseCount = jsonData.lessons.filter(lesson => !lesson.contentReady).length;
  const trueCount = jsonData.lessons.filter(lesson => lesson.contentReady).length;
  
  console.log(`📊 Content Status: ${trueCount} ready, ${falseCount} pending`);
  
} catch (error) {
  console.error('❌ Error syncing lessons.json:', error.message);
  process.exit(1);
}