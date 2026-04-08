"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export async function insertWhiteboardLessonRecord(input: {
  id: string;
  title: string;
  image_storage_path: string;
  strokes_json: Json | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "tutor") {
    return { ok: false, error: "Only tutors can save whiteboard lessons." };
  }

  const prefix = `${user.id}/`;
  if (!input.image_storage_path.startsWith(prefix)) {
    return { ok: false, error: "Invalid storage path." };
  }

  const title = input.title.trim() || "Untitled lesson";

  const { error } = await supabase.from("tutor_whiteboard_lessons").insert({
    id: input.id,
    tutor_id: user.id,
    title,
    image_storage_path: input.image_storage_path,
    strokes_json: input.strokes_json,
  });
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/tutor");
  revalidatePath("/dashboard/student");
  return { ok: true };
}
