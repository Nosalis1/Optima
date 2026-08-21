import { type DashboardData } from '@/app/domain';
import { Card } from '@/app/components/cards/card';
import { SmallAlert } from '@/src/components/SmallAlert';
import { SmallTable } from '@/src/components/tables/SmallTable';

type Props = {
    data: DashboardData;
};

function AlertsTable({ data }: { data: DashboardData['alerts'] }) {
    return (
        <Card header={{ title: "Live Alerts", description: "Stream" }}>
            {
                data.map((alert, index) => (
                    <SmallAlert title={alert.title} timestamp={alert.timestamp} type={alert.severity} key={index} />
                ))
            }
        </Card>
    );
}

function ImpactTable({ data }: { data: DashboardData['impactEndpoints'] }) {

    const remapData = data.map((item) => ({
        "METHOD": item.method,
        "ROUTE": item.route,
        "RPS": item.rps,
        "P95": `${item.p95?.toFixed(2)} ms`,
        "ERR%": `${item.errorRate?.toFixed(2)} %`,
        "STATUS": item.status
    }));

    return (
        <Card header={{ title: "Top routes by Impact", description: "Volume" }}>
            <SmallTable
                columns={["METHOD", "ROUTE", "RPS", "P95", "ERR%", "STATUS"]}
                data={remapData}
            />
        </Card>
    );
}

export default function DashboardTables({ data }: Props) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
            <div className="col-span-3 md:col-span-3">
                <ImpactTable data={data.impactEndpoints} />
            </div>
            <div className="col-span-2 md:col-span-2">
                <AlertsTable data={data.alerts} />
            </div>
        </div>
    );
}