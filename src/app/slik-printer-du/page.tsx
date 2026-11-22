import Link from "next/link";
import type { Metadata } from "next";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { readStore } from "@/server/store";

/** Content depends on the admin settings, so it must be rendered on each request. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Slik printer du noe nytt – 3D Print Portal" };

type Who = "deg" | "sammen" | "voksen";

const WHO: Record<Who, { label: string; className: string }> = {
  deg: { label: "Du gjør", className: "bg-accent/15 text-accent" },
  sammen: { label: "Sammen med en voksen", className: "bg-info/15 text-info" },
  voksen: { label: "En voksen gjør", className: "bg-ok/15 text-ok" },
};

interface Step {
  emoji: string;
  title: string;
  who: Who;
  body: React.ReactNode;
  tips?: string[];
}

/** Steps when the admin approves each file. */
const APPROVAL_STEPS: Step[] = [
  {
    emoji: "🔎",
    title: "Finn noe kult på MakerWorld",
    who: "deg",
    body: (
      <>
        Gå til{" "}
        <a href="https://makerworld.com" target="_blank" rel="noreferrer" className="font-medium text-accent underline">
          makerworld.com
        </a>{" "}
        og søk etter noe du har lyst på, for eksempel «fidget», «dinosaur» eller «nøkkelring».
      </>
    ),
    tips: [
      "Velg ting som tar under 2 timer de første gangene.",
      "Se etter modeller med mange likes og bilder fra andre som har printet dem.",
      "Printeren kan lage ting opptil 32 × 32 cm og 38 cm høyt.",
    ],
  },
  {
    emoji: "🙋",
    title: "Vis den til en voksen",
    who: "sammen",
    body: "Vis modellen du fant. Dere bestemmer sammen om den skal printes.",
  },
  {
    emoji: "⬇️",
    title: "Last ned filen",
    who: "sammen",
    body: (
      <>
        Trykk <strong>Download</strong> på MakerWorld og lagre filen (<code>.3mf</code> eller <code>.stl</code>) på PC-en.
      </>
    ),
  },
  {
    emoji: "🧰",
    title: "Åpne den i OrcaSlicer",
    who: "sammen",
    body: (
      <>
        Dra filen inn i <strong>OrcaSlicer</strong>. Sjekk at printeren er <strong>Elegoo Neptune 4 Plus</strong> og at filamentet er{" "}
        <strong>PLA</strong>.
      </>
    ),
    tips: ["Spør OrcaSlicer om du vil bruke innstillingene fra filen? Velg å bare laste inn selve modellen."],
  },
  {
    emoji: "🔪",
    title: "Trykk «Slice plate»",
    who: "sammen",
    body: "OrcaSlicer deler modellen opp i tynne lag og viser hvor lang tid det tar og hvor mye plast som går med.",
  },
  {
    emoji: "📤",
    title: "Send filen til printeren",
    who: "voksen",
    body: (
      <>
        Trykk <strong>Print plate</strong> og velg <strong>Upload</strong> (bare last opp). <em>Ikke</em> «Upload and Print». Filen skal
        godkjennes i portalen først.
      </>
    ),
  },
  {
    emoji: "⭐",
    title: "Godkjenn den i portalen",
    who: "voksen",
    body: (
      <>
        Gå til <strong>Admin → Filer</strong>, finn den nye filen og trykk <strong>Godkjenn</strong>. Gi den et navn og et ikon.
      </>
    ),
  },
  {
    emoji: "🚀",
    title: "Trykk på den og start!",
    who: "deg",
    body: (
      <>
        Nå dukker den opp under <strong>«Hva vil du printe?»</strong> på siden din. Sjekk at platen er tom, kryss av på sjekklisten og trykk{" "}
        <strong>Start utskrift</strong>.
      </>
    ),
  },
];

/** Steps when Tobias may start any file himself. */
const SELF_STEPS: Step[] = [
  { ...APPROVAL_STEPS[0], tips: [...(APPROVAL_STEPS[0].tips ?? []), "Usikker på om noe passer? Spør en voksen – det er helt lov! 😄"] },
  { ...APPROVAL_STEPS[2], who: "deg" },
  { ...APPROVAL_STEPS[3], who: "deg" },
  {
    ...APPROVAL_STEPS[4],
    who: "deg",
    tips: ["Sjekk tiden. Tar det mer enn noen timer? Velg noe mindre, eller spør en voksen først."],
  },
  {
    emoji: "📤",
    title: "Send filen til printeren",
    who: "deg",
    body: (
      <>
        Trykk <strong>Print plate</strong> og velg <strong>Upload</strong> (bare last opp). Da får du sjekklisten i portalen før printeren starter.
      </>
    ),
  },
  {
    emoji: "🚀",
    title: "Trykk på den og start!",
    who: "deg",
    body: (
      <>
        Filen ligger nå <strong>øverst</strong> under «Hva vil du printe?» med et <strong>Ny!</strong>-merke. Sjekk at platen er tom, kryss av og trykk{" "}
        <strong>Start utskrift</strong>.
      </>
    ),
  },
];

export default async function GuidePage() {
  const { settings } = await readStore();
  const { canStartAnyFile, requireAdult } = settings.tobias;
  const steps = canStartAnyFile ? SELF_STEPS : APPROVAL_STEPS;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link href="/" className="rounded-full bg-surface-2 px-4 py-2 text-sm font-medium text-muted hover:text-text">
          ← Tilbake
        </Link>
        <ThemeToggle />
      </div>

      <h1 className="text-3xl font-bold sm:text-4xl">Slik printer du noe nytt 🖨️</h1>
      <p className="mt-2 text-lg text-muted">Fra en kul modell på nettet til ferdig utskrift i hånda – i {steps.length} steg.</p>

      <ol className="mt-8 space-y-4">
        {steps.map((step, i) => {
          const who = WHO[step.who];
          return (
            <li key={step.title} className="flex gap-4 rounded-3xl border border-line bg-surface/80 p-5 shadow-sm">
              <div className="flex shrink-0 flex-col items-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-2xl">{step.emoji}</div>
                <div className="tabular mt-2 text-sm font-semibold text-muted">{i + 1}</div>
              </div>
              <div className="min-w-0">
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${who.className}`}>{who.label}</span>
                <h2 className="mt-1.5 text-xl font-semibold">{step.title}</h2>
                <p className="mt-1 leading-relaxed text-muted">{step.body}</p>
                {step.tips && (
                  <ul className="mt-3 space-y-1 rounded-2xl bg-surface-2/70 px-4 py-3 text-sm">
                    {step.tips.map((tip) => (
                      <li key={tip}>💡 {tip}</li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 rounded-3xl border border-warn/30 bg-warn/10 p-5">
        <h2 className="font-semibold text-warn">Husk alltid</h2>
        <ul className="mt-2 space-y-1">
          <li>🧽 Byggeplaten skal være tom før du starter.</li>
          {requireAdult ? (
            <li>🙋 En voksen skal være hjemme og vite at printeren går.</li>
          ) : (
            <li>📱 Si fra til en voksen når du starter en utskrift, og sjekk printeren innimellom.</li>
          )}
          <li>🔥 Ikke ta på dysen eller platen – de er veldig varme.</li>
          <li>⏳ La utskriften kjøle seg ned et par minutter før du tar den av.</li>
        </ul>
      </div>

      <div className="mt-8 text-center">
        <Link href="/" className="inline-flex h-14 items-center rounded-2xl bg-accent px-8 text-lg font-semibold text-on-accent shadow-lg shadow-accent/20 hover:brightness-110">
          Tilbake til printeren
        </Link>
      </div>
    </div>
  );
}
