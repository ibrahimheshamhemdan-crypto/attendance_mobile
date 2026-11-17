import { api } from "./client";
import { request } from "./errors";
import { PaginatedResponse } from "./pagination";
import { Device, DeviceRegistration } from "#src/types";

export const deviceApi = {
  listMine: () =>
    request<PaginatedResponse<Device>>(() => api.get("/devices/my/")),
  register: (payload: DeviceRegistration) =>
    request<Device>(() => api.post("/devices/register/", payload)),
};
