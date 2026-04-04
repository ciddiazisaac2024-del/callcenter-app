import { startupLogger } from './logger';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const swaggerDoc = {
  openapi: '3.0.0',
  info: { title: 'CallScript API', version: '1.0.0', description: 'API para scripts de call center' },
  servers: [{ url: 'http://localhost:3001', description: 'Desarrollo' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } }
  },
  paths: {
    '/api/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Iniciar sesión',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: {
            email:    { type: 'string', example: 'agente1@callcenter.cl' },
            password: { type: 'string', example: 'Agent123!' }
          }}}}
        },
        responses: { 200: { description: 'Login exitoso — retorna JWT' }, 401: { description: 'Credenciales inválidas' } }
      }
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'], summary: 'Registrar usuario',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: {
            email:    { type: 'string', example: 'nuevo@callcenter.cl' },
            password: { type: 'string', example: 'Password123!' },
            name:     { type: 'string', example: 'Juan Pérez' }
          }}}}
        },
        responses: { 201: { description: 'Usuario creado' } }
      }
    },
    '/api/scripts': {
      get: {
        tags: ['Scripts'], summary: 'Obtener todos los scripts',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'search',   in: 'query', schema: { type: 'string' }, example: 'incumplimiento' },
          { name: 'category', in: 'query', schema: { type: 'string' }, example: 'Ventas' },
          { name: 'tag',      in: 'query', schema: { type: 'string' }, example: 'CNE' }
        ],
        responses: { 200: { description: 'Lista de scripts' } }
      },
      post: {
        tags: ['Scripts'], summary: 'Crear script (admin/supervisor)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: {
            title:        { type: 'string', example: 'Nuevo script' },
            base_content: { type: 'string', example: 'Hola {{cliente}}...' },
            description:  { type: 'string' },
            tags:         { type: 'array', items: { type: 'string' } }
          }}}}
        },
        responses: { 201: { description: 'Script creado' }, 403: { description: 'Sin permisos' } }
      }
    },
    '/api/scripts/{id}': {
      get: {
        tags: ['Scripts'], summary: 'Obtener script por ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Script encontrado' }, 404: { description: 'No encontrado' } }
      }
    },
    '/api/scripts/{id}/generate': {
      post: {
        tags: ['Scripts'], summary: 'Generar script con variables',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: {
            variables_values: { type: 'object', example: { cliente: 'Sr. García', monto: '$45.000' } }
          }}}}
        },
        responses: { 200: { description: 'Script generado con variables reemplazadas' } }
      }
    }
  }
};

export const setupSwagger = (app: Express) => {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'CallScript API Docs'
  }));
  startupLogger.debug('Swagger UI disponible en /api/docs');
};
