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
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function executeCommand(command, description) {
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
    log(`❌ ${description} failed!`, colors.red);
    log(`Error: ${error.message}`, colors.red);
    return false;
  }
}

async function deploy() {
  log("🎯 Starting full deployment process...", colors.bright + colors.magenta);

  const steps = [
    {
      command: "npm run build",
      description: "Building Next.js application",
    },
    {
      command: "cd functions && npm install && npm run build",
      description: "Installing dependencies and building Firebase Functions",
    },
    {
      command: "firebase deploy --only functions",
      description: "Deploying Firebase Functions",
    },
    {
      command: "firebase deploy --only firestore,storage",
      description: "Deploying Firebase Firestore rules and Storage rules",
    },
    {
      command: "vercel --prod",
      description: "Deploying to Vercel",
    },
  ];

  let failedSteps = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    log(`\n📋 Step ${i + 1}/${steps.length}`, colors.blue);

    const success = executeCommand(step.command, step.description);

    if (!success) {
      failedSteps.push(step.description);
      log(`\n⚠️  Continuing with remaining steps...`, colors.yellow);
    }
  }

  // Summary
  log("\n" + "=".repeat(50), colors.bright);
  if (failedSteps.length === 0) {
    log(
      "🎉 All deployment steps completed successfully!",
      colors.bright + colors.green
    );
    log("Your application is now live! 🚀", colors.green);
  } else {
    log("⚠️  Deployment completed with some issues:", colors.yellow);
    failedSteps.forEach((step) => {
      log(`   - ${step}`, colors.red);
    });
    log(
      "\nPlease check the errors above and retry failed steps manually.",
      colors.yellow
    );
  }
  log("=".repeat(50), colors.bright);
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
