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

const helloWords = [
  "Hello!", "你好!", "こんにちは!", "Bonjour!", "Ciao!", "Halo!", "Γεια σου!", "Olá!", "Hallo!",
  "Merhaba!", "Sawubona!", "Namaste!", "Annyeong!", "Hej!", "Salam!", "Aloha!", "Shalom!",
  "Kamusta!", "Xin chào!", "Habari!", "Hola!", "Привет!", "Ahoj!", "Cześć!", "Salut!",
  "Hei!", "Halló!", "Saluton!", "Kumusta!", "Selam!", "Buna!", "Sveiki!", "Tere!",
  "Nǐ hǎo!", "Konnichiwa!", "Anyoung!", "Sawasdee!", "Mingalaba!", "Vanakkam!", "Ayubowan!",
  "Jambo!", "Mbote!", "Sanibonani!", "Dumela!", "Mholweni!", "Salaam!", "Zdravo!", "Bog!",
  "Szia!", "Ahlan!", "Barev!", "Gamarjoba!", "Sain bainuu!", "Salaw!", "Selamat!",
  "Kumusta!", "Kia ora!", "Bula!", "Talofa!", "Malo!", "Hafa adai!", "Yokwe!",
  "Alii!", "Ran annim!", "Mogethin!", "Iakwe!", "Mauri!", "Halo!", "Bonjou!",
  "Saluton!", "Përshëndetje!", "Tungjatjeta!", "Mirëdita!", "Zdravstvuyte!", "Pryvit!",
];

// Build a grid that covers the entire background
const gridHellos = (() => {
  const cols = 8;
  const rows = 12;
  const items: { text: string; row: number; col: number }[] = [];
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      items.push({ text: helloWords[idx % helloWords.length], row: r, col: c });
      idx++;
    }
  }
  return items;
})();
      {/* Top left logo */}
      <div className="mb-8 z-10">
        <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-primary">
          <span className="text-primary-foreground text-lg font-bold leading-none">|&lt;</span>
        </div>
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-start pt-[8vh] z-10">
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
                {isLogin ? 'Log in' : 'Sign up'}
              </Button>
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
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
