"use client";
import { useState } from "react";
import { Button } from "../../../components/ui/button";

export default function FeedbackPage() {
  const [sent, setSent] = useState(false);
  return (
    <div className="max-w-lg mx-auto py-16 px-4 text-center">
      <h1 className="text-3xl font-heading font-bold text-[#EDE7DC] mb-4">Feedback</h1>
      {sent ? (
        <p className="text-[#34D399]">Obrigado! Seu feedback foi enviado.</p>
      ) : (
        <>
          <p className="text-[#9CA3AF] mb-6">Como foi sua experiência com o MEDIA Rate?</p>
          <div className="flex justify-center gap-2 mb-6 text-2xl">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setSent(true)}
                className="hover:scale-125 transition-transform"
              >
                {n <= 4 ? "⭐" : "🌟"}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#6B7280]">
            Ou fale diretamente:{" "}
            <a href="https://discord.gg/mediarate" className="text-[#818CF8]">
              Discord
            </a>{" "}
            ·{" "}
            <a href="mailto:feedback@mediarate.app" className="text-[#818CF8]">
              Email
            </a>
          </p>
        </>
      )}
    </div>
  );
}
