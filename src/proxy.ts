// Proxy (antes `middleware.ts` — convenção renomeada no Next 16; docs lidos em
// https://nextjs.org/docs/app/api-reference/file-conventions/proxy).
// Desabilitado — proteção de auth feita no client via AuthProvider
// O cookie antigo com avatar base64 causava 494 REQUEST_HEADER_TOO_LARGE
export function proxy() {
  return undefined;
}

export const config = {
  matcher: [],
};
