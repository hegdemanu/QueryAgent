import { seedData } from './seed';
import { generateAndExecuteQueries } from './query';
import { cleanup } from './cleanup';

async function main() {
  console.log('Starting AI agent...');

  try {
    // 1. Seed data
    await seedData();

    // 2. Generate and execute queries
    await generateAndExecuteQueries();

    // 3. Clean up
    await cleanup();

    console.log('AI agent finished successfully.');
  } catch (error) {
    console.error('AI agent encountered an error:', error);
    process.exit(1);
  }
}

main();
