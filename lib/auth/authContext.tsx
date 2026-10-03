"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { Profile } from "@/types";

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, username: string, gradeLevel: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local fallback auth storage keys when Supabase env keys are not provided
const LOCAL_AUTH_USERS_KEY = "schoolquest_auth_users_registry_v1";
const LOCAL_ACTIVE_SESSION_KEY = "schoolquest_active_session_user_v1";

interface RegisteredUserRecord {
  id: string;
  email: string;
  passwordHash: string; // encoded
  profile: Profile;
}

function getLocalUsers(): RegisteredUserRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_AUTH_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalUsers(users: RegisteredUserRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_AUTH_USERS_KEY, JSON.stringify(users));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session
  useEffect(() => {
    async function initSession() {
      setIsLoading(true);
      try {
        if (isSupabaseConfigured && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser({ id: session.user.id, email: session.user.email || "" });
            // Fetch profile
            const { data: prof } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .single();
            if (prof) {
              setProfile(prof);
            } else {
              // Create default profile if missing
              const newProf: Profile = {
                id: session.user.id,
                username: session.user.email?.split("@")[0] || "Student",
                grade_level: "Grade 10",
              };
              await supabase.from("profiles").insert(newProf);
              setProfile(newProf);
            }
          } else {
            setUser(null);
            setProfile(null);
          }
        } else {
          // Local storage session fallback
          const savedActiveId = localStorage.getItem(LOCAL_ACTIVE_SESSION_KEY);
          if (savedActiveId) {
            const users = getLocalUsers();
            const found = users.find((u) => u.id === savedActiveId);
            if (found) {
              setUser({ id: found.id, email: found.email });
              setProfile(found.profile);
            } else {
              localStorage.removeItem(LOCAL_ACTIVE_SESSION_KEY);
              setUser(null);
              setProfile(null);
            }
          } else {
            setUser(null);
            setProfile(null);
          }
        }
      } catch (err) {
        console.error("Failed to initialize auth session", err);
      } finally {
        setIsLoading(false);
      }
    }

    initSession();

    // Listen to Supabase Auth state changes if live
    const activeClient = supabase;
    if (isSupabaseConfigured && activeClient) {
      const { data: authListener } = activeClient.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email || "" });
          const { data: prof } = await activeClient
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          if (prof) setProfile(prof);
        } else {
          setUser(null);
          setProfile(null);
        }
      });
      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) return { error: error.message };
        if (data.user) {
          setUser({ id: data.user.id, email: data.user.email || cleanEmail });
          const { data: prof } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .single();
          if (prof) setProfile(prof);
        }
        return {};
      } else {
        // Local isolated auth
        const users = getLocalUsers();
        const matched = users.find((u) => u.email === cleanEmail);
        if (!matched) {
          return { error: "No account found with this email address. Please sign up." };
        }
        if (matched.passwordHash !== btoa(password)) {
          return { error: "Incorrect password. Please try again." };
        }

        localStorage.setItem(LOCAL_ACTIVE_SESSION_KEY, matched.id);
        setUser({ id: matched.id, email: matched.email });
        setProfile(matched.profile);
        window.dispatchEvent(new Event("schoolquest_auth_changed"));
        return {};
      }
    } catch (err: any) {
      return { error: err.message || "An unexpected error occurred while logging in." };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    username: string,
    gradeLevel: string
  ): Promise<{ error?: string }> => {
    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanUsername = username.trim();

      if (!cleanEmail || !cleanUsername) {
        return { error: "Email and username are required." };
      }
      if (password.length < 6) {
        return { error: "Password must be at least 6 characters long." };
      }

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });
        if (error) return { error: error.message };
        if (data.user) {
          const newProf: Profile = {
            id: data.user.id,
            username: cleanUsername,
            email: cleanEmail,
            grade_level: gradeLevel || "Grade 10",
            created_at: new Date().toISOString(),
          };
          await supabase.from("profiles").insert(newProf);
          setUser({ id: data.user.id, email: cleanEmail });
          setProfile(newProf);
        }
        return {};
      } else {
        // Local isolated auth
        const users = getLocalUsers();
        if (users.some((u) => u.email === cleanEmail)) {
          return { error: "An account with this email address already exists. Please log in." };
        }

        const newId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const newProf: Profile = {
          id: newId,
          username: cleanUsername,
          email: cleanEmail,
          grade_level: gradeLevel || "Grade 10",
          created_at: new Date().toISOString(),
        };

        const newRecord: RegisteredUserRecord = {
          id: newId,
          email: cleanEmail,
          passwordHash: btoa(password),
          profile: newProf,
        };

        users.push(newRecord);
        saveLocalUsers(users);

        localStorage.setItem(LOCAL_ACTIVE_SESSION_KEY, newId);
        setUser({ id: newId, email: cleanEmail });
        setProfile(newProf);
        window.dispatchEvent(new Event("schoolquest_auth_changed"));
        return {};
      }
    } catch (err: any) {
      return { error: err.message || "An unexpected error occurred during signup." };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
      localStorage.removeItem(LOCAL_ACTIVE_SESSION_KEY);
      setUser(null);
      setProfile(null);
      window.dispatchEvent(new Event("schoolquest_auth_changed"));
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>): Promise<{ error?: string }> => {
    if (!user || !profile) return { error: "User is not logged in." };

    try {
      const updatedProfile: Profile = { ...profile, ...updates };

      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from("profiles")
          .update(updates)
          .eq("id", user.id);
        if (error) return { error: error.message };
      } else {
        const users = getLocalUsers();
        const idx = users.findIndex((u) => u.id === user.id);
        if (idx !== -1) {
          users[idx].profile = updatedProfile;
          saveLocalUsers(users);
        }
      }

      setProfile(updatedProfile);
      return {};
    } catch (err: any) {
      return { error: err.message || "Failed to update profile." };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        signIn,
        signUp,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
