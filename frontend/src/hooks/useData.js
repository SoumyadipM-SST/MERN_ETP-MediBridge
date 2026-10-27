import { useQuery } from "@tanstack/react-query";

import { api } from "../services/api.js";

const useData = (key, path, options = {}) =>
  useQuery({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: ({ signal }) => api(path, { signal }),
    ...options,
  });
export { useData };
