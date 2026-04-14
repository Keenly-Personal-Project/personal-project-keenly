import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Trash2, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { useChat } from "@/contexts/ChatContext";
import ryuAvatar from "@/assets/ryu-avatar.png";

type Msg = { role: "user" | "assistant"; content: string; images?: string[] };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const STORAGE_KEY = "ryu_chat_messages";

function loadMessages(): Msg[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessages(msgs: Msg[]) {
  // Don't save base64 images to localStorage (too large)
  const stripped = msgs.map(m => ({
    ...m,
    images: m.images?.map(img =>
      img.startsWith("data:") ? "[image]" : img
    ),
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
}

export default function AIChatPanel() {
  const { setChatOpen } = useChat();
  const [messages, setMessages] = useState<Msg[]>(loadMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: "user", content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    try {
      // Send only content (no images) to the API
      const apiMessages = allMessages.map(m => ({ role: m.role, content: m.content }));

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        toast({ title: "AI Error", description: err.error, variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const contentType = resp.headers.get("content-type") || "";

      // Check if this is an image response (JSON) or streaming text (SSE)
      if (contentType.includes("application/json")) {
        const data = await resp.json();

        if (data.type === "image" && data.images?.length > 0) {
          const assistantMsg: Msg = {
            role: "assistant",
            content: data.content || "Here's the image I generated:",
            images: data.images,
          };
          setMessages(prev => [...prev, assistantMsg]);
        } else if (data.error) {
          toast({ title: "AI Error", description: data.error, variant: "destructive" });
        } else {
          setMessages(prev => [...prev, { role: "assistant", content: data.content || "Done!" }]);
        }
      } else {
        // Streaming text response
        if (!resp.body) throw new Error("No response body");

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantSoFar = "";

        const upsert = (chunk: string) => {
          assistantSoFar += chunk;
          const content = assistantSoFar;
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content } : m));
            }
            return [...prev, { role: "assistant", content }];
          });
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, nl);
            buffer = buffer.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") break;
            try {
              const parsed = JSON.parse(json);
              const c = parsed.choices?.[0]?.delta?.content;
              if (c) upsert(c);
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to get AI response", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-full border-l border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <img src={ryuAvatar} alt="Ryu" className="h-6 w-6 rounded-full object-cover" />
          <h3 className="text-sm font-semibold text-foreground">Ryu</h3>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearMessages} title="Clear chat">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setChatOpen(false)} title="Close">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <img src={ryuAvatar} alt="Ryu" className="h-12 w-12 rounded-full object-cover" />
            <p className="text-sm font-medium text-foreground mt-3">Hi! I'm Ryu</p>
            <p className="text-xs text-muted-foreground mt-1">Your AI study assistant — ask me anything</p>
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <ImageIcon className="h-3 w-3" />
              <span>I can also generate images! Try "draw me a..."</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <img src={ryuAvatar} alt="Ryu" className="h-6 w-6 rounded-full object-cover shrink-0 mt-1" />
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {/* Render images */}
                  {msg.images && msg.images.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {msg.images.map((img, j) =>
                        img === "[image]" ? (
                          <div key={j} className="text-xs text-muted-foreground italic flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" /> Image (not cached)
                          </div>
                        ) : (
                          <img
                            key={j}
                            src={img}
                            alt={`Generated image ${j + 1}`}
                            className="rounded-md max-w-full border border-border"
                          />
                        )
                      )}
                    </div>
                  )}
                  {msg.role === "assistant" && isLoading && i === messages.length - 1 && !msg.images?.length && (
                    <span className="inline-block w-1.5 h-4 bg-foreground/50 ml-0.5 animate-pulse" />
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-2 justify-start">
                <img src={ryuAvatar} alt="Ryu" className="h-6 w-6 rounded-full object-cover shrink-0 mt-1" />
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything... or 'draw me a...'"
            className="min-h-[40px] max-h-[120px] resize-none text-sm"
            rows={1}
          />
          <Button
            size="icon"
            onClick={send}
            disabled={!input.trim() || isLoading}
            className="shrink-0 h-10 w-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
