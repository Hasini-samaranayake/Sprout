"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ClassCodeFormState = {
  error?: string;
  success?: string;
};

function normalizeSixDigitCode(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 6) return null;
  return digits;
}

async function generateUniqueClassCode(): Promise<string> {
  const admin = createAdminClient();
  for (let attempt = 0; attempt < 40; attempt++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const { data } = await admin
      .from("tutor_classes")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error("Could not generate a unique class code.");
}

export async function createTutorClassAction(
  _prev: ClassCodeFormState,
  formData: FormData
): Promise<ClassCodeFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "tutor") {
    return { error: "Only tutors can create a class." };
  }

  const subjectId = String(formData.get("subject_id") ?? "").trim();
  if (!subjectId) {
    return { error: "Choose a subject." };
  }

  const titleRaw = String(formData.get("title") ?? "").trim();
  const title = titleRaw || "Class";

  const { data: subject } = await supabase
    .from("subjects")
    .select("id")
    .eq("id", subjectId)
    .maybeSingle();
  if (!subject) {
    return { error: "Subject not found." };
  }

  let code: string;
  try {
    code = await generateUniqueClassCode();
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not generate a code.",
    };
  }

  const { error } = await supabase.from("tutor_classes").insert({
    tutor_id: user.id,
    subject_id: subjectId,
    title,
    code,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/tutor");
  return {
    success: `Class created. Share this 6-digit code with students: ${code}`,
  };
}

export async function joinClassByCodeAction(
  _prev: ClassCodeFormState,
  formData: FormData
): Promise<ClassCodeFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "student") {
    return { error: "Only students can join a class with a code." };
  }

  const code = normalizeSixDigitCode(String(formData.get("code") ?? ""));
  if (!code) {
    return { error: "Enter the 6-digit code from your tutor." };
  }

  const admin = createAdminClient();
  const { data: klass, error: findErr } = await admin
    .from("tutor_classes")
    .select("id, tutor_id, subject_id")
    .eq("code", code)
    .maybeSingle();

  if (findErr) return { error: findErr.message };
  if (!klass) {
    return { error: "No class matches that code. Check with your tutor." };
  }

  const { error: enrErr } = await admin.from("enrollments").upsert(
    {
      student_id: user.id,
      subject_id: klass.subject_id,
    },
    { onConflict: "student_id,subject_id" }
  );
  if (enrErr) return { error: enrErr.message };

  const { error: linkErr } = await admin.from("tutor_student_links").upsert(
    {
      tutor_id: klass.tutor_id,
      student_id: user.id,
    },
    { onConflict: "tutor_id,student_id" }
  );
  if (linkErr) return { error: linkErr.message };

  revalidatePath("/dashboard/student");
  revalidatePath("/subjects");
  revalidatePath(`/subjects/${klass.subject_id}`);

  return { success: "You joined the class and can access that subject." };
}
