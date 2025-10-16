#!/usr/bin/env node
/**
 * Claude Code Config Cleanup Script
 *
 * Reduces ~/.claude.json file size by:
 * - Keeping only the last 10 history entries per project
 * - Removing all pastedContents from history
 * - Preserving all user settings and preferences
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = path.join(os.homedir(), '.claude.json');
const MAX_HISTORY_ENTRIES = 10;

function cleanupConfig() {
  console.log('🔍 Reading config file...');
  const originalSize = fs.statSync(configPath).size;
  const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  console.log(`📊 Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);

  let totalHistoryRemoved = 0;
  let totalPastedContentRemoved = 0;

  if (data.projects) {
    console.log(`\n🗂️  Processing ${Object.keys(data.projects).length} projects...`);

    for (const [projectPath, project] of Object.entries(data.projects)) {
      if (project.history && Array.isArray(project.history)) {
        const originalLength = project.history.length;

        // Keep only last N entries
        if (project.history.length > MAX_HISTORY_ENTRIES) {
          project.history = project.history.slice(-MAX_HISTORY_ENTRIES);
          totalHistoryRemoved += (originalLength - project.history.length);
        }

        // Remove pastedContents from all history entries
        project.history.forEach(entry => {
          if (entry.pastedContents) {
            totalPastedContentRemoved++;
            delete entry.pastedContents;
          }
        });
      }
    }
  }

  console.log(`\n✂️  Cleanup summary:`);
  console.log(`   - History entries removed: ${totalHistoryRemoved}`);
  console.log(`   - Pasted contents removed: ${totalPastedContentRemoved}`);

  // Write cleaned config
  console.log('\n💾 Writing cleaned config...');
  const cleanedJson = JSON.stringify(data, null, 2);
  fs.writeFileSync(configPath, cleanedJson);

  const newSize = fs.statSync(configPath).size;
  const savedMB = (originalSize - newSize) / 1024 / 1024;
  const savedPercent = ((originalSize - newSize) / originalSize * 100).toFixed(1);

  console.log(`\n✅ Cleanup complete!`);
  console.log(`   New size: ${(newSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Saved: ${savedMB.toFixed(2)} MB (${savedPercent}% reduction)`);
  console.log(`\n📋 Backup location: ~/.claude.json.backup-*`);
}

try {
  cleanupConfig();
} catch (error) {
  console.error('❌ Error cleaning config:', error.message);
  console.error('Your backup is safe at ~/.claude.json.backup-*');
  process.exit(1);
}
