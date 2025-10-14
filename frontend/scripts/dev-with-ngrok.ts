#!/usr/bin/env tsx

import ngrok from '@ngrok/ngrok';
import { spawn, type ChildProcess } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

interface EnvIssue {
  line: number;
  key: string;
  originalValue: string;
  issue: string;
}

// Check for problematic env file formatting
const checkEnvFile = (filename: string): EnvIssue[] => {
  const issues: EnvIssue[] = [];
  try {
    const envPath = resolve(process.cwd(), filename);
    const envContent = readFileSync(envPath, 'utf-8');
    
    envContent.split('\n').forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        return;
      }
      
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex === -1) {
        return;
      }
      
      const key = trimmedLine.substring(0, equalIndex).trim();
      const value = trimmedLine.substring(equalIndex + 1).trim();
      
      // Check for inline comments with quoted values
      if (value.startsWith('"') && value.includes('#') && !value.endsWith('"')) {
        issues.push({
          line: index + 1,
          key,
          originalValue: value,
          issue: 'Quoted value with inline comment - the comment will be included in the value'
        });
      }
      
      // Check for inline comments without proper handling
      if (!value.startsWith('"') && !value.startsWith("'") && value.includes(' #')) {
        issues.push({
          line: index + 1,
          key,
          originalValue: value,
          issue: 'Inline comment without quotes - may cause parsing issues'
        });
      }
    });
  } catch (error) {
    // File doesn't exist, skip silently
  }
  return issues;
};

// Load environment variables from .env and .env.local
const loadEnvFile = (filename: string): void => {
  try {
    const envPath = resolve(process.cwd(), filename);
    const envContent = readFileSync(envPath, 'utf-8');
    
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        return;
      }
      
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex === -1) {
        return;
      }
      
      const key = trimmedLine.substring(0, equalIndex).trim();
      let value = trimmedLine.substring(equalIndex + 1).trim();
      
      // Remove inline comments (but preserve # inside quoted strings)
      if (value.includes('#') && !value.startsWith('"') && !value.startsWith("'")) {
        const commentIndex = value.indexOf('#');
        value = value.substring(0, commentIndex).trim();
      }
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      // Only set if not already in process.env
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch (error) {
    // File doesn't exist, skip silently
  }
};

// Check for problematic .env formatting
const envIssues = checkEnvFile('.env');
const envLocalIssues = checkEnvFile('.env.local');

if (envIssues.length > 0 || envLocalIssues.length > 0) {
  console.log('\n❌ Found issues in your .env file that will cause Next.js to fail:\n');
  
  [...envIssues, ...envLocalIssues].forEach(issue => {
    console.log(`   📄 Line ${issue.line}: ${issue.key}`);
    console.log(`   ❌ ${issue.issue}`);
    console.log(`   Current: ${issue.originalValue}`);
    console.log('');
  });
  
  console.log('💡 How to fix:');
  console.log('   1. Open your .env file');
  console.log('   2. Remove inline comments or move them to separate lines\n');
  console.log('   ❌ Bad:  NEXT_PUBLIC_APP_ENV="development" # comment');
  console.log('   ✅ Good: # comment');
  console.log('           NEXT_PUBLIC_APP_ENV=development\n');
  console.log('   or');
  console.log('   ✅ Good: NEXT_PUBLIC_APP_ENV=development\n');
  
  console.log('⚠️  Continuing anyway, but Next.js will likely fail to start...\n');
}

// Load .env first, then .env.local (which can override)
loadEnvFile('.env');
loadEnvFile('.env.local');

const NGROK_AUTHTOKEN = process.env.NGROK_AUTHTOKEN;
const NGROK_DOMAIN = process.env.NGROK_DOMAIN;

let detectedPort: number | null = null;
let nextServer: ChildProcess;

// Create a clean environment object for Next.js
// This ensures our cleaned env vars are used instead of Next.js reading .env directly
const cleanEnv = { ...process.env };

// Start Next.js dev server
console.log('🚀 Starting Next.js dev server...\n');
nextServer = spawn('yarn', ['next', 'dev'], {
  stdio: 'pipe',
  shell: true,
  env: cleanEnv
});

// Capture output to detect the actual port
nextServer.stdout?.on('data', (data: Buffer) => {
  const output = data.toString();
  process.stdout.write(output);
  
  // Detect port from Next.js output: "- Local:        http://localhost:3004"
  const portMatch = output.match(/Local:\s+http:\/\/localhost:(\d+)/);
  if (portMatch && !detectedPort) {
    detectedPort = parseInt(portMatch[1], 10);
    console.log(`\n✅ Detected Next.js running on port ${detectedPort}`);
    void startNgrok();
  }
});

nextServer.stderr?.on('data', (data: Buffer) => {
  process.stderr.write(data);
});

// Start ngrok tunnel
const startNgrok = async (): Promise<void> => {
  if (!detectedPort) {
    console.error('❌ Could not detect Next.js port');
    return;
  }

  try {
    console.log('\n🔌 Connecting ngrok tunnel...\n');
    
    if (!NGROK_AUTHTOKEN) {
      console.error('❌ NGROK_AUTHTOKEN is required!');
      console.log('\n💡 Steps to fix:');
      console.log('   1. Sign up at: https://dashboard.ngrok.com/signup');
      console.log('   2. Get your authtoken: https://dashboard.ngrok.com/get-started/your-authtoken');
      console.log('   3. Add to .env.local: NGROK_AUTHTOKEN=your_token_here\n');
      process.exit(1);
    }
    
    const ngrokConfig: Record<string, string | number> = {
      addr: detectedPort,
      authtoken: NGROK_AUTHTOKEN,
    };

    // Add domain if provided
    if (NGROK_DOMAIN) {
      ngrokConfig.domain = NGROK_DOMAIN;
    }

    const listener = await ngrok.connect(ngrokConfig);
    const publicUrl = listener.url();

    console.log('\n✅ Ngrok tunnel established!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📱 Local:     http://localhost:${detectedPort}`);
    console.log(`🌍 Public:    ${publicUrl}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 Use the public URL for testing Farcaster frames');
    console.log('💡 Press Ctrl+C to stop\n');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to start ngrok tunnel:', errorMessage);
    
    if (errorMessage.includes('authentication') || errorMessage.includes('authtoken')) {
      console.log('\n💡 Steps to fix:');
      console.log('   1. Sign up at: https://dashboard.ngrok.com/signup');
      console.log('   2. Get your authtoken: https://dashboard.ngrok.com/get-started/your-authtoken');
      console.log('   3. Add to .env.local: NGROK_AUTHTOKEN=your_token_here\n');
    }
    process.exit(1);
  }
};

// Handle cleanup
const cleanup = (): void => {
  console.log('\n\n🛑 Shutting down...');
  nextServer.kill();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

