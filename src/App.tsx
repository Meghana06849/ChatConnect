import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ChatProvider } from "@/contexts/ChatContext";
import { LoveCoinsProvider } from "@/contexts/LoveCoinsContext";
import { CallProvider } from "@/contexts/CallContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { IncomingCallUI } from "@/components/features/IncomingCallUI";
import { ActiveCallUI } from "@/components/features/ActiveCallUI";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import MomentsPage from "./pages/MomentsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ChatProvider>
        <LoveCoinsProvider>
          <CallProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <IncomingCallUI />
              <ActiveCallUI />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/moments" element={<MomentsPage />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </CallProvider>
        </LoveCoinsProvider>
      </ChatProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
