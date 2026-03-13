import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TransactionFlowPage } from "./pages/TransactionFlowPage";
import { SuspiciousActivityPage } from "./pages/SuspiciousActivityPage";
import { WalletAnalyzerPage } from "./pages/WalletAnalyzerPage";
import { AlertMonitoringPage } from "./pages/AlertMonitoringPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LoginPage,
  },
  {
    path: "/app",
    Component: Layout,
    children: [
      { index: true, Component: DashboardPage },
      { path: "flow", Component: TransactionFlowPage },
      { path: "suspicious", Component: SuspiciousActivityPage },
      { path: "wallet", Component: WalletAnalyzerPage },
      { path: "alerts", Component: AlertMonitoringPage },
    ],
  },
]);
