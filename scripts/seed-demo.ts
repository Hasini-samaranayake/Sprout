/**
 * Seeds demo users (Supabase Auth + profiles) and relational data.
 * Fixed UUIDs make re-runs idempotent.
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Loads .env.local first, then .env
 *
 * Usage: npm run seed
 */
import { config as loadEnv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEMO_PASSWORD, USERS } from "./demo-users";

loadEnv({ path: ".env.local" });
loadEnv();

/** Stable graph IDs (do not change between runs) */
const S = {
  subjMath: "10000000-0000-4000-8000-000000000001",
  subjPhy: "10000000-0000-4000-8000-000000000002",
  subjEng: "10000000-0000-4000-8000-000000000003",
  task0: "20000000-0000-4000-8000-000000000001",
  task1: "20000000-0000-4000-8000-000000000002",
  task2: "20000000-0000-4000-8000-000000000003",
  task3: "20000000-0000-4000-8000-000000000004",
  task4: "20000000-0000-4000-8000-000000000005",
  task5: "20000000-0000-4000-8000-000000000006",
  lesMath1: "30000000-0000-4000-8000-000000000001",
  lesMath2: "30000000-0000-4000-8000-000000000002",
  lesPhy: "30000000-0000-4000-8000-000000000003",
  lesEng: "30000000-0000-4000-8000-000000000004",
  step1: "40000000-0000-4000-8000-000000000001",
  step2: "40000000-0000-4000-8000-000000000002",
  step3: "40000000-0000-4000-8000-000000000003",
  step4: "40000000-0000-4000-8000-000000000004",
  step5: "40000000-0000-4000-8000-000000000005",
  step6: "40000000-0000-4000-8000-000000000006",
  note1: "50000000-0000-4000-8000-000000000001",
  note2: "50000000-0000-4000-8000-000000000002",
};

/** Paginate through Auth users — default listUsers() only returns the first page. */
async function findAuthUserByEmail(admin: SupabaseClient, email: string) {
  const perPage = 200;
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) return found;
    if (data.users.length < perPage) break;
  }
  return null;
}

async function ensureUser(
  admin: SupabaseClient,
  email: string,
  password: string,
  meta: { full_name: string; role: string }
) {
  const found = await findAuthUserByEmail(admin, email);
  if (found) {
    await admin.auth.admin.updateUserById(found.id, {
      password,
      user_metadata: meta,
    });
    return found.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: meta,
  });
  if (error) throw error;
  return data.user!.id;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ids: Record<string, string> = {};

  for (const u of USERS) {
    const id = await ensureUser(admin, u.email, DEMO_PASSWORD, {
      full_name: u.full_name,
      role: u.role,
    });
    ids[u.email] = id;
    await admin.from("profiles").upsert(
      {
        id,
        email: u.email,
        full_name: u.full_name,
        role: u.role,
      },
      { onConflict: "id" }
    );
  }

  const tutorId = ids["tutor@sprout.demo"]!;
  const callum = ids["callum.perera@sprout.demo"]!;
  const brianna = ids["brianna.struggling@sprout.demo"]!;
  const carlos = ids["carlos.inactive@sprout.demo"]!;
  const dana = ids["dana.streak@sprout.demo"]!;
  const elena = ids["elena.followup@sprout.demo"]!;

  for (const sid of [callum, brianna, carlos, dana, elena]) {
    await admin.from("tutor_student_links").upsert(
      { tutor_id: tutorId, student_id: sid },
      { onConflict: "tutor_id,student_id" }
    );
  }

  await admin.from("subjects").upsert(
    [
      {
        id: S.subjMath,
        title: "Mathematics",
        slug: "mathematics",
        description: "Algebra through early calculus foundations.",
      },
      {
        id: S.subjPhy,
        title: "Physics",
        slug: "physics",
        description: "Mechanics and reasoning with quantities.",
      },
      {
        id: S.subjEng,
        title: "English",
        slug: "english",
        description: "Reading analysis and concise writing.",
      },
    ],
    { onConflict: "id" }
  );

  const taskRows = [
    {
      id: S.task0,
      type: "multiple_choice",
      prompt: "What is 3 × 4?",
      options: { choices: ["10", "12", "14", "16"] },
      correct_answer: "12",
      accepted_variants: [],
      misconception_tags: ["multiplication_basics"],
      hint_text: "Think of repeated addition: 3 + 3 + 3 + 3.",
      explanation_text: "3 × 4 = 12.",
      topic_tag: "arithmetic",
    },
    {
      id: S.task1,
      type: "short_answer",
      prompt: "Solve for x: 2x + 6 = 14",
      correct_answer: "4",
      accepted_variants: ["x=4", "x = 4"],
      misconception_tags: ["inverse_operations"],
      hint_text: "Subtract 6 from both sides, then divide by 2.",
      explanation_text: "2x = 8 → x = 4.",
      rules_hint: { checkSign: false },
      topic_tag: "algebra_linear",
    },
    {
      id: S.task2,
      type: "short_answer",
      prompt: "What is the slope of y = 3x − 1?",
      correct_answer: "3",
      accepted_variants: ["m=3", "m = 3"],
      misconception_tags: ["line_interpretation"],
      hint_text: "y = mx + b form: m is the slope.",
      explanation_text: "The coefficient of x is 3.",
      topic_tag: "algebra_linear",
    },
    {
      id: S.task3,
      type: "multiple_choice",
      prompt:
        "A car travels 90 km in 1.5 hours. What is its average speed?",
      options: { choices: ["45 km/h", "60 km/h", "75 km/h", "135 km/h"] },
      correct_answer: "60 km/h",
      misconception_tags: ["rate"],
      hint_text: "Speed = distance ÷ time.",
      explanation_text: "90 ÷ 1.5 = 60 km/h.",
      topic_tag: "kinematics",
    },
    {
      id: S.task4,
      type: "short_answer",
      prompt: "Convert 20 m/s to km/h (number only).",
      correct_answer: "72",
      accepted_variants: ["72 km/h"],
      misconception_tags: ["unit_conversion"],
      hint_text: "Multiply m/s by 3.6 to get km/h.",
      explanation_text: "20 × 3.6 = 72 km/h.",
      rules_hint: { closeWhen: "70" },
      topic_tag: "kinematics",
    },
    {
      id: S.task5,
      type: "structured",
      options: { homeworkWorkspace: true },
      prompt:
        "In one sentence, what is the main idea of a thesis statement?",
      correct_answer: "it states the main argument",
      accepted_variants: [
        "states the main argument",
        "main claim",
        "central claim",
      ],
      misconception_tags: ["writing_structure"],
      hint_text: "It previews the paper’s central claim.",
      explanation_text: "A thesis presents the essay’s main argument.",
      topic_tag: "writing",
    },
  ];

  await admin.from("tasks").upsert(taskRows, { onConflict: "id" });

  const dueIqraPast = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

  await admin.from("lessons").upsert(
    [
      {
        id: S.lesMath1,
        subject_id: S.subjMath,
        title: "Linear foundations",
        order_index: 1,
        due_at: null,
        assigned_student_id: null,
      },
      {
        id: S.lesMath2,
        subject_id: S.subjMath,
        title: "Checkpoint: equations",
        order_index: 2,
        due_at: null,
        assigned_student_id: null,
      },
      {
        id: S.lesPhy,
        subject_id: S.subjPhy,
        title: "Motion basics",
        order_index: 1,
        due_at: null,
        assigned_student_id: null,
      },
      {
        id: S.lesEng,
        subject_id: S.subjEng,
        title: "Thesis clarity",
        order_index: 1,
        due_at: dueIqraPast,
        assigned_student_id: elena,
      },
    ],
    { onConflict: "id" }
  );

  await admin.from("lesson_steps").upsert(
    [
      {
        id: S.step1,
        lesson_id: S.lesMath1,
        order_index: 1,
        title: "Warm-up",
        task_id: S.task0,
      },
      {
        id: S.step2,
        lesson_id: S.lesMath1,
        order_index: 2,
        title: "Solve",
        task_id: S.task1,
      },
      {
        id: S.step3,
        lesson_id: S.lesMath2,
        order_index: 1,
        title: "Checkpoint",
        task_id: S.task2,
      },
      {
        id: S.step4,
        lesson_id: S.lesPhy,
        order_index: 1,
        title: "Speed",
        task_id: S.task3,
      },
      {
        id: S.step5,
        lesson_id: S.lesPhy,
        order_index: 2,
        title: "Units",
        task_id: S.task4,
      },
      {
        id: S.step6,
        lesson_id: S.lesEng,
        order_index: 1,
        title: "Draft thesis",
        task_id: S.task5,
      },
    ],
    { onConflict: "id" }
  );

  const enroll = [
    { student_id: callum, subject_id: S.subjMath },
    { student_id: callum, subject_id: S.subjPhy },
    { student_id: brianna, subject_id: S.subjMath },
    { student_id: brianna, subject_id: S.subjEng },
    { student_id: carlos, subject_id: S.subjMath },
    { student_id: dana, subject_id: S.subjMath },
    { student_id: dana, subject_id: S.subjPhy },
    { student_id: elena, subject_id: S.subjEng },
    { student_id: elena, subject_id: S.subjMath },
  ];

  await admin.from("enrollments").upsert(enroll, {
    onConflict: "student_id,subject_id",
  });

  const daysAgo = (d: number) =>
    new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();

  await admin.from("task_attempts").delete().in("student_id", [
    callum,
    brianna,
    carlos,
    dana,
    elena,
  ]);

  await admin.from("task_attempts").insert([
    {
      student_id: callum,
      task_id: S.task0,
      lesson_id: S.lesMath1,
      raw_answer: "12",
      normalized_answer: "12",
      result: "correct",
      score: 1,
      feedback_payload: {},
      created_at: daysAgo(1),
    },
    {
      student_id: brianna,
      task_id: S.task1,
      lesson_id: S.lesMath1,
      raw_answer: "3",
      normalized_answer: "3",
      result: "incorrect",
      score: 0,
      feedback_payload: {},
      created_at: daysAgo(2),
    },
    {
      student_id: brianna,
      task_id: S.task1,
      lesson_id: S.lesMath1,
      raw_answer: "5",
      normalized_answer: "5",
      result: "incorrect",
      score: 0,
      feedback_payload: {},
      created_at: daysAgo(2),
    },
    {
      student_id: brianna,
      task_id: S.task1,
      lesson_id: S.lesMath1,
      raw_answer: "2",
      normalized_answer: "2",
      result: "incorrect",
      score: 0,
      feedback_payload: {},
      created_at: daysAgo(2),
    },
    {
      student_id: brianna,
      task_id: S.task2,
      lesson_id: S.lesMath2,
      raw_answer: "1",
      normalized_answer: "1",
      result: "incorrect",
      score: 0,
      feedback_payload: {},
      created_at: daysAgo(3),
    },
    {
      student_id: brianna,
      task_id: S.task2,
      lesson_id: S.lesMath2,
      raw_answer: "0",
      normalized_answer: "0",
      result: "incorrect",
      score: 0,
      feedback_payload: {},
      created_at: daysAgo(3),
    },
    {
      student_id: brianna,
      task_id: S.task2,
      lesson_id: S.lesMath2,
      raw_answer: "9",
      normalized_answer: "9",
      result: "incorrect",
      score: 0,
      feedback_payload: {},
      created_at: daysAgo(3),
    },
    {
      student_id: carlos,
      task_id: S.task0,
      lesson_id: S.lesMath1,
      raw_answer: "12",
      normalized_answer: "12",
      result: "correct",
      score: 1,
      feedback_payload: {},
      created_at: daysAgo(9),
    },
    {
      student_id: dana,
      task_id: S.task0,
      lesson_id: S.lesMath1,
      raw_answer: "12",
      result: "correct",
      score: 1,
      feedback_payload: {},
      created_at: daysAgo(1),
    },
    {
      student_id: elena,
      task_id: S.task5,
      lesson_id: S.lesEng,
      raw_answer: "draft",
      result: "partial",
      score: 0.45,
      feedback_payload: {},
      created_at: daysAgo(1),
    },
  ]);

  await admin.from("activity_events").delete().in("student_id", [
    callum,
    brianna,
    carlos,
    dana,
    elena,
  ]);

  await admin.from("activity_events").insert([
    { student_id: callum, type: "task_submit", occurred_at: daysAgo(0) },
    { student_id: callum, type: "task_submit", occurred_at: daysAgo(1) },
    { student_id: brianna, type: "task_submit", occurred_at: daysAgo(2) },
    { student_id: carlos, type: "task_submit", occurred_at: daysAgo(9) },
    { student_id: dana, type: "task_submit", occurred_at: daysAgo(1) },
    { student_id: elena, type: "lesson_start", occurred_at: daysAgo(1) },
  ]);

  await admin.from("streak_records").upsert(
    [
      {
        student_id: callum,
        current_streak: 6,
        longest_streak: 9,
        last_activity_date: new Date().toISOString().slice(0, 10),
      },
      {
        student_id: brianna,
        current_streak: 2,
        longest_streak: 4,
        last_activity_date: new Date().toISOString().slice(0, 10),
      },
      {
        student_id: carlos,
        current_streak: 0,
        longest_streak: 3,
        last_activity_date: new Date(Date.now() - 9 * 86400000)
          .toISOString()
          .slice(0, 10),
      },
      {
        student_id: dana,
        current_streak: 1,
        longest_streak: 12,
        last_activity_date: new Date().toISOString().slice(0, 10),
      },
      {
        student_id: elena,
        current_streak: 3,
        longest_streak: 5,
        last_activity_date: new Date().toISOString().slice(0, 10),
      },
    ],
    { onConflict: "student_id" }
  );

  await admin.from("progress_records").delete().in("student_id", [
    callum,
    brianna,
    carlos,
    dana,
    elena,
  ]);

  await admin.from("progress_records").insert([
    {
      student_id: callum,
      subject_id: S.subjMath,
      lesson_id: null,
      completion_pct: 78,
    },
    {
      student_id: callum,
      subject_id: S.subjPhy,
      lesson_id: null,
      completion_pct: 52,
    },
    {
      student_id: brianna,
      subject_id: S.subjMath,
      lesson_id: null,
      completion_pct: 34,
    },
    {
      student_id: carlos,
      subject_id: S.subjMath,
      lesson_id: null,
      completion_pct: 22,
    },
    {
      student_id: dana,
      subject_id: S.subjMath,
      lesson_id: null,
      completion_pct: 61,
    },
    {
      student_id: elena,
      subject_id: S.subjEng,
      lesson_id: null,
      completion_pct: 40,
    },
  ]);

  await admin.from("tutor_notes").delete().eq("tutor_id", tutorId);

  await admin.from("tutor_notes").insert([
    {
      id: S.note1,
      tutor_id: tutorId,
      student_id: brianna,
      body: "Prefers worked examples before independent practice. Consider short algebra warm-ups.",
    },
    {
      id: S.note2,
      tutor_id: tutorId,
      student_id: elena,
      body: "Strong participation — nudge on assignment deadlines.",
    },
  ]);

  console.log("Seed complete.");
  console.log("Demo password for all accounts:", DEMO_PASSWORD);
  console.log("Accounts:", USERS.map((u) => u.email).join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
