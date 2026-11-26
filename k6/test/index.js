import * as core from './core/index.js';

export { setup } from './setup.js';

const scenarios = [...Object.values(core)];

const getScenarios = () => {
  const objScenarios = {};
  scenarios.forEach((scenario) => {
    objScenarios[scenario.name] = {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      exec: scenario.name
    };
  });
  return objScenarios;
};

export const options = {
  thresholds: {
    checks: ['rate>0.95'],
  },
  scenarios: getScenarios(),
};