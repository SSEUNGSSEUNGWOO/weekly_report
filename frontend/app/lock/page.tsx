"use client";

import { useState } from "react";
import Image from "next/image";
import { ShieldCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LockPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        setError("입장코드가 일치하지 않습니다.");
        setLoading(false);
        return;
      }
      window.location.href = "/";
    } catch {
      setError("오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-[420px]">
        {/* 정부 톤 강조 띠 */}
        <div className="h-1 w-full rounded-t-md bg-primary" aria-hidden />

        <div className="rounded-b-md border border-t-0 border-border bg-card px-8 py-10 shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col items-center text-center">
            <Image
              src="/k-brain-logo.png"
              alt="K-Brain"
              width={3233}
              height={1326}
              priority
              className="h-8 w-auto"
            />

            <p className="mt-7 font-mono text-[10.5px] font-medium tracking-[0.14em] text-primary">
              행정안전부 · 한국지능정보사회진흥원
            </p>
            <h1 className="mt-2 font-serif text-[19px] font-bold leading-[1.35] tracking-[-0.01em] text-foreground">
              2026년 AI·데이터기반행정
              <br />
              역량강화 사업
            </h1>
            <p className="mt-2 font-serif text-[15px] font-semibold text-primary">
              주간보고
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-2.5">
            <label className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              입장코드 입력하기
            </label>
            <Input
              type="password"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              placeholder="입장코드를 입력하세요"
              autoFocus
              className="h-11 text-[14px] tracking-[0.05em]"
              autoComplete="off"
            />

            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-[12px] font-medium text-destructive">
                <AlertCircle className="size-3.5 shrink-0" strokeWidth={2.25} />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={!code.trim() || loading}
              size="lg"
              className="mt-2 h-11 gap-2 font-semibold"
            >
              <ShieldCheck className="size-4" strokeWidth={2.25} />
              {loading ? "확인 중…" : "입장하기"}
            </Button>
          </form>

          <div className="mt-7 border-t border-border pt-4 text-center font-mono text-[10px] tracking-[0.06em] text-muted-foreground">
            ㈜케이브레인컴퍼니 · K-Brain Internal
          </div>
        </div>
      </div>
    </div>
  );
}
