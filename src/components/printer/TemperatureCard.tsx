import type { ReactNode } from "react";
import type { Temperature } from "@/lib/printer/types";
import { formatTemp } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface TemperatureCardProps {
  title: string;
  icon: ReactNode;
  temp: Temperature;
  /** Above this, we warn that it's hot to touch */
  hotThreshold: number;
  /** Scale for the bar when the heater is off */
  maxScale: number;
}

const TOLERANCE = 3;

function describe(temp: Temperature, hotThreshold: number): { text: string; tone: string } {
  if (temp.target > 0) {
    if (temp.current < temp.target - TOLERANCE) return { text: "Varmer opp…", tone: "text-accent" };
    if (temp.current > temp.target + TOLERANCE) return { text: "Kjøler ned mot mål", tone: "text-info" };
    return { text: "Holder temperaturen", tone: "text-ok" };
  }
  if (temp.current >= hotThreshold) return { text: "Varm – ikke ta på!", tone: "text-warn" };
  return { text: "Av", tone: "text-muted" };
}

export function TemperatureCard({ title, icon, temp, hotThreshold, maxScale }: TemperatureCardProps) {
  const status = describe(temp, hotThreshold);
  const heating = temp.target > 0;
  const barValue = heating ? temp.current / temp.target : temp.current / maxScale;

  return (
    <Card title={title} icon={icon}>
      <div className="flex items-end justify-between gap-3">
        <div className="tabular text-5xl font-semibold tracking-tight">{formatTemp(temp.current)}</div>
        <div className="pb-1 text-right text-sm text-muted">
          {heating ? (
            <>
              mål <span className="tabular font-medium text-text">{formatTemp(temp.target)}</span>
            </>
          ) : (
            "ingen varme"
          )}
        </div>
      </div>
      <div className="mt-4">
        <ProgressBar value={barValue} tone={heating ? "accent" : temp.current >= hotThreshold ? "warn" : "info"} label={`${title} temperatur`} />
      </div>
      <p className={`mt-3 text-sm font-medium ${status.tone}`}>{status.text}</p>
    </Card>
  );
}
