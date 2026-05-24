import { defineConfig } from "@prisma/config";

export default defineConfig({
  seed: {
    run: "tsx prisma/seed.ts",
  },
});
