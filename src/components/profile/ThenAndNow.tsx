"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Clock, Camera, ArrowLeftRight } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface ThenAndNowProps {
  currentPhotoUrl: string | null;
  pastPhotoUrl: string | null;
  pastPhotoPeriod: string | null;
  personName: string;
}

export function ThenAndNow({
  currentPhotoUrl,
  pastPhotoUrl,
  pastPhotoPeriod,
  personName,
}: ThenAndNowProps) {
  const [flipped, setFlipped] = useState(false);
  const initials = getInitials(personName);

  const PhotoSlot = ({
    src,
    label,
    period,
    isNow,
  }: {
    src: string | null;
    label: string;
    period?: string | null;
    isNow?: boolean;
  }) => (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`relative w-28 h-28 md:w-36 md:h-36 rounded-2xl overflow-hidden shadow-lg ring-4 ${
          isNow ? "ring-amber-300" : "ring-stone-200"
        } photo-hover`}
      >
        {src ? (
          <Image
            src={src}
            alt={`${label} photo of ${personName}`}
            fill
            className="object-cover"
            sizes="144px"
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center text-2xl font-bold ${
              isNow
                ? "bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700"
                : "bg-gradient-to-br from-stone-100 to-stone-200 text-stone-500"
            }`}
          >
            {isNow ? (
              <Camera className="w-10 h-10 text-amber-300" />
            ) : (
              <Clock className="w-10 h-10 text-stone-300" />
            )}
          </div>
        )}
        {isNow && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-500/80 to-transparent py-1.5 text-center">
            <span className="text-white text-[10px] font-semibold tracking-wide uppercase">Now</span>
          </div>
        )}
        {!isNow && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent py-1.5 text-center">
            <span className="text-white text-[10px] font-semibold tracking-wide uppercase">Then</span>
          </div>
        )}
      </div>
      {period && !isNow && (
        <p className="text-xs text-stone-400 text-center">{period}</p>
      )}
      {isNow && (
        <p className="text-xs text-stone-400 text-center">Current</p>
      )}
    </div>
  );

  // Only show then & now section if at least one photo exists
  const hasAnyPhoto = currentPhotoUrl || pastPhotoUrl;

  if (!hasAnyPhoto) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center shadow-md ring-4 ring-amber-200">
          <span className="text-4xl md:text-5xl font-bold text-amber-700">{initials}</span>
        </div>
        <p className="text-xs text-stone-400">No photo added yet</p>
      </div>
    );
  }

  // Only current photo — no then/now split
  if (!pastPhotoUrl && currentPhotoUrl) {
    return <PhotoSlot src={currentPhotoUrl} label="Current" isNow />;
  }

  // Only past photo
  if (!currentPhotoUrl && pastPhotoUrl) {
    return <PhotoSlot src={pastPhotoUrl} label="Past" period={pastPhotoPeriod} />;
  }

  // Both photos — show side by side with divider
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-end gap-3 md:gap-5">
        <AnimatePresence mode="wait">
          {!flipped ? (
            <motion.div
              key="then"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex flex-col items-center gap-2"
            >
              <PhotoSlot src={pastPhotoUrl} label="Past" period={pastPhotoPeriod} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Divider */}
        <div className="flex flex-col items-center gap-1 pb-6">
          <div className="w-[2px] h-20 bg-gradient-to-b from-transparent via-amber-300 to-transparent" />
          <button
            onClick={() => setFlipped(!flipped)}
            className="p-1.5 rounded-full bg-amber-100 hover:bg-amber-200 transition-colors"
            title="Compare photos"
            aria-label="Toggle photo view"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600" />
          </button>
          <div className="w-[2px] h-20 bg-gradient-to-b from-transparent via-amber-300 to-transparent" />
        </div>

        <AnimatePresence mode="wait">
          {!flipped ? (
            <motion.div
              key="now"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <PhotoSlot src={currentPhotoUrl} label="Current" isNow />
            </motion.div>
          ) : (
            <motion.div
              key="full"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="flex gap-4">
                <PhotoSlot src={pastPhotoUrl} label="Past" period={pastPhotoPeriod} />
                <PhotoSlot src={currentPhotoUrl} label="Current" isNow />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
