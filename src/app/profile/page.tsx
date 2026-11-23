import type { Metadata } from "next";
import { Suspense } from "react";
import { NicknameForm } from "@/components/players/nickname-form";
import { Cabinet } from "@/components/games/cabinet";
import { CoinIcon } from "@/components/games/icons";
import { safeRoomNext } from "@/lib/rooms/rules";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { noteAccess } from "@/server/services/access";
import { readOwnProfile } from "@/server/services/profile";

export const metadata: Metadata = {
  title: "Profilo",
  description: "Nickname temporaneo collegato a una sessione anonima.",
};

export default function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const configured = getSupabasePublicEnv() !== null;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
      <Cabinet
        title="Profilo"
        kicker={
          <>
            <span className="sr-only">Nickname temporaneo</span>
            <CoinIcon />
          </>
        }
      >
      <p className="arcade-copy">
        Nessuna email e nessuna password. La sessione anonima non dimostra
        l&apos;identità di una persona. Puoi cambiare nickname: non conserviamo
        lo storico.
      </p>
      <Suspense
        fallback={
          <p role="status" className="arcade-hint">
            Caricamento profilo…
          </p>
        }
      >
        {configured ? (
          <ConfiguredProfile searchParams={searchParams} />
        ) : (
          <PlainProfile searchParams={searchParams} />
        )}
      </Suspense>
      </Cabinet>
    </main>
  );
}

async function PlainProfile({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  await noteAccess("visit");
  return (
    <NicknameForm
      nickname=""
      configured={false}
      next={safeNext(next)}
    />
  );
}

async function ConfiguredProfile({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const [{ next }, profile] = await Promise.all([
    searchParams,
    readOwnProfile(),
    noteAccess("visit"),
  ]);
  return (
    <>
      {profile.unavailable ? (
        <p role="alert" className="mt-6 max-w-2xl text-muted">
          La sessione c&apos;è, ma il profilo non è leggibile. Applica la
          migrazione dei giocatori prima di salvarlo.
        </p>
      ) : null}
      <NicknameForm
        nickname={profile.nickname ?? ""}
        configured
        next={safeNext(next)}
      />
    </>
  );
}

function safeNext(value: string | string[] | undefined): string {
  return safeRoomNext(value) ?? "";
}
