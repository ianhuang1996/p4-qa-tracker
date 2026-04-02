export const getDirectImageUrl = (url: string) => {
  if (!url) return '';
  
  if (url.includes('drive.google.com')) {
    const fileId = url.match(/\/d\/([^/?#]+)/)?.[1] || url.match(/[?&]id=([^&#]+)/)?.[1];
    if (fileId) {
      return `https://lh3.googleusercontent.com/u/0/d/${fileId}`;
    }
  }
  
  if (url.includes('imgur.com') && !url.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
    const imgId = url.split('/').pop();
    if (imgId) {
      return `https://i.imgur.com/${imgId}.png`;
    }
  }
  
  return url;
};

export const getVideoEmbedUrl = (url: string) => {
  if (!url) return '';
  
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/');
  }
  
  if (url.includes('drive.google.com')) {
    const fileId = url.match(/\/d\/([^/?#]+)/)?.[1] || url.match(/[?&]id=([^&#]+)/)?.[1];
    if (fileId) {
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
  }
  
  return '';
};

export const isDirectVideo = (url: string) => {
  if (!url) return false;
  return url.match(/\.(mp4|webm|ogg)$/i) !== null;
};

export const normalizeDate = (dateStr: string): string => {
  if (!dateStr) return '';
  
  // If already in YYYY-MM-DD format, return as is
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }
  
  // Handle M/D or MM/DD format
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (match) {
    const month = match[1].padStart(2, '0');
    const day = match[2].padStart(2, '0');
    const year = parseInt(month, 10) > 6 ? '2025' : '2026'; // Heuristic for 2026 context
    return `${year}-${month}-${day}`;
  }
  
  return dateStr;
};
