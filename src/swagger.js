const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Documentation",
      version: "1.0.0",
      description: "Documentation générée par Swagger pour ton API NodeJS",
    },
    servers: [
      {
        url: "http://localhost:3000", // modifie selon ton port
      },
    ],
  },

  // Chemins où swagger récupère les commentaires de doc
  apis: ["./routes/*.js"], // <— à adapter selon ton projet
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = { swaggerSpec, swaggerUi };
