import { Clock } from "lucide-react";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const timeSlots = ["8:00", "9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];

const schedule: Record<string, Record<string, string>> = {
  "Mon": { "8:00": "Mathematics", "9:00": "Mathematics", "10:00": "English", "11:00": "Physics", "13:00": "Chemistry", "14:00": "Art" },
  "Tue": { "8:00": "English", "9:00": "History", "10:00": "Mathematics", "11:00": "PE", "13:00": "Biology", "14:00": "Music" },
  "Wed": { "8:00": "Physics", "9:00": "Chemistry", "10:00": "Mathematics", "11:00": "English", "13:00": "Geography", "15:00": "Art" },
  "Thu": { "8:00": "Biology", "9:00": "English", "10:00": "History", "11:00": "Mathematics", "13:00": "PE", "14:00": "Chemistry" },
  "Fri": { "8:00": "Mathematics", "9:00": "Physics", "10:00": "English", "11:00": "Geography", "13:00": "Music" },
};

const subjectColors: Record<string, string> = {
  "Mathematics": "bg-primary/10 text-primary border-primary/20",
  "English": "bg-accent text-accent-foreground border-accent-foreground/20",
  "Physics": "bg-warning/10 text-warning border-warning/20",
  "Chemistry": "bg-success/10 text-success border-success/20",
  "Biology": "bg-success/10 text-success border-success/20",
  "History": "bg-secondary text-secondary-foreground border-secondary-foreground/10",
  "Geography": "bg-muted text-muted-foreground border-muted-foreground/20",
  "PE": "bg-destructive/10 text-destructive border-destructive/20",
  "Art": "bg-primary/10 text-primary border-primary/20",
  "Music": "bg-accent text-accent-foreground border-accent-foreground/20",
};

const Timetable = () => {
  return (
    <section id="timetable" className="card-elevated p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="h-5 w-5 text-primary" />
        <h2 className="section-title">Weekly Timetable</h2>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Header row */}
          <div className="grid grid-cols-6 gap-2 mb-2">
            <div className="p-2 text-xs font-medium text-muted-foreground">Time</div>
            {days.map((day) => (
              <div key={day} className="p-2 text-center text-sm font-semibold text-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Time slots */}
          {timeSlots.map((time) => (
            <div key={time} className="grid grid-cols-6 gap-2 mb-2">
              <div className="p-2 text-xs font-medium text-muted-foreground flex items-center">
                {time}
              </div>
              {days.map((day) => {
                const subject = schedule[day]?.[time];
                return (
                  <div
                    key={`${day}-${time}`}
                    className={`timetable-cell border ${
                      subject
                        ? subjectColors[subject] || "bg-secondary text-secondary-foreground"
                        : "timetable-cell-empty"
                    }`}
                  >
                    {subject && (
                      <span className="text-xs font-medium truncate block">{subject}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Timetable;
