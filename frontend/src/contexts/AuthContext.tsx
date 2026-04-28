import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  nome: string;
  avatar_url: string | null;
  created_at: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (currentUser: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
        
      // Se não encontrou o perfil (PGRST116) tenta criar na hora
      if (error && error.code === 'PGRST116') {
        const fallbackName = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Usuário';
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({ id: currentUser.id, email: currentUser.email, nome: fallbackName })
          .select()
          .single();
          
        if (!insertError) return newProfile as UserProfile;
      }
      
      return error ? null : (data as UserProfile);
    } catch {
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const p = await fetchProfile(user);
      if (p) setProfile(p);
    }
  };

  useEffect(() => {
    let mounted = true;

    // 1. O timeout de fallback garante que NUNCA fique travado no loading
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('AuthContext: Fallback safety timeout acionado. Liberando app.');
        setLoading(false);
      }
    }, 5000);

    const initAuth = async () => {
      try {
        // Garantimos que a sessão seja lida do LocalStorage *e* os headers sejam injetados no cliente HTTP
        const { data: { session: s }, error } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(s);
          setUser(s?.user ?? null);
          
          if (s?.user) {
            const p = await fetchProfile(s.user);
            if (mounted) setProfile(p);
          }
        }
      } catch (err) {
        console.error('AuthContext: Erro ao inicializar sessão:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // 2. Registramos o listener para mudanças futuras de estado (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;
      if (event === 'INITIAL_SESSION') return; // Ignora, pois o initAuth já resolve a inicialização com segurança
      
      setSession(s);
      setUser(s?.user ?? null);
      
      if (s?.user) {
        // PREVENÇÃO DE DEADLOCK: O Supabase trava globalmente se você fizer `await supabase.from` 
        // dentro deste listener (ex: se for acionado durante um TOKEN_REFRESHED).
        // Usamos setTimeout para jogar a requisição para fora da stack de execução atual do Auth.
        setTimeout(() => {
          fetchProfile(s.user).then(p => {
            if (mounted) {
              setProfile(p);
              setLoading(false);
            }
          }).catch(() => {
            if (mounted) setLoading(false);
          });
        }, 0);
      } else {
        if (mounted) {
          setProfile(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    // 1. Limpa o storage local imediatamente
    localStorage.clear();
    
    // 2. Dispara o signOut mas não espera (fire-and-forget)
    supabase.auth.signOut().catch(() => {});
    
    // 3. Redireciona na hora, sem bloqueios de rede
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
