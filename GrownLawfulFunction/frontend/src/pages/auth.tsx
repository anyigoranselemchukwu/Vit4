import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin, useRegister } from "@/api-client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Activity, ArrowRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
});

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { login: setAuthToken } = useAuth();
  
  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", email: "", password: "" },
  });

  const onLoginSubmit = async (data: z.infer<typeof loginSchema>) => {
    try {
      const res = await loginMutation.mutateAsync({ data });
      setAuthToken(res.access_token);
      toast.success("Authentication successful");
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error.message || "Login failed";
      toast.error(msg);
    }
  };

  const onRegisterSubmit = async (data: z.infer<typeof registerSchema>) => {
    try {
      const res = await registerMutation.mutateAsync({ data });
      setAuthToken(res.access_token);
      toast.success("Registration successful");
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error.message || "Registration failed";
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Abstract terminal grid background */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(to right, rgba(0, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 255, 255, 0.05) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        maskImage: 'radial-gradient(ellipse at center, black, transparent 80%)'
      }} />

      <div className="w-full max-w-md p-4 relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-4 border border-primary/30 shadow-[0_0_20px_rgba(0,255,255,0.2)]">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-mono tracking-tight uppercase text-foreground">
            VIT<span className="text-primary">_OS</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2 uppercase tracking-widest font-mono">
            System Authentication
          </p>
        </div>

        <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-2xl">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2 bg-background/50 border border-border">
                <TabsTrigger value="login" className="font-mono uppercase text-xs">Login</TabsTrigger>
                <TabsTrigger value="register" className="font-mono uppercase text-xs">Register</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono uppercase text-xs text-muted-foreground">Email</FormLabel>
                          <FormControl>
                            <Input placeholder="OPERATOR@VIT.NETWORK" className="bg-background/50 font-mono border-primary/20 focus-visible:ring-primary/50" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono uppercase text-xs text-muted-foreground">Passcode</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" className="bg-background/50 font-mono border-primary/20 focus-visible:ring-primary/50" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full font-mono uppercase tracking-wider" disabled={loginMutation.isPending}>
                      {loginMutation.isPending ? "Authenticating..." : "Initialize Session"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono uppercase text-xs text-muted-foreground">Alias</FormLabel>
                          <FormControl>
                            <Input placeholder="NODE_OPERATOR" className="bg-background/50 font-mono border-primary/20 focus-visible:ring-primary/50" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono uppercase text-xs text-muted-foreground">Email</FormLabel>
                          <FormControl>
                            <Input placeholder="OPERATOR@VIT.NETWORK" className="bg-background/50 font-mono border-primary/20 focus-visible:ring-primary/50" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono uppercase text-xs text-muted-foreground">Passcode</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" className="bg-background/50 font-mono border-primary/20 focus-visible:ring-primary/50" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full font-mono uppercase tracking-wider" disabled={registerMutation.isPending}>
                      {registerMutation.isPending ? "Generating Keys..." : "Create Identity"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
