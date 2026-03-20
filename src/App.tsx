import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import BackgroundWrapper from "@/components/BackgroundWrapper";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ClassPage from "./pages/ClassPage";
import AnnouncementDetailPage from "./pages/AnnouncementDetailPage";
import NoteEditorPage from "./pages/NoteEditorPage";
import NoteSetupPage from "./pages/NoteSetupPage";
import SettingsPage from "./pages/SettingsPage";
import EventCreatePage from "./pages/EventCreatePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <BackgroundWrapper>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/class/:className" element={<ClassPage />} />
              <Route path="/class/:className/announcement/:announcementId" element={<AnnouncementDetailPage />} />
              <Route path="/class/:className/note/new" element={<NoteSetupPage />} />
              <Route path="/class/:className/note/:noteId" element={<NoteEditorPage />} />
              <Route path="/class/:className/event/new" element={<EventCreatePage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BackgroundWrapper>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
