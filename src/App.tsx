import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ChatProvider, useChat } from "@/contexts/ChatContext";
import BackgroundWrapper from "@/components/BackgroundWrapper";
import AIChatPanel from "@/components/AIChatPanel";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ClassPage from "./pages/ClassPage";
import AnnouncementDetailPage from "./pages/AnnouncementDetailPage";
import NoteEditorPage from "./pages/NoteEditorPage";
import NoteSetupPage from "./pages/NoteSetupPage";
import SettingsPage from "./pages/SettingsPage";
import EventCreatePage from "./pages/EventCreatePage";
import EventDetailPage from "./pages/EventDetailPage";
import MeetingRecordingPage from "./pages/MeetingRecordingPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppLayout() {
  const { chatOpen } = useChat();

  return (
    <div className="flex min-h-screen w-full">
      <div
        className="flex-1 min-w-0 transition-all duration-300 ease-in-out"
        style={{ marginRight: chatOpen ? "360px" : "0" }}
      >
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
            <Route path="/class/:className/event/:eventId" element={<EventDetailPage />} />
            <Route path="/class/:className/event/:eventId/edit" element={<EventCreatePage />} />
            <Route path="/class/:className/recording/new" element={<MeetingRecordingPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BackgroundWrapper>
      </div>

      {/* Ryu chat panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[360px] z-40 transition-transform duration-300 ease-in-out ${
          chatOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <AIChatPanel />
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ChatProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        </TooltipProvider>
      </ChatProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
