// Genera postman/El-Yunque.postman_collection.json a partir de la especificación OpenAPI.
const fs = require('fs');
const path = require('path');
const spec = require('../src/docs/openapi');

const samples = {
  email: 'admin@elyunque.com',
  password: 'Admin123!',
};
const example = (schema) => {
  const out = {};
  for (const [k, v] of Object.entries(schema.properties || {})) {
    out[k] = samples[k] ?? (v.enum ? v.enum[0] : v.type === 'integer' ? 1 : v.type === 'number' ? 1 : `${k}`);
  }
  return out;
};

const folders = {};
for (const [p, methods] of Object.entries(spec.paths)) {
  for (const [method, o] of Object.entries(methods)) {
    const tag = o.tags[0];
    const url = p.replace(/\{(\w+)\}/g, ':$1');
    const query = (o.parameters || []).filter((x) => x.in === 'query');
    const item = {
      name: `${method.toUpperCase()} ${p}`,
      request: {
        method: method.toUpperCase(),
        header: [{ key: 'Content-Type', value: 'application/json' }],
        url: {
          raw: `{{baseUrl}}${url}`,
          host: ['{{baseUrl}}'],
          path: url.split('/').filter(Boolean),
          query: query.map((x) => ({ key: x.name, value: '', disabled: true })),
          variable: (o.parameters || []).filter((x) => x.in === 'path').map((x) => ({ key: x.name, value: '1' })),
        },
        description: o.summary,
      },
    };
    if (o.security.length) item.request.auth = { type: 'bearer', bearer: [{ key: 'token', value: '{{token}}', type: 'string' }] };
    if (o.requestBody) {
      item.request.body = {
        mode: 'raw',
        raw: JSON.stringify(example(o.requestBody.content['application/json'].schema), null, 2),
        options: { raw: { language: 'json' } },
      };
    }
    if (p === '/auth/login') {
      item.event = [
        {
          listen: 'test',
          script: { type: 'text/javascript', exec: ["pm.collectionVariables.set('token', pm.response.json().token);"] },
        },
      ];
    }
    (folders[tag] ||= []).push(item);
  }
}

const collection = {
  info: {
    name: 'API El Yunque',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    description: 'Ejecute primero POST /auth/login: el token se guarda en la variable {{token}}.',
  },
  variable: [
    { key: 'baseUrl', value: 'http://localhost:3000' },
    { key: 'token', value: '' },
  ],
  item: Object.entries(folders).map(([name, item]) => ({ name, item })),
};

const dir = path.join(__dirname, '..', 'postman');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'El-Yunque.postman_collection.json'), JSON.stringify(collection, null, 2));
console.log('Colección Postman generada en backend/postman/');
