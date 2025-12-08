"use client";

import { useRouter } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/auth-client";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  userEmail?: string;
}

export function Navbar({ userEmail }: NavbarProps) {
  const router = useRouter();
  const supabase = createAuthClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1
            className="text-xl font-bold cursor-pointer"
            onClick={() => router.push("/")}
          >
            KREAM Price Tracker
          </h1>
          {userEmail && (
            <div className="hidden md:flex gap-4">
              <Button variant="ghost" onClick={() => router.push("/dashboard")}>
                대시보드
              </Button>
              <Button variant="ghost" onClick={() => router.push("/settings/alerts")}>
                알림 설정
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {userEmail ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {userEmail}
              </span>
              <Button variant="outline" onClick={handleSignOut}>
                로그아웃
              </Button>
            </>
          ) : (
            <Button onClick={() => router.push("/login")}>로그인</Button>
          )}
        </div>
      </div>
    </nav>
  );
}
