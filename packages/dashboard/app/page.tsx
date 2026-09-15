"use client";
import DashboardPage from "./sections/dashboard/index";
import AnalyticsPage from "./sections/analytics/index";
import HealthPage from "./sections/health/index";
import SessionsPage from "./sections/sessions/index";
import ConfigurationPage from "./sections/configuration";
import { useGate } from "./context/gate.context";

export default function Page() {
  const {
    activeTab
  } = useGate();

  return (
    <>
      {activeTab === "/" && <DashboardPage />}
      {activeTab === "/analytics" && <AnalyticsPage />}
      {activeTab === "/health" && <HealthPage />}
      {activeTab === "/sessions" && <SessionsPage />}
      {activeTab === "/configuration" && <ConfigurationPage />}
    </>
  );
}