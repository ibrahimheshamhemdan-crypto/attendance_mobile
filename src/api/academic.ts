import { api } from "./client";
import { request } from "./errors";
import { PaginatedResponse } from "./pagination";
import { Course, CourseOffering, Group, Schedule } from "#src/types";

export const academicApi = {
  courses: () => request<PaginatedResponse<Course>>(() => api.get("/courses/")),
  offerings: () =>
    request<PaginatedResponse<CourseOffering>>(() =>
      api.get("/courses/offerings/"),
    ),
  schedules: () =>
    request<PaginatedResponse<Schedule>>(() => api.get("/courses/schedules/")),
  groups: () => request<PaginatedResponse<Group>>(() => api.get("/groups/")),
};
