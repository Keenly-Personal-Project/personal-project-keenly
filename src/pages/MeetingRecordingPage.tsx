import { useParams, useNavigate } from "react-router-dom";
import { useEscapeBack } from "@/hooks/useEscapeBack";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mic, Upload, Sparkles, Send, Square, Pause, Play, Trash2, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useState, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";

const MeetingRecordingPage = () => {
  const { className } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  useEscapeBack(`/class/${className}?tab=Meeting+Recordings`);

  const [mode, setMode] = useState<"idle" | "recording" | "paused" | "recorded" | "uploaded">("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const displayName = className
    ? className.charAt(0).toUpperCase() + className.slice(1)
    : "";

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setMode("recording");
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      toast.error("Couldn't access microphone. Please allow permission.");
    }
  }, []);

  const pauseRecording = () => {
    mediaRecorderRef.current?.pause();
    if (timerRef.current) clearInterval(timerRef.current);
    setMode("paused");
  };

  const resumeRecording = () => {
    mediaRecorderRef.current?.resume();
    timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    setMode("recording");
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setMode("recorded");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["audio/", "video/"];
    if (!allowed.some((t) => file.type.startsWith(t))) {
      toast.error("Please upload an audio or video file.");
      return;
    }
    setUploadedFile(file);
    setAudioBlob(null);
    setMode("uploaded");
    toast.success(`Uploaded: ${file.name}`);
  };

  const handleSummarize = async () => {
    if (!audioBlob && !uploadedFile) {
      toast.error("No recording or upload to summarize.");
      return;
    }
    setIsSummarizing(true);
    // Simulate AI summary for now
    await new Promise((r) => setTimeout(r, 2000));
    const summaryText =
      "This meeting covered the following key points:\n\n• Project timeline was discussed and deadlines were confirmed\n• Action items were assigned to team members\n• Next meeting scheduled for follow-up\n\n(AI summary will be powered by Lovable AI once fully integrated.)";
    setDescription((prev) => prev.trim() ? `${prev}\n\n${summaryText}` : summaryText);
    setIsSummarizing(false);
    toast.success("Summary generated!");
  };

  const handlePost = async () => {
    if (!title.trim()) {
      toast.error("Please add a title before posting.");
      return;
    }
    if (!audioBlob && !uploadedFile) {
      toast.error("No recording or upload to post.");
      return;
    }
    if (!user) {
      toast.error("You must be logged in to post.");
      return;
    }
    setIsPosting(true);
    setUploadProgress(0);

    // Simulate progress during upload
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 400);

    try {
      const mediaFile = uploadedFile || (audioBlob ? new File([audioBlob], "recording.webm", { type: "audio/webm" }) : null);
      if (!mediaFile) return;

      // Upload to storage
      const fileExt = mediaFile.name.split(".").pop() || "webm";
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("meeting-recordings")
        .upload(filePath, mediaFile);

      if (uploadError) throw uploadError;
      setUploadProgress(80);

      const { data: urlData } = supabase.storage
        .from("meeting-recordings")
        .getPublicUrl(filePath);

      // Insert DB record
      const { error: dbError } = await (supabase.from as any)("meeting_recordings").insert({
        user_id: user.id,
        class_name: className || "",
        title: title.trim(),
        description: description.trim(),
        media_url: urlData.publicUrl,
        media_type: mediaFile.type,
        media_name: uploadedFile?.name || "Recording",
        duration: recordingTime,
      });

      if (dbError) throw dbError;

      setUploadProgress(100);
      await new Promise((r) => setTimeout(r, 400));

      toast.success("Recording posted successfully!");
      navigate(`/class/${className}?tab=Meeting+Recordings`);
    } catch (err: any) {
      toast.error(err.message || "Failed to post recording.");
    } finally {
      clearInterval(progressInterval);
      setIsPosting(false);
      setUploadProgress(0);
    }
  };

  const hasMedia = mode === "recorded" || mode === "uploaded";

  const audioBlobUrl = useMemo(() => audioBlob ? URL.createObjectURL(audioBlob) : null, [audioBlob]);
  const uploadedFileUrl = useMemo(() => uploadedFile ? URL.createObjectURL(uploadedFile) : null, [uploadedFile]);

  const deleteMedia = () => {
    setAudioBlob(null);
    setUploadedFile(null);
    setRecordingTime(0);
    setMode("idle");
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Back nav */}
        <button
          onClick={() => navigate(`/class/${className}?tab=Meeting+Recordings`)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm" style={{ fontFamily: "'Courier New', monospace" }}>
            Back to {displayName}
          </span>
        </button>

        <h1
          className="text-3xl font-bold text-foreground"
          style={{ fontFamily: "'Amatic SC', cursive" }}
        >
          New Meeting Recording
        </h1>

        {/* Main card */}
        <Card className="border border-foreground/30 bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Create a Recording</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Week 5 Lecture Summary"
                className="w-full rounded-lg border border-foreground/30 bg-muted/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Action buttons row — only show when no media yet */}
            {!hasMedia && mode !== "recording" && mode !== "paused" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={startRecording}
                  className="flex items-center gap-3 rounded-xl border border-foreground/30 bg-muted/50 p-4 hover:bg-muted transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <Mic className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">Record</p>
                    <p className="text-xs text-muted-foreground">Use your microphone</p>
                  </div>
                </button>

                <label className="flex items-center gap-3 rounded-xl border border-foreground/30 bg-muted/50 p-4 hover:bg-muted transition-colors cursor-pointer">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">Upload</p>
                    <p className="text-xs text-muted-foreground">Audio or video file</p>
                  </div>
                  <input
                    type="file"
                    accept="audio/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* Recording controls */}
            {(mode === "recording" || mode === "paused") && (
              <div className="flex items-center justify-center gap-4 py-4 rounded-xl border border-foreground/30 bg-muted/50">
                <div className="flex items-center gap-2">
                  {mode === "recording" && (
                    <span className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
                  )}
                  <span className="text-lg font-mono font-semibold text-foreground">
                    {formatTime(recordingTime)}
                  </span>
                </div>
                <div className="flex gap-2">
                  {mode === "recording" ? (
                    <Button size="sm" variant="outline" onClick={pauseRecording}>
                      <Pause className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={resumeRecording}>
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={stopRecording}>
                    <Square className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Media status */}
            {hasMedia && (
              <div className="rounded-xl border border-foreground/30 bg-muted/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {mode === "recorded"
                        ? `Recording ready (${formatTime(recordingTime)})`
                        : `Uploaded: ${uploadedFile?.name}`}
                    </span>
                  </div>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-8 px-2" onClick={deleteMedia}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {audioBlobUrl && (
                  <audio controls className="w-full" src={audioBlobUrl} />
                )}
                {uploadedFile && uploadedFileUrl && (
                  uploadedFile.type.startsWith("video/") ? (
                    <video controls className="w-full rounded-lg" src={uploadedFileUrl} />
                  ) : (
                    <audio controls className="w-full" src={uploadedFileUrl} />
                  )
                )}
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for this recording..."
                className="w-full rounded-lg border border-foreground/30 bg-muted/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[120px] resize-none"
              />
            </div>

            {/* AI Summary button */}
            <Button
              onClick={handleSummarize}
              disabled={!hasMedia || isSummarizing}
              variant="outline"
              className="w-full gap-2 border-foreground/30"
            >
              <Sparkles className="h-4 w-4" />
              {isSummarizing ? "Generating Summary..." : "Generate AI Summary"}
            </Button>

            {/* Post button */}
            <Button
              onClick={handlePost}
              disabled={!hasMedia || !title.trim() || isPosting}
              className="w-full gap-2"
            >
              <Send className="h-4 w-4" />
              {isPosting ? "Posting..." : "Post Recording"}
            </Button>
          </CardContent>
        </Card>

        {/* Upload overlay */}
        {isPosting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-foreground/10 bg-card p-8 shadow-lg w-[320px]">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">
                {uploadProgress < 80 ? "Uploading media..." : uploadProgress < 100 ? "Saving recording..." : "Done!"}
              </p>
              <Progress value={uploadProgress} className="h-2 w-full" />
              <p className="text-xs text-muted-foreground">{Math.round(uploadProgress)}%</p>
            </div>
          </div>
        )}
      </main>
    </div>
    </div>
  );
};

export default MeetingRecordingPage;
