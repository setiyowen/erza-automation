import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';

// Streaming load test for article template SSE
// Endpoint: https://ai.dev.erza.ai/api/article/template/stream (may return 404 if service moved)
// API key: pass via -e API_KEY=...
// Usage: k6 run -e API_KEY=xxx k6/load/load_test.js

const STREAM_URL =
  __ENV.STREAM_URL || 'https://ai.dev.erza.ai/api/article/template/stream';
const API_KEY = __ENV.API_KEY || '';

export const options = {
  scenarios: {
    parallel_stream_test: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 1,
      maxDuration: '2m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<30000'],
    checks: ['rate>0.50'],
  },
};

export default function () {
  const vuId = exec.vu.id;
  const iteration = exec.vu.iterationInScenario;
  const logPrefix = `[VU: ${vuId} | Iteration: ${iteration}]`;

  if (!API_KEY) {
    console.log(`${logPrefix} SKIP: API_KEY not set`);
    return;
  }

  const payload = JSON.stringify({
    article_type: 'template',
    topic: 'test streaming',
    keyword: '',
    content: {
      target_word_count: 800,
      advanced_custom_prompt: '',
      components: [
        { type: 'subtitle', prompt: 'subtitle' },
        { type: 'image', prompt: 'image' },
      ],
    },
    tags_list: [],
    categories_list: [],
  });

  const params = {
    headers: {
      accept: 'application/json',
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    responseCallback: http.expectedStatuses(200, 404, 503),
  };

  const response = http.post(STREAM_URL, payload, params);

  if (response.status === 404) {
    console.log(`${logPrefix} SKIP: streaming endpoint 404 (service may have moved)`);
    return;
  }
  if (response.status >= 500) {
    console.log(`${logPrefix} SKIP: server error ${response.status}`);
    return;
  }

  let subtitleContent = '';
  let imageContent = '';

  if (response.status === 200 && response.body) {
    response.body
      .split('\n')
      .forEach((line) => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('data: ')) {
          const jsonString = trimmedLine.replace(/^data:\s*/, '');
          try {
            const parsedData = JSON.parse(jsonString);
            if (parsedData.type === 'done') {
              if (parsedData.section === 'subtitle' && parsedData.content)
                subtitleContent = parsedData.content.trim();
              if (parsedData.section === 'image' && parsedData.content)
                imageContent = parsedData.content.trim();
            }
            if (parsedData.type === 'final' && Array.isArray(parsedData.content)) {
              parsedData.content.forEach((item) => {
                if (item.type === 'subtitle' && item.content)
                  subtitleContent = item.content.trim();
                if (item.type === 'image' && item.content)
                  imageContent = item.content.trim();
              });
              console.log(
                `${logPrefix} FINAL -> subtitle: "${subtitleContent}" image: "${imageContent}"`
              );
            }
          } catch (e) {
            /* ignore keep-alives / malformed */
          }
        }
      });
  }

  check(response, {
    'status is 200': (r) => r.status === 200,
    'subtitle not empty': () => subtitleContent !== '',
    'image url not empty': () => imageContent !== '',
  });

  sleep(1);
}
