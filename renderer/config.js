/**
 * LEMON BROWSER — Constantes y Datos (Renderer)
 * ================================================
 */

/** User Agent para simular navegador de escritorio */
export const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

/** Motores de búsqueda disponibles */
export const searchEngines = {
  google: {
    name: 'Google',
    url: 'https://www.google.com/search?q=',
    icon: 'https://www.google.com/favicon.ico'
  },
  duckduckgo: {
    name: 'DuckDuckGo',
    url: 'https://duckduckgo.com/?q=',
    icon: 'https://duckduckgo.com/favicon.ico'
  },
  bing: {
    name: 'Bing',
    url: 'https://www.bing.com/search?q=',
    icon: 'https://www.bing.com/favicon.ico'
  },
  ecosia: {
    name: 'Ecosia',
    url: 'https://www.ecosia.org/search?q=',
    icon: 'https://www.ecosia.org/favicon.ico'
  }
};

/** Base de datos de sitios populares para sugerencias inteligentes */
export const popularSites = [
  // Redes Sociales
  { name: 'YouTube', url: 'https://www.youtube.com', icon: 'https://www.youtube.com/favicon.ico', keywords: ['youtube', 'video', 'videos', 'you', 'yt'] },
  { name: 'Facebook', url: 'https://www.facebook.com', icon: 'https://www.facebook.com/favicon.ico', keywords: ['facebook', 'face', 'fb', 'social'] },
  { name: 'Twitter / X', url: 'https://twitter.com', icon: 'https://twitter.com/favicon.ico', keywords: ['twitter', 'x', 'tweet', 'tweets'] },
  { name: 'Instagram', url: 'https://www.instagram.com', icon: 'https://www.instagram.com/favicon.ico', keywords: ['instagram', 'insta', 'ig', 'fotos'] },
  { name: 'TikTok', url: 'https://www.tiktok.com', icon: 'https://www.tiktok.com/favicon.ico', keywords: ['tiktok', 'tik', 'tok'] },
  { name: 'LinkedIn', url: 'https://www.linkedin.com', icon: 'https://www.linkedin.com/favicon.ico', keywords: ['linkedin', 'linked', 'trabajo', 'empleo'] },
  { name: 'Reddit', url: 'https://www.reddit.com', icon: 'https://www.reddit.com/favicon.ico', keywords: ['reddit', 'red', 'foro'] },
  { name: 'Discord', url: 'https://discord.com', icon: 'https://discord.com/favicon.ico', keywords: ['discord', 'chat', 'comunidad'] },
  { name: 'Twitch', url: 'https://www.twitch.tv', icon: 'https://www.twitch.tv/favicon.ico', keywords: ['twitch', 'stream', 'streaming', 'directo'] },

  // Correo y Productividad
  { name: 'Gmail', url: 'https://mail.google.com', icon: 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico', keywords: ['gmail', 'mail', 'correo', 'email', 'gm'] },
  { name: 'Outlook', url: 'https://outlook.live.com', icon: 'https://outlook.live.com/favicon.ico', keywords: ['outlook', 'hotmail', 'correo', 'email'] },
  { name: 'Google Drive', url: 'https://drive.google.com', icon: 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png', keywords: ['drive', 'google drive', 'archivos', 'nube'] },
  { name: 'Dropbox', url: 'https://www.dropbox.com', icon: 'https://www.dropbox.com/favicon.ico', keywords: ['dropbox', 'drop', 'archivos', 'nube'] },
  { name: 'Notion', url: 'https://www.notion.so', icon: 'https://www.notion.so/favicon.ico', keywords: ['notion', 'notas', 'productividad'] },
  { name: 'Trello', url: 'https://trello.com', icon: 'https://trello.com/favicon.ico', keywords: ['trello', 'tareas', 'proyecto'] },

  // Desarrollo
  { name: 'GitHub', url: 'https://github.com', icon: 'https://github.com/favicon.ico', keywords: ['github', 'git', 'codigo', 'repositorio', 'repo'] },
  { name: 'Stack Overflow', url: 'https://stackoverflow.com', icon: 'https://stackoverflow.com/favicon.ico', keywords: ['stackoverflow', 'stack', 'programacion', 'codigo'] },
  { name: 'GitLab', url: 'https://gitlab.com', icon: 'https://gitlab.com/favicon.ico', keywords: ['gitlab', 'git', 'codigo'] },
  { name: 'CodePen', url: 'https://codepen.io', icon: 'https://codepen.io/favicon.ico', keywords: ['codepen', 'code', 'html', 'css'] },
  { name: 'npm', url: 'https://www.npmjs.com', icon: 'https://www.npmjs.com/favicon.ico', keywords: ['npm', 'node', 'paquetes', 'javascript'] },

  // Entretenimiento
  { name: 'Netflix', url: 'https://www.netflix.com', icon: 'https://www.netflix.com/favicon.ico', keywords: ['netflix', 'series', 'peliculas', 'streaming'] },
  { name: 'Spotify', url: 'https://www.spotify.com', icon: 'https://www.spotify.com/favicon.ico', keywords: ['spotify', 'musica', 'music', 'canciones'] },
  { name: 'Amazon', url: 'https://www.amazon.com', icon: 'https://www.amazon.com/favicon.ico', keywords: ['amazon', 'compras', 'tienda'] },
  { name: 'eBay', url: 'https://www.ebay.com', icon: 'https://www.ebay.com/favicon.ico', keywords: ['ebay', 'compras', 'subastas'] },

  // Noticias y Educación
  { name: 'Wikipedia', url: 'https://www.wikipedia.org', icon: 'https://www.wikipedia.org/favicon.ico', keywords: ['wikipedia', 'wiki', 'enciclopedia', 'informacion'] },
  { name: 'Medium', url: 'https://medium.com', icon: 'https://medium.com/favicon.ico', keywords: ['medium', 'articulos', 'blog'] },
  { name: 'Coursera', url: 'https://www.coursera.org', icon: 'https://www.coursera.org/favicon.ico', keywords: ['coursera', 'cursos', 'educacion'] },
  { name: 'Udemy', url: 'https://www.udemy.com', icon: 'https://www.udemy.com/favicon.ico', keywords: ['udemy', 'cursos', 'aprender'] },

  // Herramientas
  { name: 'Google Maps', url: 'https://maps.google.com', icon: 'https://www.google.com/images/branding/product/1x/maps_32dp.png', keywords: ['maps', 'mapas', 'google maps', 'direcciones'] },
  { name: 'Google Translate', url: 'https://translate.google.com', icon: 'https://ssl.gstatic.com/images/branding/product/1x/translate_24dp.png', keywords: ['translate', 'traductor', 'traducir', 'google translate'] },
  { name: 'Canva', url: 'https://www.canva.com', icon: 'https://www.canva.com/favicon.ico', keywords: ['canva', 'diseño', 'design', 'grafico'] },
  { name: 'Figma', url: 'https://www.figma.com', icon: 'https://www.figma.com/favicon.ico', keywords: ['figma', 'diseño', 'design', 'ui', 'ux'] },

  // Otros
  { name: 'WhatsApp Web', url: 'https://web.whatsapp.com', icon: 'https://web.whatsapp.com/favicon.ico', keywords: ['whatsapp', 'whats', 'chat', 'mensajes'] },
  { name: 'Telegram Web', url: 'https://web.telegram.org', icon: 'https://web.telegram.org/favicon.ico', keywords: ['telegram', 'chat', 'mensajes'] },
  { name: 'ChatGPT', url: 'https://chat.openai.com', icon: 'https://chat.openai.com/favicon.ico', keywords: ['chatgpt', 'gpt', 'openai', 'ai', 'chat'] },
  { name: 'Google Calendar', url: 'https://calendar.google.com', icon: 'https://calendar.google.com/favicon.ico', keywords: ['calendar', 'calendario', 'agenda', 'eventos'] }
];

/** Atajos de teclado por defecto (renderer copy) */
export const defaultShortcuts = {
  'shortcut-search': { key: 'ArrowUp', ctrl: true, shift: false, alt: false },
  'shortcut-close': { key: 'ArrowDown', ctrl: true, shift: false, alt: false },
  'shortcut-back': { key: 'ArrowLeft', ctrl: true, shift: false, alt: false },
  'shortcut-forward': { key: 'ArrowRight', ctrl: true, shift: false, alt: false },
  'shortcut-tab-next': { key: 'ArrowRight', ctrl: false, shift: false, alt: true },
  'shortcut-tab-prev': { key: 'ArrowLeft', ctrl: false, shift: false, alt: true },
  'shortcut-center-window': { key: 'ArrowUp', ctrl: false, shift: false, alt: true }
};
