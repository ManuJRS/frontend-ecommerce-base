/** Misma base que `src/core/api` para fetch fuera del cliente Axios. */
export const API_URL = import.meta.env.VITE_STRAPI_API_URL || 'http://localhost:1337/api';