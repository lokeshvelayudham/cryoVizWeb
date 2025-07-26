"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp"


export default function OTPVerifyPage() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });

    const result = await res.json();
    setLoading(false);

    if (res.ok && result.success) {
      router.push("/users_datasets");
    } else {
      setError(result.error || "Invalid OTP");
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto mt-20">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 font-medium">
          <h1 className="text-xl font-bold text-center">
            Enter OTP for <span className="font-trajan">CryoViz</span>
            <span className="align-baseline text-xs">™</span> Web
          </h1>
          <p className="text-sm text-muted-foreground">
            Sent to <span className="font-medium">{email}</span>
          </p>
        </div>
        <div className="flex justify-center">
        <InputOTP
          maxLength={6}
          value={otp}
          onChange={(val) => setOtp(val)}
          pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
          
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Verifying..." : "Verify OTP"}
        </Button>

        {error && (
          <p className="text-sm text-red-500 text-center -mt-3">{error}</p>
        )}
      </form>

      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        <p>
          A proud product of{" "}
          <a
            href="https://bioinvision.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-trajan text-sm"
          >
            BioInvision
          </a>
          .
        </p>
      </div>
    </div>
  );
}