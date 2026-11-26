require('dotenv').config();
const { execSync } = require('child_process');

// Runner: k6 run test/index.js (default) or a specific file
//   npm run test
//   npm run test:test/index.js
//   k6 run k6/load/load_test.js   (load/stress, uses X-API-Key)

let testFile = 'k6/test/index.js';

if (process.argv.length > 2) {
  testFile = process.argv[2];
}

const args = ['run', testFile];

// Forward --env / -e overrides (e.g. k6 run -e SESSION=xyz)
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('-')) args.push(arg);
}

const cmd = ['k6', ...args].join(' ');
console.log(`🏃 ${cmd}`);

execSync(cmd, { stdio: 'inherit' });
