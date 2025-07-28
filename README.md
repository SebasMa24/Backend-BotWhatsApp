# Backend para un Bot de WhatsApp con Mensajes Personalizados

## 🔍 Descripción del Programa

### Arquitectura del Sistema
El proyecto está estructurado con separación de responsabilidades:

```
BotWhatsAppTest/
├── public/                        
    ├── index.html                 # Frontend base para realizar pruebas
├── src/                                                      
    ├── bot/                       # Carpeta con codigo encargado de la conexión con WhatsApp Web
        ├── client.js              # Archivo JS que usa la libreria Whatsapp-web.js para la conexión
    ├── controllers/               
        ├── qr_controller.js       # Controlador para las funcionalidades del codigo QR para realizar la conexión con whatsapp  
        ├── send_controller.js     # Controlador para las funcionalidades de enviar mentsajes
    ├── routers/                    
        ├── qr_routes.js           # Router para definir los ENDPOINTS de los QR
        ├── send_routes.js         # Router para definir los ENDPOINTS de envio de mensajes
        ├── upload_routes.js       # Router para definir los ENDPOINTS de subida de archivos(excel con contactos)                     

```

### Tecnologías Utilizadas
- **JavaScript**: Lenguaje principal
- **Node JS**: Framework Principal
- **Express**: Framework de desarrollo
- **whatsapp-web**: Libreria para la conexión con WhatsApp
