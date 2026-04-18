import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, RefreshCw } from 'lucide-react';
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

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { signUp, signIn, user, loading, activateBypass } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) navigate('/');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  // Reset code state when toggling between login/signup
  useEffect(() => {
    setCodeSent(false);
    setCode('');
    setCooldown(0);
    setErrors({});
  }, [isLogin]);

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

  const sendCode = async (mode: 'login' | 'signup', isResend = false) => {
    if (!validateForm()) return;
    if (isResend) setResending(true); else setIsLoading(true);
    try {
      const fnName = mode === 'login' ? 'send-login-code' : 'send-signup-code';
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: { email: email.trim().toLowerCase(), password },
      });
      if (error || data?.error) {
        toast({
          variant: "destructive",
          title: mode === 'login' ? "Login failed" : "Sign up failed",
          description: data?.error || (mode === 'login' ? "Invalid email or password." : "Could not create account."),
        });
        return;
      }
      setCodeSent(true);
      setCode('');
      setCooldown(60);
      toast({
        title: isResend ? "New code sent" : "Verification code sent",
        description: `Check ${email} for your 6-character code.`,
      });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Could not send code. Try again." });
    } finally {
      setIsLoading(false);
      setResending(false);
    }
  };

  const verifyCodeAndEnter = async () => {
    if (code.length < 6) {
      toast({ variant: "destructive", title: "Invalid code", description: "Enter the full 6-character code." });
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-login-code', {
        body: { email: email.trim().toLowerCase(), code: code.trim().toUpperCase() },
      });
      if (error || data?.error || !data?.valid) {
        toast({ variant: "destructive", title: "Invalid code", description: "The code is incorrect or expired." });
        return;
      }
      // Code valid — sign in to establish a persistent session
      const { error: signInErr } = await signIn(email, password);
      if (signInErr) {
        toast({ variant: "destructive", title: "Sign-in failed", description: signInErr.message });
        return;
      }
      toast({
        title: isLogin ? "Welcome back!" : "Account created!",
        description: isLogin ? "You have successfully logged in." : "You're now signed in.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codeSent) {
      await verifyCodeAndEnter();
    } else {
      await sendCode(isLogin ? 'login' : 'signup', false);
    }
  };

  const isPreviewMode = window.location.hostname.includes('preview') || import.meta.env.DEV;

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
                  disabled={isLoading || codeSent}
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
                  disabled={isLoading || codeSent}
                  className="h-12"
                />
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              {/* Code input — appears after sending the code (login or signup) */}
              {codeSent && (
                <div className="space-y-2 animate-fade-in">
                  <Label htmlFor="code">Input Code</Label>
                  <p className="text-xs text-muted-foreground">
                    A 6-character code was sent to <span className="font-medium text-foreground">{email}</span>.
                  </p>
                  <Input
                    id="code"
                    type="text"
                    placeholder="e.g., A4F2B1"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^0-9A-F]/gi, "").slice(0, 6))}
                    disabled={isLoading}
                    className="h-12 text-center text-lg font-mono tracking-[0.3em] uppercase"
                    maxLength={6}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => sendCode(isLogin ? 'login' : 'signup', true)}
                      disabled={resending || cooldown > 0}
                      className="gap-1 text-xs h-7"
                    >
                      <RefreshCw className={`h-3 w-3 ${resending ? "animate-spin" : ""}`} />
                      {cooldown > 0 ? `Resend (${cooldown}s)` : "Resend code"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4 px-8 pb-8">
              <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {codeSent
                  ? (isLogin ? 'Verify & Log in' : 'Verify & Sign up')
                  : (isLogin ? 'Log in' : 'Sign up')}
              </Button>
              {codeSent && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setCodeSent(false); setCode(''); }}
                  disabled={isLoading}
                  className="text-xs"
                >
                  Use a different email
                </Button>
              )}
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
                {isLogin && !codeSent && (
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
      </div>
    </div>
  );
};

export default Auth;
