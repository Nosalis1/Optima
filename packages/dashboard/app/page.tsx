"use client";
import DashboardPage from "./sections/dashboard/index";
import AnalyticsPage from "./sections/analytics/index";
import HealthPage from "./sections/health/index";
import { useGate } from "./context/gate.context";
import ConfigurationPage from "./sections/configuration";

export default function Page() {
  const {
    activeTab
  } = useGate();

  return (
    <>
      {activeTab === "/" && <DashboardPage />}
      {activeTab === "/analytics" && <AnalyticsPage />}
      {activeTab === "/health" && <HealthPage />}
      {activeTab === "/configuration" && <ConfigurationPage />}
    </>
  );
}