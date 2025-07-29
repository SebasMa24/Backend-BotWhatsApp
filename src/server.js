const app = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Backend WhatsApp bot corriendo en http://localhost:${PORT}`);
  console.log(`📘 Swagger UI: http://localhost:${PORT}/api-docs`);
});