import { isAndroidPilot } from "@/mobile/native";
import { NotificationDetails } from "@/mobile/notification-details";
import { TelemetryReporter } from "@/telemetry/telemetry-reporter";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { routers } from "./router";

const queryClient = new QueryClient();

const App = () => {
  const router = createBrowserRouter(routers);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RouterProvider router={router} />
        {isAndroidPilot ? <NotificationDetails /> : null}
        {isAndroidPilot ? <TelemetryReporter /> : null}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
