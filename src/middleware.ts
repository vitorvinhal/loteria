// Middleware desabilitado — proteção de auth feita no client via AuthProvider
// O cookie antigo com avatar base64 causava 494 REQUEST_HEADER_TOO_LARGE
export function middleware() {
  return undefined;
}

export const config = {
  matcher: [],
};
