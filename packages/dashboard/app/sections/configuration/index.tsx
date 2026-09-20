import { Hero, HeroContent } from "@/app/components/cards/hero";
import { useConnection } from "@/app/context/connection.context";

export default function ConfigurationPage() {
    const {
        configuration
    } = useConnection();

    const excluded = `[${(configuration?.excludePaths || []).join("], [")}]`;

    const str = (value: any) => {
        if (typeof value === "boolean") {
            return value ? "true" : "false";
        }
        return value?.toString() || "";
    };

    return (
        <div className="flex flex-col gap-4 m-4">
            <Hero header={{ title: "Main" }}>
                <HeroContent
                    variant="default"
                    values={{
                        applicationVersion: str(configuration?.applicationVersion),
                        dashboardPath: str(configuration?.dashboardPath),
                        excludedPaths: str(excluded),
                        tickIntervalMs: str(configuration?.tickIntervalMs),
                        consoleLog: str(configuration?.consoleLog),
                        ringBufferSize: str(configuration?.ringBufferSize),
                        alertBufferSize: str(configuration?.alertBufferSize),
                    }}
                />

            </Hero>

            <Hero header={{ title: "Simulation" }}>
                {
                    configuration?.simulation !== false ? (
                        <HeroContent
                            variant='default'
                            values={{
                                "intervalMs": str(configuration?.simulation.intervalMs),
                                "requestsPerTick": str(configuration?.simulation.requestsPerTick)
                            }}
                        />
                    ) :
                        <p>No simulation configured</p>
                }
            </Hero>

            <Hero header={{ title: "Publisher" }}>
                <HeroContent
                    variant='default'
                    values={{
                        "intervalMs": str(configuration?.publisher.intervalMs),
                        "slowLatencyThresholdMs": str(configuration?.publisher.slowLatencyThresholdMs),
                        "eventLoopLagThresholdMs": str(configuration?.publisher.eventLoopLagThresholdMs),
                        "eventLoopResolutionMs": str(configuration?.publisher.eventLoopResolutionMs)
                    }}
                />
            </Hero>

            <Hero header={{ title: "Persistence" }}>
                {
                    configuration?.persistence !== false ? (
                        <HeroContent
                            variant='default'
                            values={{
                                "baseDir": str(configuration?.persistence?.baseDir),
                                "maxBufferSize": str(configuration?.persistence.maxBufferSize),
                                "persistRawRequests": str(configuration?.persistence.persistRawRequests),
                                "archiveIntervalMs": str(configuration?.persistence.archiveIntervalMs)
                            }}
                        />
                    ) :
                        <p>No persistence configured</p>
                }
            </Hero>
        </div>
    );
}