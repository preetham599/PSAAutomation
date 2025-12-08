require('dotenv').config();
import { setCommonPlugins } from "@codeceptjs/configure";

setCommonPlugins();

export const config: CodeceptJS.MainConfig = {
  tests: "./tests/api/*.ts",
  output: "./output",

  helpers: {
    REST: {
      timeout: 20000,
    }
  },

  include: {},

  plugins: {
    screenshotOnFail: { enabled: true },
    retryFailedStep: { enabled: true }
  },

  name: "SpendAnalyzer-API"
};
