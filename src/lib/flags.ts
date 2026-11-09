/**
 * O painel Admin (e o botão de trocar a imagem do minimapa) só existem em desenvolvimento.
 * No build publicado ficam escondidos. Para publicar COM admin: VITE_SHOW_ADMIN=true npm run build
 */
export const ADMIN_ENABLED: boolean = import.meta.env.DEV || import.meta.env.VITE_SHOW_ADMIN === 'true'
