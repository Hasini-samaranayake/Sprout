import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Calendar-day streak: one qualifying activity per local UTC date extends the streak.
 * Missing a day resets current streak to 1 (today).
 */
export async function updateStreakAfterActivity(
  supabase: SupabaseClient,
  studentId: string,
  activityDate: Date
): Promise<void> {
  const today = activityDate.toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("streak_records")
    .select("current_streak, longest_streak, last_activity_date")
    .eq("student_id", studentId)
    .maybeSingle();

  if (!existing) {
    await supabase.from("streak_records").insert({
      student_id: studentId,
      current_streak: 1,
      longest_streak: 1,
      last_activity_date: today,
    });
    return;
  }

  const last = existing.last_activity_date;
  if (last === today) {
    return;
  }

  const lastD = last ? new Date(last + "T12:00:00Z") : null;
  const todayD = new Date(today + "T12:00:00Z");
  let next = 1;
  if (lastD) {
    const diffDays = Math.round(
      (todayD.getTime() - lastD.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 1) {
      next = existing.current_streak + 1;
    } else if (diffDays === 0) {
      next = existing.current_streak;
    } else {
      next = 1;
    }
  }

  const longest = Math.max(existing.longest_streak, next);

  await supabase
    .from("streak_records")
    .update({
      current_streak: next,
      longest_streak: longest,
      last_activity_date: today,
    })
    .eq("student_id", studentId);
}
