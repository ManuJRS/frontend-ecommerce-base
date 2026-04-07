# 💻 Arquitectura del Frontend (Vue 3 + Vite)

El frontend de la tienda está construido con **Vue 3 (Composition API)**, **TypeScript** y **Tailwind CSS**. Para garantizar la escalabilidad y el mantenimiento a largo plazo, el proyecto implementa un patrón de Diseño Orientado a Funcionalidades *(Feature-Sliced Design)* combinado con principios de Arquitectura Limpia.

## 1. Estructura Modular y Separación de Responsabilidades
El código base está dividido estrictamente en capas para desacoplar la interfaz de usuario (UI) de las respuestas crudas del CMS:

- **Core & Shared:** Contiene la configuración global, la instancia base de Axios (interceptores), utilidades y tipos globales (Interfaces TypeScript).
- **Features (`/features`):** Agrupa la lógica de negocio en módulos independientes (ej. `store-view`, `cart`). Cada feature contiene sus propios Modelos de Dominio, Objetos de Transferencia de Datos (DTOs), Servicios de API, Stores de Pinia y Componentes.
- **Capa de Servicios y DTOs:** Para evitar el acoplamiento con la estructura de la base de datos (Strapi), las respuestas JSON pasan por una capa de servicio (`services/`). Aquí, los DTOs limpian y aplanan los datos, traduciéndolos a Modelos de Dominio puros antes de entregarlos a los componentes de Vue.

## 2. Renderizado Dinámico de Vistas (Page Builder)
La vista principal de la tienda (`StoreViewPage.vue`) funciona como un motor de renderizado dinámico en tiempo real.

- En lugar de vistas estáticas *(hardcoded)*, el frontend lee el arreglo de `contentBlocks` proveniente del Single Type de Strapi.
- Utiliza el componente dinámico `<component :is="resolveComponent(...)">` de Vue junto con `defineAsyncComponent` para mapear los identificadores del backend (ej. `blocks.dynamic-hero`) hacia los componentes reales de Vue.
- **Lazy Loading:** Al usar importaciones asíncronas, el navegador solo descarga el código y los estilos de los bloques (Hero, Grid de Productos, etc.) que el CMS realmente decide mostrar en pantalla, optimizando drásticamente el rendimiento inicial.

## 3. Consultas Profundas y Gestión de Relaciones
Para optimizar las peticiones HTTP y obtener todas las relaciones necesarias en una sola llamada, se utiliza la librería `qs`. El motor de consultas está configurado para realizar poblaciones profundas (Deep Populate) de forma quirúrgica:

- Accede a zonas dinámicas complejas.
- Resuelve relaciones anidadas, como obtener el arreglo de productos manuales (`manualProducts`) asignados a un grid, e ingresar un nivel más para recuperar las URLs optimizadas de las imágenes alojadas directamente desde **Cloudinary**.

## 4. Gestión del Estado y Rendimiento
El manejo del estado global está delegado a **Pinia** utilizando la sintaxis de Setup Functions.

- Cada Store maneja de forma segura sus propios ciclos de vida, controlando indicadores de carga (`loading`) y captura de errores (`error`) para ofrecer feedback visual instantáneo.
- Se integra `pinia-plugin-persistedstate` para el almacenamiento en caché del navegador (`localStorage`) cuando es necesario persistir datos críticos entre sesiones, como el carrito de compras.

## 5. Sistema de Diseño (Design Tokens)
La interfaz gráfica implementa un sistema de diseño basado en **Material Design 3 (Material You)**, completamente integrado en la configuración nativa de Tailwind CSS.

- **Tokens de Color:** Las paletas de colores utilizan nomenclatura semántica (`primary-container`, `surface`, `on-surface`) definidas globalmente en el archivo `tailwind.config.js`.
- **Tipografía e Íconos:** Configurado con fuentes legibles y modernas (Manrope para encabezados, Inter para cuerpos de texto) e integración con Material Symbols.
- **Capas Globales:** El archivo principal de estilos (`index.css`) aprovecha las directivas `@layer` de Tailwind para aplicar estilos tipográficos base y componentes reutilizables sin contaminar el alcance global ni romper las reglas de especificidad de CSS.