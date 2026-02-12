import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const authSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(72),
});

const floatingHellos = [
  { text: "你好!", lang: "Chinese", top: "8%", left: "5%", size: "text-4xl", rotate: "-12deg", opacity: "0.3" },
  { text: "こんにちは!", lang: "Japanese", top: "15%", right: "8%", size: "text-5xl", rotate: "8deg", opacity: "0.28" },
  { text: "Bonjour!", lang: "French", top: "35%", left: "3%", size: "text-3xl", rotate: "15deg", opacity: "0.32" },
  { text: "Ciao!", lang: "Italian", bottom: "30%", right: "5%", size: "text-6xl", rotate: "-8deg", opacity: "0.25" },
  { text: "Halo!", lang: "Indonesian", bottom: "12%", left: "8%", size: "text-2xl", rotate: "20deg", opacity: "0.35" },
  { text: "Γεια σου!", lang: "Greek", top: "55%", right: "4%", size: "text-4xl", rotate: "-18deg", opacity: "0.28" },
  { text: "Olá!", lang: "Portuguese", bottom: "45%", left: "6%", size: "text-5xl", rotate: "5deg", opacity: "0.26" },
  { text: "Hallo!", lang: "German", top: "75%", right: "10%", size: "text-3xl", rotate: "-6deg", opacity: "0.32" },
  { text: "你好!", lang: "Chinese", bottom: "8%", right: "18%", size: "text-2xl", rotate: "12deg", opacity: "0.27" },
  { text: "Bonjour!", lang: "French", top: "5%", right: "25%", size: "text-3xl", rotate: "-5deg", opacity: "0.3" },
  { text: "こんにちは!", lang: "Japanese", bottom: "20%", left: "18%", size: "text-3xl", rotate: "10deg", opacity: "0.28" },
  { text: "Ciao!", lang: "Italian", top: "25%", left: "15%", size: "text-2xl", rotate: "-15deg", opacity: "0.32" },
  { text: "Halo!", lang: "Indonesian", top: "65%", left: "2%", size: "text-4xl", rotate: "7deg", opacity: "0.25" },
  { text: "Γεια σου!", lang: "Greek", bottom: "5%", left: "30%", size: "text-2xl", rotate: "-10deg", opacity: "0.28" },
  { text: "Olá!", lang: "Portuguese", top: "10%", left: "28%", size: "text-4xl", rotate: "18deg", opacity: "0.24" },
  { text: "Hallo!", lang: "German", top: "45%", right: "15%", size: "text-5xl", rotate: "-3deg", opacity: "0.26" },
];

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const { signIn, signUp, user, loading } = useAuth();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              variant: "destructive",
              title: "Login failed",
              description: "Invalid email or password. Please try again.",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Login failed",
              description: error.message,
            });
          }
        } else {
          toast({
            title: "Welcome back!",
            description: "You have successfully logged in.",
          });
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              variant: "destructive",
              title: "Sign up failed",
              description: "This email is already registered. Please sign in instead.",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Sign up failed",
              description: error.message,
            });
          }
        } else {
          toast({
            title: "Account created!",
            description: "Please check your email to confirm your account.",
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background p-4 relative overflow-hidden">
      {/* Floating HELLO words */}
      {floatingHellos.map((hello, i) => (
        <span
          key={i}
          className={`absolute ${hello.size} font-bold text-primary select-none pointer-events-none`}
          style={{
            top: hello.top,
            left: hello.left,
            right: hello.right,
            bottom: hello.bottom,
            transform: `rotate(${hello.rotate})`,
            opacity: hello.opacity,
            fontFamily: "'Kablammo', cursive",
          } as React.CSSProperties}
        >
          {hello.text}
        </span>
      ))}

      {/* Top left logo */}
      <div className="flex items-center gap-1 mb-8 z-10">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
          <span className="text-primary-foreground text-xl font-bold" style={{ fontFamily: "'Kablammo', cursive" }}>K</span>
        </div>
        <span className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Kablammo', cursive" }}>eenly</span>
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center z-10">
        {/* Greeting */}
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
                  disabled={isLoading}
                  className="h-12"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
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
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 px-8 pb-8">
              <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLogin ? 'Sign in' : 'Sign up'}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-primary hover:underline font-medium"
                  disabled={isLoading}
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
