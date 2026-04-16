import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const authSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(72),
});

const helloWords = [
  "Hello!", "你好!", "こんにちは!", "Bonjour!", "Ciao!", "Halo!", "Γεια σου!", "Olá!", "Hallo!",
  "Merhaba!", "Sawubona!", "Namaste!", "Annyeong!", "Hej!", "Salam!", "Aloha!", "Shalom!",
  "Kamusta!", "Xin chào!", "Habari!", "Hola!", "Привет!", "Ahoj!", "Cześć!", "Salut!",
  "Hei!", "Halló!", "Saluton!", "Selam!", "Buna!", "Sveiki!", "Tere!", "Konnichiwa!",
  "Sawasdee!", "Mingalaba!", "Vanakkam!", "Ayubowan!", "Jambo!", "Mbote!", "Sanibonani!",
  "Dumela!", "Mholweni!", "Salaam!", "Zdravo!", "Bog!", "Szia!", "Ahlan!", "Barev!",
  "Gamarjoba!", "Sain bainuu!", "Selamat!", "Kia ora!", "Bula!", "Talofa!", "Malo!",
  "Hafa adai!", "Yokwe!", "Alii!", "Mauri!", "Bonjou!", "Përshëndetje!", "Mirëdita!",
  "Pryvit!", "Saluton!", "Nǐ hǎo!", "Anyoung!", "Kumusta!", "Zdravstvuyte!", "Habari!",
  "Shalom!", "Hej!", "Merhaba!", "Sawubona!", "Aloha!", "Ciao!", "Olá!", "Hallo!",
];

const COLS = 8;
const ROWS = 10;

const gridHellos = Array.from({ length: ROWS * COLS }, (_, i) => ({
  text: helloWords[i % helloWords.length],
  row: Math.floor(i / COLS),
  col: i % COLS,
}));

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showVerifyMessage, setShowVerifyMessage] = useState(false);
  
  const { signIn, signUp, user, loading, activateBypass } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const validateForm = () => {
    try {
      authSchema.parse({ email, password });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { email?: string; password?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0] === 'email') fieldErrors.email = err.message;
          if (err.path[0] === 'password') fieldErrors.password = err.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleBypass = () => {
    activateBypass();
    navigate('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            variant: "destructive",
            title: "Login failed",
            description: error.message.includes('Invalid login credentials')
              ? "Invalid email or password. Please try again."
              : error.message.includes('Email not confirmed')
              ? "Please verify your email before signing in. Check your inbox."
              : error.message,
          });
        } else {
          toast({ title: "Welcome back!", description: "You have successfully logged in." });
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          toast({
            variant: "destructive",
            title: "Sign up failed",
            description: error.message.includes('already registered')
              ? "This email is already registered. Please sign in instead."
              : error.message,
          });
        } else {
          setShowVerifyMessage(true);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Check if running in preview mode
  const isPreviewMode = window.location.hostname.includes('lovable.app') || import.meta.env.DEV;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background p-4 relative overflow-hidden">
      {/* Grid of hello words covering entire background */}
      <div className="absolute inset-0 flex flex-wrap items-start content-start justify-center gap-x-3 gap-y-0 p-2 pointer-events-none select-none overflow-hidden">
        {Array.from({ length: 8 }, () => helloWords).flat().map((word, i) => (
          <span
            key={i}
            className="text-primary font-bold flex flex-col items-center"
            style={{
              fontFamily: "'Kablammo', cursive",
              fontSize: `clamp(0.65rem, 1.2vw, 1rem)`,
              opacity: 0.2,
              lineHeight: 0.9,
              letterSpacing: '-0.02em',
            }}
          >
            {word.split('').map((char, j) => (
              <span key={j} style={{ lineHeight: 0.85, margin: 0, padding: 0 }}>{char}</span>
            ))}
          </span>
        ))}
      </div>

      {/* Top left logo */}
      <div className="mb-8 z-10">
        <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-primary">
          <span className="text-primary-foreground text-lg font-bold leading-none">|&lt;</span>
        </div>
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-start pt-[8vh] z-10">
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold text-foreground mb-2" style={{ fontFamily: "'Kablammo', cursive" }}>
            HELLO!!!
          </h1>
          <p className="text-muted-foreground text-lg max-w-md">
            Salutations, would thy like to login or perhaps create an account?
          </p>
        </div>

        {showVerifyMessage ? (
          <Card className="w-full max-w-lg">
            <CardContent className="pt-8 pb-8 px-8 text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </div>
              <h2 className="text-xl font-semibold text-foreground">Check your email</h2>
              <p className="text-sm text-muted-foreground">
                We've sent a verification link to <span className="font-medium text-foreground">{email}</span>. 
                Please click the link in your email to verify your account before signing in.
              </p>
              <Button
                variant="outline"
                onClick={() => { setShowVerifyMessage(false); setIsLogin(true); }}
                className="mt-4"
              >
                Back to login
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-lg">
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-5 pt-8 pb-4 px-8">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="h-12"
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-12"
                  />
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 px-8 pb-8">
                <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLogin ? 'Log in' : 'Sign up'}
                </Button>
                {isPreviewMode && (
                  <Button 
                    type="button"
                    variant="outline" 
                    className="w-full h-12 text-base border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5" 
                    onClick={handleBypass}
                  >
                    Bypass (Preview Mode)
                  </Button>
                )}
                <div className="flex flex-col items-center gap-2">
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="text-sm text-primary hover:underline font-medium"
                      disabled={isLoading}
                    >
                      Forgot password?
                    </button>
                  )}
                  <p className="text-sm text-muted-foreground text-center">
                    {isLogin ? "Don't have an account? " : 'Already have an account? '}
                    <button
                      type="button"
                      onClick={() => setIsLogin(!isLogin)}
                      className="text-primary hover:underline font-medium"
                      disabled={isLoading}
                    >
                      {isLogin ? 'Sign up' : 'Log in'}
                    </button>
                  </p>
                </div>
              </CardFooter>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Auth;
