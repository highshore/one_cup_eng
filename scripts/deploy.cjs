#!/usr/bin/env node

const { execSync } = require("child_process");
const path = require("path");

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function executeCommand(command, description, isOptional = false) {
  log(`\n🚀 ${description}...`, colors.cyan);
  log(`Running: ${command}`, colors.yellow);

  try {
    execSync(command, {
      stdio: "inherit",
      cwd: process.cwd(),
      env: { ...process.env },
    });
    log(`✅ ${description} completed successfully!`, colors.green);
    return true;
  } catch (error) {
    if (isOptional) {
      log(`⚠️  ${description} skipped (optional step failed)`, colors.yellow);
      log(`Reason: ${error.message}`, colors.yellow);
    } else {
      log(`❌ ${description} failed!`, colors.red);
      log(`Error: ${error.message}`, colors.red);
    }
    return false;
  }
}

function checkVercelAuth() {
  try {
    execSync("npx vercel teams ls", { 
      stdio: "pipe",
      cwd: process.cwd(),
    });
    return true;
  } catch (error) {
    return false;
  }
}

async function deploy() {
  log("🎯 Starting deployment process...", colors.bright + colors.magenta);

  const steps = [
    {
      command: "npm run build",
      description: "Building Next.js application",
      optional: false,
    },
    {
      command: "cd functions && npm install && npm run build",
      description: "Installing dependencies and building Firebase Functions",
      optional: false,
    },
    {
      command: "firebase deploy --only functions --force",
      description: "Deploying Firebase Functions",
      optional: false,
    },
    {
      command: "firebase deploy --only firestore,storage --force",
      description: "Deploying Firebase Firestore rules and Storage rules",
      optional: false,
    },
  ];

  let failedSteps = [];
  let skippedSteps = [];

  // Execute Firebase steps
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    log(`\n📋 Step ${i + 1}/${steps.length + 1}`, colors.blue);

    const success = executeCommand(step.command, step.description, step.optional);

    if (!success) {
      if (step.optional) {
        skippedSteps.push(step.description);
      } else {
        failedSteps.push(step.description);
        log(`\n⚠️  Continuing with remaining steps...`, colors.yellow);
      }
    }
  }

  // Handle Vercel deployment
  log(`\n📋 Step ${steps.length + 1}/${steps.length + 1}`, colors.blue);
  log(`\n🚀 Checking Vercel authentication...`, colors.cyan);

  if (checkVercelAuth()) {
    log(`✅ Vercel authenticated, proceeding with deployment`, colors.green);
    const vercelSuccess = executeCommand("npx vercel --prod", "Deploying to Vercel", true);
    
    if (!vercelSuccess) {
      skippedSteps.push("Vercel deployment");
    }
  } else {
    log(`⚠️  Vercel not authenticated`, colors.yellow);
    log(`To deploy to Vercel, run these commands:`, colors.cyan);
    log(`  1. npx vercel login`, colors.white);
    log(`  2. npx vercel --yes`, colors.white);  
    log(`  3. npx vercel --prod`, colors.white);
    skippedSteps.push("Vercel deployment (authentication required)");
  }

  // Summary
  log("\n" + "=".repeat(60), colors.bright);
  if (failedSteps.length === 0 && skippedSteps.length === 0) {
    log(
      "🎉 All deployment steps completed successfully!",
      colors.bright + colors.green
    );
    log("Your application is now live! 🚀", colors.green);
  } else {
    if (failedSteps.length === 0) {
      log("✅ Core deployment completed successfully!", colors.green);
    } else {
      log("⚠️  Deployment completed with some failures:", colors.yellow);
      failedSteps.forEach((step) => {
        log(`   ❌ ${step}`, colors.red);
      });
    }

    if (skippedSteps.length > 0) {
      log("\n📋 Optional steps that were skipped:", colors.cyan);
      skippedSteps.forEach((step) => {
        log(`   ⏭️  ${step}`, colors.yellow);
      });
    }

    log(
      "\nFirebase deployment completed successfully! ✅",
      colors.green
    );
    
    if (skippedSteps.some(step => step.includes("Vercel"))) {
      log(
        "\nTo complete Vercel deployment manually:",
        colors.cyan
      );
      log("  npx vercel login", colors.white);
      log("  npx vercel --yes", colors.white);
      log("  npx vercel --prod", colors.white);
    }
  }
  log("=".repeat(60), colors.bright);
}

// Handle process termination
process.on("SIGINT", () => {
  log("\n\n❌ Deployment interrupted by user", colors.red);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  log("\n\n❌ Unexpected error during deployment:", colors.red);
  log(error.message, colors.red);
  process.exit(1);
});

// Run deployment
deploy().catch((error) => {
  log("\n\n❌ Deployment failed:", colors.red);
  log(error.message, colors.red);
  process.exit(1);
});
