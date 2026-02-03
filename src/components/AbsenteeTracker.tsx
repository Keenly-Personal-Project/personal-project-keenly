import { UserX, Check } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Student {
  id: number;
  name: string;
  initials: string;
  status: "absent" | "present";
  reason?: string;
}

const students: Student[] = [
  { id: 1, name: "Alex Thompson", initials: "AT", status: "absent", reason: "Medical" },
  { id: 2, name: "Sarah Chen", initials: "SC", status: "absent", reason: "Family" },
  { id: 3, name: "Michael Brown", initials: "MB", status: "present" },
  { id: 4, name: "Emily Davis", initials: "ED", status: "present" },
  { id: 5, name: "James Wilson", initials: "JW", status: "absent", reason: "Sick" },
  { id: 6, name: "Lisa Anderson", initials: "LA", status: "present" },
  { id: 7, name: "David Lee", initials: "DL", status: "present" },
  { id: 8, name: "Emma Martinez", initials: "EM", status: "present" },
];

const AbsenteeTracker = () => {
  const absentCount = students.filter((s) => s.status === "absent").length;
  const presentCount = students.filter((s) => s.status === "present").length;

  return (
    <section id="absentee" className="card-elevated p-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <UserX className="h-5 w-5 text-primary" />
          <h2 className="section-title">Today's Attendance</h2>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success" />
            <span className="text-muted-foreground">{presentCount} Present</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-destructive" />
            <span className="text-muted-foreground">{absentCount} Absent</span>
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {students
          .filter((s) => s.status === "absent")
          .map((student) => (
            <div
              key={student.id}
              className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-destructive/10 text-destructive text-xs font-medium">
                    {student.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">{student.name}</p>
                  <p className="text-xs text-muted-foreground">{student.reason}</p>
                </div>
              </div>
              <span className="badge-absent">Absent</span>
            </div>
          ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground mb-3">Present Today</p>
        <div className="flex flex-wrap gap-2">
          {students
            .filter((s) => s.status === "present")
            .map((student) => (
              <div
                key={student.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/5 border border-success/20"
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-success/10 text-success text-[10px] font-medium">
                    {student.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-foreground">{student.name}</span>
                <Check className="h-3 w-3 text-success" />
              </div>
            ))}
        </div>
      </div>
    </section>
  );
};

export default AbsenteeTracker;
