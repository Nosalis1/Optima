import { Hero, HeroContent } from "@/app/components/cards/hero";
import { useConnection } from "@/app/context/connection.context";
import type { ClientConfig } from "@/app/domain/config.types";

type SectionValue = false | Record<string, unknown>;

const str = (value: unknown): string => {
    if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
    if (typeof value === "boolean") return value ? "true" : "false";
    if (value === null || value === undefined) return "";
    return String(value);
};

const toValues = (section: Record<string, unknown>): Record<string, string> =>
    Object.fromEntries(Object.entries(section).map(([key, value]) => [key, str(value)]));

function sections(configuration: ClientConfig): Array<[string, SectionValue]> {
    return [
        ["General", {
            applicationVersion: configuration.applicationVersion,
            tickIntervalMs: configuration.tickIntervalMs,
            publishIntervalMs: configuration.publisher.intervalMs,
        }],
        ["Collection", configuration.collection],
        ["Thresholds", configuration.thresholds],
        ["Cache", configuration.cache],
        ["Dashboard", configuration.dashboard],
        ["Persistence", configuration.persistence],
        ["Incidents", configuration.incidents],
        ["Correlation", configuration.correlation],
        ["Simulation", configuration.simulation],
    ];
}

export default function ConfigurationPage() {
    const { configuration } = useConnection();

    if (!configuration) {
        return <p className="m-4 text-sm text-accent-soft">Configuration not received yet.</p>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 m-4">
            {sections(configuration).map(([title, section]) => (
                <Hero header={{ title }} key={title}>
                    {section === false
                        ? <p className="text-sm text-accent-soft">Disabled</p>
                        : <HeroContent variant="default" values={toValues(section)} />}
                </Hero>
            ))}
        </div>
    );
}
