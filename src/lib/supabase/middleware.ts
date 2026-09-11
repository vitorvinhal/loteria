import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = new Set([
  '/auth/login',
  '/auth/cadastro',
  '/changelog',
  '/',
  '/api/loterias',
  '/api/concursos',
  '/api/estatisticas',
  '/api/analisar',
]);

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response = NextResponse.next({ request });
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Não desencadeia atualização de token a cada request (evita header gigante)
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  const path = request.nextUrl.pathname;

  const ehPublico = [...PUBLIC_PATHS].some(
    (p) => path === p || (p !== '/' && path.startsWith(p + '/'))
  );

  if (ehPublico) {
    if (user && (path === '/auth/login' || path === '/auth/cadastro')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return response;
  }

  if (path.startsWith('/api/usuario') && !user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (!user) {
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('redirect', path);
    return NextResponse.redirect(url);
  }

  return response;
}
