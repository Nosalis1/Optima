interface UserJourney {
    name: string;
    probability: number;
    endpoints: string[];
}

const journeys: UserJourney[] = [
    {
        name: "browse",
        probability: 0.55,
        endpoints: [
            "/api/products",
            "/api/products",
            "/api/users",
        ]
    },
    {
        name: "shopping",
        probability: 0.30,
        endpoints: [
            "/api/auth/login",
            "/api/products",
            "/api/orders",
        ]
    },
    {
        name: "admin",
        probability: 0.10,
        endpoints: [
            "/api/users",
            "/api/orders",
        ]
    },
    {
        name: "health",
        probability: 0.05,
        endpoints: [
            "/health",
            "/metrics",
        ]
    }
];

export function pickJourney() {
    let value = Math.random();
    for (const journey of journeys) {
        value -= journey.probability;
        if (value <= 0) {
            return journey;
        }
    }
    return journeys[0];
}