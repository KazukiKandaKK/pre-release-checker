import { parse } from 'yaml';
import type { ApiEndpointInput } from 'pre-release-checker-shared';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

type Parameter = {
  name?: string;
  in?: string;
  type?: string;
  schema?: Schema;
  default?: unknown;
  example?: unknown;
};

interface Schema {
  type?: string;
  default?: unknown;
  enum?: unknown[];
}

type Operation = {
  operationId?: string;
  summary?: string;
  responses?: Record<string, unknown>;
  parameters?: Parameter[];
  produces?: string[];
};

type PathItem = {
  parameters?: Parameter[];
} & Record<string, Operation | unknown>;

function substitutePathParams(path: string, parameters: Parameter[] = []): string {
  return path.replace(/\{([^}]+)\}/g, (_, name) => {
    const param = parameters.find((p) => p.name === name && p.in === 'path');
    const value = paramValue(param);
    return String(value ?? '123');
  });
}

function getSchema(param: Parameter): Schema {
  return param.schema ?? { type: param.type, default: param.default };
}

function paramValue(param?: Parameter): unknown {
  if (!param) return '123';
  if (param.example !== undefined) return param.example;
  if (param.default !== undefined) return param.default;
  const schema = getSchema(param);
  if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum[0];
  }
  if (schema.default !== undefined) return schema.default;
  const type = (schema.type ?? param.type ?? 'string').toLowerCase();
  if (type === 'boolean') return true;
  if (type === 'integer' || type === 'number') return 123;
  return 'placeholder';
}

function resolveBaseUrl(spec: unknown, override?: string): string {
  if (override) {
    return override.replace(/\/+$/, '');
  }

  const s = spec as Record<string, unknown>;

  // OpenAPI 3.x
  if (typeof s.openapi === 'string' && s.openapi.startsWith('3.')) {
    const servers = (s.servers ?? []) as Array<{ url?: string; variables?: Record<string, { default?: string }> }>;
    const server = servers[0];
    if (!server || !server.url) {
      throw new Error('OpenAPI spec has no servers. Provide baseUrl explicitly.');
    }
    let url = server.url;
    if (server.variables) {
      url = url.replace(/\{(\w+)\}/g, (_, key) => server.variables?.[key]?.default ?? `{${key}}`);
    }
    if (/^https?:\/\//.test(url)) {
      return url.replace(/\/+$/, '');
    }
    if (url.startsWith('//')) {
      return `https:${url}`.replace(/\/+$/, '');
    }
    if (url.startsWith('/')) {
      throw new Error(`OpenAPI server URL is relative (${url}). Provide baseUrl explicitly.`);
    }
    // e.g. "api/v1" without host
    throw new Error(`OpenAPI server URL could not be resolved: ${url}. Provide baseUrl explicitly.`);
  }

  // Swagger 2.0
  if (typeof s.swagger === 'string' && s.swagger.startsWith('2.')) {
    const schemes = (s.schemes as string[] | undefined) ?? ['https'];
    const host = s.host as string | undefined;
    const basePath = (s.basePath as string | undefined) ?? '';
    if (!host) {
      throw new Error('Swagger spec has no host. Provide baseUrl explicitly.');
    }
    const scheme = schemes[0] || 'https';
    const base = `${scheme}://${host}${basePath}`;
    return base.replace(/\/+$/, '');
  }

  throw new Error('Unrecognized spec format. Provide OpenAPI 3.x or Swagger 2.0.');
}

function resolveUrl(baseUrl: string, pathTemplate: string, parameters: Parameter[] = []): string {
  const substituted = substitutePathParams(pathTemplate, parameters);
  const base = new URL(baseUrl);
  base.pathname = (base.pathname.replace(/\/+$/, '') || '') + substituted;
  return base.href;
}

function deriveExpectedStatus(operation: Operation): number | undefined {
  const codes = Object.keys(operation.responses ?? {})
    .filter((k) => /^\d{3}$/.test(k))
    .map(Number)
    .filter((n) => n >= 200 && n < 300)
    .sort((a, b) => a - b);
  return codes[0];
}

function deriveExpectedContentType(operation: Operation, spec: Record<string, unknown>): string | undefined {
  // Swagger 2.0 produces
  if (operation.produces && operation.produces.length > 0) {
    return operation.produces[0];
  }
  const globalProduces = (spec.produces as string[] | undefined) ?? [];
  if (globalProduces.length > 0) {
    return globalProduces[0];
  }

  // OpenAPI 3.0 response content
  const responses = (operation.responses ?? {}) as Record<string, unknown>;
  for (const code of Object.keys(responses)) {
    if (!/^\d{3}$/.test(code) && code !== 'default') continue;
    const response = responses[code] as { content?: Record<string, unknown> } | undefined;
    if (response?.content && typeof response.content === 'object') {
      const types = Object.keys(response.content);
      if (types.length > 0) return types[0];
    }
  }
  return undefined;
}

export function parseOpenApiSpec(raw: string, overrideBaseUrl?: string): { baseUrl: string; endpoints: ApiEndpointInput[] } {
  const spec = parse(raw) as Record<string, unknown>;

  if (!spec || typeof spec !== 'object') {
    throw new Error('Spec must be a JSON or YAML object.');
  }

  const baseUrl = resolveBaseUrl(spec, overrideBaseUrl);
  const paths = (spec.paths ?? {}) as Record<string, PathItem>;
  const endpoints: ApiEndpointInput[] = [];

  for (const [pathTemplate, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    const commonParameters = (pathItem.parameters ?? []) as Parameter[];

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method] as Operation | undefined;
      if (!operation || typeof operation !== 'object') continue;

      const parameters = [...commonParameters, ...(operation.parameters ?? [])];
      const url = resolveUrl(baseUrl, pathTemplate, parameters);
      const name = operation.operationId || operation.summary || `${method.toUpperCase()} ${pathTemplate}`;
      const expectedStatus = deriveExpectedStatus(operation);
      const expectedContentType = deriveExpectedContentType(operation, spec);

      endpoints.push({
        name,
        method: method.toUpperCase() as ApiEndpointInput['method'],
        url,
        headers: undefined,
        body: undefined,
        expectedStatus,
        expectedContentType,
        timeoutMs: 5000,
      });
    }
  }

  return { baseUrl, endpoints };
}
