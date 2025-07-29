const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Bot de WhatsApp',
      version: '1.0.0',
      description: 'Documentación de la API para enviar mensajes a contactos desde un Excel',
    },
  },
  apis: ['./src/routes/*.js'], 
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;