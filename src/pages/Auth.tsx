import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Lock, Wallet } from 'lucide-react';

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect to main app
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  // Genera email fittizia dallo username
  const generateFakeEmail = (username: string) => `${username.toLowerCase().trim()}@app.local`;

  const validateUsername = (username: string): boolean => {
    // Username: solo lettere, numeri e underscore, min 3 caratteri
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Errore",
        description: "Inserisci username e password",
        variant: "destructive",
      });
      return;
    }

    if (!validateUsername(username)) {
      toast({
        title: "Username non valido",
        description: "L'username deve avere 3-20 caratteri (lettere, numeri, underscore)",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Errore",
        description: "La password deve avere almeno 6 caratteri",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const fakeEmail = generateFakeEmail(username);

    try {
      if (isLogin) {
        const { error } = await signIn(fakeEmail, password);
        if (error) {
          toast({
            title: "Errore di accesso",
            description: error.message === "Invalid login credentials" 
              ? "Username o password non validi" 
              : error.message,
            variant: "destructive",
          });
        }
      } else {
        const { error } = await signUp(fakeEmail, password, username);
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Username già in uso",
              description: "Questo username è già registrato. Prova ad accedere.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Errore di registrazione",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Registrazione completata!",
            description: "Puoi ora accedere con il tuo username.",
          });
          setIsLogin(true);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo/Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20">
            <Wallet className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Finanza Personale
          </h1>
          <p className="text-muted-foreground">
            Gestisci le tue finanze in modo intelligente
          </p>
        </div>

        {/* Auth Card */}
        <Card className="glass border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">
              {isLogin ? 'Accedi' : 'Registrati'}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? 'Inserisci le tue credenziali per accedere' 
                : 'Crea un nuovo account per iniziare'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="il_tuo_username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    disabled={isSubmitting}
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isLogin ? 'Accesso in corso...' : 'Registrazione...'}
                  </>
                ) : (
                  isLogin ? 'Accedi' : 'Registrati'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                disabled={isSubmitting}
              >
                {isLogin 
                  ? "Non hai un account? Registrati" 
                  : "Hai già un account? Accedi"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
