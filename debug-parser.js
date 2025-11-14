const fs = require('fs');
const path = require('path');

// Read the markdown file
const markdownPath = path.join(__dirname, '../public/data/maths/instructions/001_BIDMAS_lesson.md');
const content = fs.readFileSync(markdownPath, 'utf8');

console.log('File length:', content.length);
console.log('First 300 characters:');
console.log(content.substring(0, 300));

// Look for separators
const separators = content.match(/\n---\n/g);
console.log('\nFound separators:', separators ? separators.length : 0);

// Try splitting
const contentWithoutFrontmatter = content.replace(/^---[\s\S]*?---\s*/, '');
console.log('Content without frontmatter length:', contentWithoutFrontmatter.length);

const sections = contentWithoutFrontmatter.split(/\n---\n/);
console.log('Sections after split:', sections.length);

sections.forEach((section, index) => {
  const trimmed = section.trim();
  console.log(`\nSection ${index + 1}:`);
  console.log('Length:', trimmed.length);
  console.log('First 100 chars:', trimmed.substring(0, 100));
  
  // Look for screen titles
  const lines = trimmed.split('\n');
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const line = lines[i].trim();
    if (line.startsWith('# Screen')) {
      console.log('Found screen title:', line);
      break;
    }
  }
});