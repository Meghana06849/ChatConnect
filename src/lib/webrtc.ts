const DEFAULT_STUN_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302',
  'stun:stun3.l.google.com:19302',
  'stun:stun4.l.google.com:19302',
];

const parseConfiguredValues = (value?: string) => {
  if (!value) return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
      }
    } catch {
      return [];
    }
  }

  return trimmed
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export const createIceServers = (): RTCConfiguration => {
  const turnUrls = parseConfiguredValues(import.meta.env.VITE_WEBRTC_TURN_URLS);
  const turnUsername = import.meta.env.VITE_WEBRTC_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_WEBRTC_TURN_CREDENTIAL;

  const iceServers: RTCIceServer[] = DEFAULT_STUN_SERVERS.map((url) => ({ urls: url }));

  if (turnUrls.length > 0) {
    iceServers.push({
      urls: turnUrls,
      ...(turnUsername ? { username: turnUsername } : {}),
      ...(turnCredential ? { credential: turnCredential } : {}),
    });
  }

  return { iceServers };
};
