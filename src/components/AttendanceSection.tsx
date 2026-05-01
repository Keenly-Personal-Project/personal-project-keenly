import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Users, ClipboardList, QrCode, Maximize2, Share2, Trash2, ScanLine, MousePointerClick } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import QrScannerDialog from "@/components/QrScannerDialog";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type KeenRole = "owner" | "admin" | "member";

interface Assembly {
  id: string;
  class_slug: string;
  title: string;
  late_time: string;
  absent_time: string;
  qr_token: string;
  created_by: string;
  created_at: string;
}

interface AttendanceRecord {
  id: string;
  assembly_id: string;
  user_id: string;
  signed_in_at: string | null;
  status: string;
}

interface KeenMember {
  id: string;
  class_slug: string;
  user_id: string;
  email: string;
  role: string;
}

interface ProfileData {
  user_id: string;
  avatar_url: string | null;
}

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function formatDate(d: string) {
  const dt = new Date(d);
  return `${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getDate()).padStart(2, "0")}/${dt.getFullYear()}`;
}

function getAttendanceStatus(record: AttendanceRecord | undefined, assembly: Assembly): "present" | "late" | "absent" | "pending" {
  if (!record || record.status === "pending") {
    const now = new Date();
    const absentTime = new Date(assembly.absent_time);
    if (now > absentTime) return "absent";
    return "pending";
  }
  return record.status as "present" | "late" | "absent";
}

const statusConfig = {
  present: { color: "hsl(142, 71%, 45%)", bg: "hsl(142, 71%, 45%, 0.15)", label: "Present", border: "hsl(142, 71%, 45%, 0.4)" },
  late: { color: "hsl(48, 96%, 53%)", bg: "hsl(48, 96%, 53%, 0.15)", label: "Late", border: "hsl(48, 96%, 53%, 0.4)" },
  absent: { color: "hsl(0, 84%, 60%)", bg: "hsl(0, 84%, 60%, 0.15)", label: "Absent", border: "hsl(0, 84%, 60%, 0.4)" },
  pending: { color: "hsl(0, 0%, 60%)", bg: "hsl(0, 0%, 60%, 0.15)", label: "Not yet signed up", border: "hsl(0, 0%, 60%, 0.4)" },
};

export default function AttendanceSection({ classSlug, previewRole }: { classSlug: string; previewRole: KeenRole }) {
  const { user } = useAuth();
  const canEdit = previewRole === "owner" || previewRole === "admin";
  const [subTab, setSubTab] = useState<"individuals" | "assembly">("individuals");
  const [members, setMembers] = useState<KeenMember[]>([]);
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [loading, setLoading] = useState(true);

  // Individual dialog
  const [selectedMember, setSelectedMember] = useState<KeenMember | null>(null);

  // Assembly dialog
  const [selectedAssembly, setSelectedAssembly] = useState<Assembly | null>(null);

  // Create assembly dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newLateTime, setNewLateTime] = useState("");
  const [newAbsentTime, setNewAbsentTime] = useState("");

  // QR fullscreen
  const [qrFullscreen, setQrFullscreen] = useState<string | null>(null);

  // Delete assembly
  const [deleteAssemblyId, setDeleteAssemblyId] = useState<string | null>(null);

  // Scanner & one-click sign-in
  const [scannerOpen, setScannerOpen] = useState(false);
  const [signingInId, setSigningInId] = useState<string | null>(null);
  const navigate = useNavigate();

  const activeAssemblies = assemblies.filter((a) => new Date() < new Date(a.absent_time));
  const myAttendance = (assemblyId: string) =>
    allAttendance.find((a) => a.assembly_id === assemblyId && a.user_id === user?.id);

  const handleScannedUrl = (text: string) => {
    setScannerOpen(false);
    try {
      // Accept either full URL or just the token
      const url = new URL(text, window.location.origin);
      const parts = url.pathname.split("/").filter(Boolean);
      const tokenIdx = parts.indexOf("sign-in");
      const token = tokenIdx >= 0 ? parts[tokenIdx + 1] : parts[parts.length - 1];
      if (!token) throw new Error("no token");
      navigate(`/assembly/sign-in/${token}`);
    } catch {
      // Maybe it's just a raw token
      if (/^[A-Za-z0-9]{8,}$/.test(text.trim())) {
        navigate(`/assembly/sign-in/${text.trim()}`);
      } else {
        toast.error("That QR code isn't a valid assembly link.");
      }
    }
  };

  const handleClickHereSignIn = async (assembly: Assembly) => {
    if (!user) return;
    setSigningInId(assembly.id);
    const now = new Date();
    const lateTime = new Date(assembly.late_time);
    const absentTime = new Date(assembly.absent_time);

    if (now > absentTime) {
      toast.error("This assembly has already ended.");
      setSigningInId(null);
      return;
    }

    const existing = myAttendance(assembly.id);
    if (existing && existing.status !== "pending") {
      toast.info("You're already signed in for this assembly.");
      setSigningInId(null);
      return;
    }

    const isLate = now > lateTime;
    const status = isLate ? "late" : "present";

    if (existing) {
      const { error } = await (supabase.from as any)("assembly_attendance")
        .update({ signed_in_at: now.toISOString(), status })
        .eq("id", existing.id);
      if (error) {
        toast.error("Failed to sign in.");
        setSigningInId(null);
        return;
      }
    } else {
      const { error } = await (supabase.from as any)("assembly_attendance").insert({
        assembly_id: assembly.id,
        user_id: user.id,
        signed_in_at: now.toISOString(),
        status,
      });
      if (error) {
        toast.error("Failed to sign in.");
        setSigningInId(null);
        return;
      }
    }

    toast.success(isLate ? "Signed in (Late)" : "Signed in — see you there!");
    setSigningInId(null);
    fetchAll();
  };


  // Ensure current user has a membership row (as 'member' by default).
  // Role is managed by owners only — never overwritten from the client preview.
  useEffect(() => {
    if (!user) return;
    const ensureMembership = async () => {
      const { data: existing } = await (supabase.from as any)("keen_members")
        .select("id")
        .eq("class_slug", classSlug)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existing) {
        await (supabase.from as any)("keen_members").insert({
          class_slug: classSlug,
          user_id: user.id,
          email: user.email || "",
          role: "member",
        });
      }
    };
    ensureMembership().then(() => fetchAll());
  }, [user, classSlug]);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    const [membersRes, assembliesRes, attendanceRes, profilesRes] = await Promise.all([
      (supabase.from as any)("keen_members").select("*").eq("class_slug", classSlug),
      (supabase.from as any)("assemblies").select("*").eq("class_slug", classSlug).order("created_at", { ascending: true }),
      (supabase.from as any)("assembly_attendance").select("*"),
      supabase.from("profiles").select("user_id, avatar_url"),
    ]);
    if (membersRes.data) setMembers(membersRes.data);
    if (assembliesRes.data) setAssemblies(assembliesRes.data);
    if (attendanceRes.data) setAllAttendance(attendanceRes.data);
    if (profilesRes.data) setProfiles(profilesRes.data as ProfileData[]);
    setLoading(false);
  };

  const getProfileAvatar = (userId: string) => {
    const profile = profiles.find((p) => p.user_id === userId);
    return profile?.avatar_url || null;
  };

  const handleCreateAssembly = async () => {
    if (!user || !newTitle.trim() || !newLateTime || !newAbsentTime) return;
    const lateDate = new Date(newLateTime);
    const absentDate = new Date(newAbsentTime);
    const now = new Date();
    if (isNaN(lateDate.getTime()) || isNaN(absentDate.getTime())) {
      toast.error("Please pick valid dates and times.");
      return;
    }
    if (absentDate <= now) {
      toast.error("Absent time must be in the future.");
      return;
    }
    if (absentDate <= lateDate) {
      toast.error("Absent time must be after the late time.");
      return;
    }
    const token = generateToken();
    const { error } = await (supabase.from as any)("assemblies").insert({
      class_slug: classSlug,
      title: newTitle.trim(),
      late_time: lateDate.toISOString(),
      absent_time: absentDate.toISOString(),
      qr_token: token,
      created_by: user.id,
    });
    if (error) {
      toast.error("Failed to create assembly");
      console.error(error);
      return;
    }
    toast.success("Assembly created!");
    setCreateOpen(false);
    setNewTitle("");
    setNewLateTime("");
    setNewAbsentTime("");
    fetchAll();
  };

  const handleDeleteAssembly = async (id: string) => {
    const { error } = await (supabase.from as any)("assemblies").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete assembly");
      return;
    }
    toast.success("Assembly deleted");
    setDeleteAssemblyId(null);
    setSelectedAssembly(null);
    fetchAll();
  };

  const handleShare = async (token: string) => {
    const url = `${window.location.origin}/assembly/sign-in/${token}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Assembly Sign-In", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Sign-in link copied to clipboard!");
      }
    } catch {
      await navigator.clipboard.writeText(url);
      toast.success("Sign-in link copied to clipboard!");
    }
  };

  const visibleMembers = canEdit ? members : members.filter((m) => m.user_id === user?.id);

  const getAssemblyAttendance = (assemblyId: string) =>
    allAttendance.filter((a) => a.assembly_id === assemblyId);

  const getMemberAttendance = (userId: string) =>
    assemblies.map((assembly) => {
      const record = allAttendance.find((a) => a.assembly_id === assembly.id && a.user_id === userId);
      return { assembly, status: getAttendanceStatus(record, assembly), record };
    });

  const signInUrl = (token: string) => `${window.location.origin}/assembly/sign-in/${token}`;

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSubTab("individuals")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
            subTab === "individuals"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:bg-muted"
          }`}
        >
          <Users className="h-3.5 w-3.5" /> Individuals
        </button>
        {canEdit && (
          <button
            onClick={() => setSubTab("assembly")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              subTab === "assembly"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" /> Assembly
          </button>
        )}
      </div>

      {/* ───── INDIVIDUALS TAB ───── */}
      {subTab === "individuals" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading ? (
            Array.from({ length: canEdit ? 6 : 1 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))
          ) : visibleMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground italic col-span-full text-center py-8">No members yet.</p>
          ) : (
            visibleMembers.map((member) => {
              const name = member.email?.split("@")[0] || "User";
              const initials = name.slice(0, 2).toUpperCase();
              const avatarUrl = getProfileAvatar(member.user_id);
              return (
                <button
                  key={member.id}
                  onClick={() => setSelectedMember(member)}
                  className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:bg-muted/60 transition-all text-left"
                >
                  <Avatar className="h-10 w-10">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">{name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* ───── ASSEMBLY TAB ───── */}
      {subTab === "assembly" && canEdit && (
        <div className="space-y-3">
          <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3 w-3" /> Create Assembly
          </Button>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 rounded-lg border border-border bg-card">
                  <Skeleton className="h-4 w-40 mb-2" />
                  <Skeleton className="h-3 w-20 mb-3" />
                  <div className="flex gap-3">
                    <Skeleton className="h-3 w-8" />
                    <Skeleton className="h-3 w-8" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                </div>
              ))}
            </div>
          ) : assemblies.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-8">No assemblies yet. Create one to get started.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {assemblies.map((assembly, idx) => {
                const attendees = getAssemblyAttendance(assembly.id);
                const presentCount = attendees.filter((a) => a.status === "present").length;
                const lateCount = attendees.filter((a) => a.status === "late").length;
                const absentCount = attendees.filter((a) => a.status === "absent").length;
                const isExpired = new Date() > new Date(assembly.absent_time);

                return (
                  <div
                    key={assembly.id}
                    className="p-4 rounded-lg border border-border bg-card hover:bg-muted/40 transition-all cursor-pointer"
                    onClick={() => setSelectedAssembly(assembly)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-foreground">
                        Assembly #{idx + 1}: {assembly.title}
                      </h4>
                      {isExpired && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">
                          Expired
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{formatDate(assembly.created_at)}</p>
                    <div className="flex gap-3 text-xs">
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: statusConfig.present.color }} />{presentCount}</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: statusConfig.late.color }} />{lateCount}</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: statusConfig.absent.color }} />{absentCount}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ───── INDIVIDUAL HISTORY DIALOG ───── */}
      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] w-full h-[85vh] overflow-hidden flex flex-col sm:flex-row gap-0 p-0 [&>button.absolute]:hidden">
          {selectedMember && (() => {
            const name = selectedMember.email?.split("@")[0] || "User";
            const initials = name.slice(0, 2).toUpperCase();
            const avatarUrl = getProfileAvatar(selectedMember.user_id);
            const history = getMemberAttendance(selectedMember.user_id);

            return (
              <>
                {/* Left side — account info + legend */}
                <div className="w-full sm:w-64 shrink-0 border-b sm:border-b-0 sm:border-r border-border p-6 flex flex-col gap-6 relative">
                  <button
                    onClick={() => setSelectedMember(null)}
                    className="absolute right-3 top-3 z-10 rounded-sm opacity-70 hover:opacity-100 ring-offset-background transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    <span className="sr-only">Close</span>
                  </button>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-14 w-14">
                      {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">{name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{selectedMember.role}</p>
                      <p className="text-xs text-muted-foreground">{selectedMember.email}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Legend</p>
                    {(["present", "late", "absent", "pending"] as const).map((s) => (
                      <div key={s} className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ background: statusConfig[s].color }} />
                        <span className="text-xs text-foreground">{statusConfig[s].label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right side — assembly history */}
                <div className="flex-1 p-6 overflow-y-auto">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Attendance History</h3>
                  {history.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No assemblies yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {history.map(({ assembly, status }, idx) => (
                        <div
                          key={assembly.id}
                          className="flex items-center gap-3 p-3 rounded-lg border"
                          style={{ borderColor: statusConfig[status].border, background: statusConfig[status].bg }}
                        >
                          <span className="h-4 w-4 rounded-full shrink-0" style={{ background: statusConfig[status].color }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              Assembly #{idx + 1}: {assembly.title}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatDate(assembly.created_at)}</p>
                          </div>
                          <span className="text-xs font-medium" style={{ color: statusConfig[status].color }}>
                            {statusConfig[status].label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ───── ASSEMBLY DETAIL DIALOG ───── */}
      <Dialog open={!!selectedAssembly} onOpenChange={() => setSelectedAssembly(null)}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] w-full h-[85vh] overflow-hidden flex flex-col p-0 [&>button.absolute]:hidden">
          {selectedAssembly && (() => {
            const attendees = getAssemblyAttendance(selectedAssembly.id);
            const isExpired = new Date() > new Date(selectedAssembly.absent_time);
            const idx = assemblies.findIndex((a) => a.id === selectedAssembly.id);

            // Build full member attendance list
            const memberStatuses = members.map((member) => {
              const record = attendees.find((a) => a.user_id === member.user_id);
              const status = getAttendanceStatus(record as AttendanceRecord | undefined, selectedAssembly);
              return { member, status };
            });

            return (
              <div className="flex flex-col sm:flex-row h-full">
                {/* Left — QR + info */}
                <div className="w-full sm:w-72 shrink-0 border-b sm:border-b-0 sm:border-r border-border p-6 flex flex-col gap-4 overflow-y-auto relative">
                  <button
                    onClick={() => setSelectedAssembly(null)}
                    className="absolute right-3 top-3 z-10 rounded-sm opacity-70 hover:opacity-100 ring-offset-background transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    <span className="sr-only">Close</span>
                  </button>
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-1">
                      Assembly #{idx + 1}: {selectedAssembly.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">{formatDate(selectedAssembly.created_at)}</p>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p><span className="font-medium text-foreground">Late Time:</span> <span className="text-muted-foreground">{new Date(selectedAssembly.late_time).toLocaleString()}</span></p>
                    <p><span className="font-medium text-foreground">Absent Time:</span> <span className="text-muted-foreground">{new Date(selectedAssembly.absent_time).toLocaleString()}</span></p>
                  </div>

                  {/* QR Code */}
                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border bg-background">
                    {isExpired ? (
                      <div className="text-center py-4">
                        <p className="text-sm font-medium text-destructive">QR Expired</p>
                        <p className="text-xs text-muted-foreground">The absent time has passed.</p>
                      </div>
                    ) : (
                      <>
                        <QRCodeSVG value={signInUrl(selectedAssembly.qr_token)} size={160} />
                        <p className="text-xs text-muted-foreground text-center">Scan to sign in</p>
                      </>
                    )}
                    <div className="flex gap-2">
                      {!isExpired && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setQrFullscreen(selectedAssembly.qr_token)}>
                          <Maximize2 className="h-3 w-3" /> Fullscreen
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleShare(selectedAssembly.qr_token)}>
                        <Share2 className="h-3 w-3" /> Share
                      </Button>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1 mt-auto"
                    onClick={() => setDeleteAssemblyId(selectedAssembly.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete Assembly
                  </Button>
                </div>

                {/* Right — attendance list */}
                <div className="flex-1 p-6 overflow-y-auto">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Attendance ({members.length} members)</h3>

                  {/* Status summary */}
                  <div className="flex gap-4 mb-4 text-xs">
                    {(["present", "late", "pending", "absent"] as const).map((s) => (
                      <span key={s} className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: statusConfig[s].color }} />
                        {statusConfig[s].label}: {memberStatuses.filter((m) => m.status === s).length}
                      </span>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {memberStatuses.map(({ member, status }) => {
                      const name = member.email?.split("@")[0] || "User";
                      const initials = name.slice(0, 2).toUpperCase();
                      const avatarUrl = getProfileAvatar(member.user_id);
                      return (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 p-3 rounded-lg border"
                          style={{ borderColor: statusConfig[status].border, background: statusConfig[status].bg }}
                        >
                          <Avatar className="h-8 w-8">
                            {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
                            <AvatarFallback className="text-xs font-semibold" style={{ background: statusConfig[status].color + "33", color: statusConfig[status].color }}>
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                          </div>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: statusConfig[status].color + "22", color: statusConfig[status].color }}>
                            {statusConfig[status].label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ───── CREATE ASSEMBLY DIALOG ───── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Assembly</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Weekly Meeting" />
            </div>
            <div>
              <Label className="text-xs">Late Time (sign-ups after this are marked Late)</Label>
              <Input type="datetime-local" value={newLateTime} onChange={(e) => setNewLateTime(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Absent Time (assembly ends — QR expires after this)</Label>
              <Input type="datetime-local" value={newAbsentTime} onChange={(e) => setNewAbsentTime(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateAssembly} disabled={!newTitle.trim() || !newLateTime || !newAbsentTime}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───── QR FULLSCREEN ───── */}
      <Dialog open={!!qrFullscreen} onOpenChange={() => setQrFullscreen(null)}>
        <DialogContent className="max-w-[100vw] max-h-[100vh] w-screen h-screen flex items-center justify-center bg-background p-0 border-0 rounded-none">
          {qrFullscreen && (
            <div className="flex flex-col items-center gap-6">
              <QRCodeSVG value={signInUrl(qrFullscreen)} size={Math.min(window.innerWidth * 0.7, window.innerHeight * 0.7, 500)} />
              <p className="text-lg font-medium text-foreground">Scan to sign in</p>
              <Button variant="outline" onClick={() => handleShare(qrFullscreen)} className="gap-2">
                <Share2 className="h-4 w-4" /> Share Link
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ───── DELETE ASSEMBLY CONFIRM ───── */}
      <AlertDialog open={!!deleteAssemblyId} onOpenChange={() => setDeleteAssemblyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assembly?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this assembly and all its attendance records.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteAssemblyId && handleDeleteAssembly(deleteAssemblyId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
