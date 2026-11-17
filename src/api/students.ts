import { api } from "./client";
import { request } from "./errors";
import { PaginatedResponse } from "./pagination";
import { Student } from "#src/types";

export const studentApi = {
  me: () => request<Student>(() => api.get("/students/me/")),
  list: (groupId?: number, courseOfferingId?: number, search?: string, pageSize: number = 500) =>
    request<PaginatedResponse<Student>>(() =>
      api.get("/students/", {
        params: {
          group: groupId,
          course_offering: courseOfferingId,
          search: search || undefined,
          page_size: pageSize,
        },
      }),
    ),
  updatePersonalEmail: (personalEmail: string) =>
    request<{ detail: string; personal_email: string }>(() =>
      api.post("/students/me/personal-email/", {
        personal_email: personalEmail,
      }),
    ),
};
