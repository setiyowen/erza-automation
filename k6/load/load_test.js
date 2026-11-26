import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';

// Load test: article template streaming (SSE) under parallel VUs
// Endpoint is on the AI service host. API key comes from env (never hardcoded):
//   k6 run -e API_KEY=xxx -e STREAM_URL=yyy k6/load/load_test.js

const STREAM_URL =
  __ENV.STREAM_URL || 'https://ai.dev.erza.ai/api/article/template/stream';
const API_KEY = __ENV.API_KEY || '';

export const options = {
  scenarios: {
    parallel_stream_test: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 1,
      maxDuration: '3m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<15000'], // streaming: p95 under 15s
    checks: ['rate>0.90'],
  },
};

export default function () {
  const vuId = exec.vu.id;
  const iteration = exec.vu.iterationInScenario;
  const logPrefix = `[VU: ${vuId} | Iteration: ${iteration}]`;

  if (!API_KEY) {
    console.error(`${logPrefix} API_KEY not set — pass -e API_KEY=...`);
    return;
  }

  const payload = JSON.stringify({
    article_type: 'template',
    topic: 'halo dek',
    keyword: '',
    content: {
      target_word_count: 1000,
      advanced_custom_prompt: '',
      components: [
        { type: 'subtitle', prompt: 'subtitle baikk' },
        { type: 'image', prompt: 'gambar baik' },
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
    responseCallback: http.expectedStatuses(200),
  };

  const response = http.post(STREAM_URL, payload, params);

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
  } else {
    console.error(`${logPrefix} failed: ${response.status}`);
  }

  check(response, {
    'status is 200': (r) => r.status === 200,
    'subtitle not empty': () => subtitleContent !== '',
    'image url not empty': () => imageContent !== '',
  });

  sleep(1);
}
