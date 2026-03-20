/**
 * LEMON BROWSER — Utilities (Renderer)
 * =========================================================
 */

export function categorizeTab(url) {
  if (!url || url === 'about:blank') return 'Búsqueda';
  const domain = url.toLowerCase();
  
  const keywords = {
    'Social': ['facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'tiktok.com', 'reddit.com', 'linkedin.com', 'discord.com', 'whatsapp.com', 'telegram.org'],
    'Ocio': ['youtube.com', 'netflix.com', 'twitch.tv', 'primevideo.com', 'disneyplus.com', 'hbo.com', 'spotify.com', 'vimeo.com', 'rtve.es'],
    'Productividad': ['github.com', 'gitlab.com', 'bitbucket.org', 'slack.com', 'microsoft.com', 'google.com/docs', 'drive.google.com', 'notion.so', 'trello.com', 'figma.com', 'stackoverflow.com', 'npmjs.com', 'gemini.google.com', 'chatgpt.com'],
    'Información': ['wikipedia.org', 'reuters.com', 'bbc.com', 'nytimes.com', 'elpais.com', 'elmundo.es', 'abc.es', 'elconfidencial.com'],
    'Herramientas': ['google.com/search', 'duckduckgo.com', 'bing.com', 'search.brave.com', 'claude.ai', 'chat.openai.com', 'bing.com/chat', 'perplexity.ai'],
  };

  for (const [cat, list] of Object.entries(keywords)) {
    if (list.some(d => domain.includes(d))) return cat;
  }
  
  return 'General';
}

export function esc(str) {
  const d = document.createElement('span');
  d.textContent = str ?? '';
  return d.innerHTML;
}
